import time
import serial
import threading
import logging
from .state import state

# Import log_event lazily or define forwarding wrapper
def emit_log(message: str, level: str = "info", source: str = "ESP32"):
    from .engine import log_event
    log_event(message, level=level, source=source)

# Global serial instance
esp32_serial = None
last_tilt_log_time = 0.0
last_dist_log_time = 0.0

def connect_to_esp32():
    global esp32_serial
    print("\n🔌 Searching for ESP32 via USB...")
    for port in ("/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/serial0"):
        try:
            connection = serial.Serial(port, 115200, timeout=1)
            print(f"✅ Connected to ESP32 on {port}")
            emit_log(f"--- SYSTEM BOOT: ESP32 Connected on {port} (115200 baud) ---", level="success", source="ESP32")
            esp32_serial = connection
            return connection
        except Exception:
            continue
    emit_log("⚠️ ESP32 not detected on hardware ports. Running in telemetry simulation mode.", level="warn", source="ESP32")
    esp32_serial = None
    return None

def send_to_esp32(command: str):
    """Sends action command to ESP32 over USB Serial."""
    global esp32_serial
    with state.lock:
        state.current_move = command

    if not (esp32_serial and esp32_serial.is_open):
        emit_log(f"🤖 [COMMAND DISPATCHED]: {command}", level="info", source="PI")
        return

    try:
        esp32_serial.write((command + "\n").encode("utf-8"))
        esp32_serial.flush()
        emit_log(f"📡 [PI SENT TO ESP32]: {command}", level="success", source="PI")
    except Exception as exc:
        emit_log(f"❌ Serial write error to ESP32: {exc}", level="error", source="ESP32")

def evaluate_single_distance(dist: float) -> str:
    """
    Evaluates distance based on requested zones:
    - 0 to 30 cm: EXCLUDED (Leg length reach zone / filtered)
    - 30 to 60 cm: DANGER (Critical proximity hazard)
    - 60 to 90 cm: WARNING (Obstacle caution)
    - > 90 cm: CLEAR (Safe trajectory)
    """
    if dist < 30.0:
        return "EXCLUDED"
    elif dist <= 60.0:
        return "DANGER"
    elif dist <= 90.0:
        return "WARNING"
    else:
        return "CLEAR"

def update_ultrasonic_zones(d_front: float, d_back: float):
    """
    Applies the clarified safe zones:
    - 0 - 30 cm: Excluded due to leg length reach
    - 30 - 60 cm: DANGER (ALL LEDs Red Strobe, Critical Voice Alert, Auto Halt)
    - 60 - 90 cm: OBSTACLE CAUTION (ALL LEDs Amber Glow, Caution Voice Alert)
    - > 90 cm: CLEAR TRAJECTORY (ALL LEDs Dynamic Music Beat Sync)
    """
    global last_dist_log_time
    now = time.time()
    zone_f = evaluate_single_distance(d_front)
    zone_b = evaluate_single_distance(d_back)

    # Determine highest priority zone across front & back
    if zone_f == "DANGER" or zone_b == "DANGER":
        overall_zone = "DANGER"
    elif zone_f == "WARNING" or zone_b == "WARNING":
        overall_zone = "WARNING"
    else:
        overall_zone = "CLEAR"

    with state.lock:
        state.ultrasonic_front = d_front
        state.ultrasonic_back = d_back
        state.obstacle_zone = overall_zone

        # Throttled distance telemetry log (~every 2.5s)
        if now - last_dist_log_time > 2.5:
            last_dist_log_time = now
            lvl = "error" if overall_zone == "DANGER" else "warn" if overall_zone == "WARNING" else "info"
            emit_log(f"📡 [ESP32 ULTRASONIC]: Front={d_front:.1f}cm ({zone_f}), Rear={d_back:.1f}cm ({zone_b}) | Status: {overall_zone}", level=lvl, source="ESP32")

        if overall_zone == "DANGER":
            should_speak = (now - state.last_obstacle_voice_time > 4.5) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Warning! Critical obstacle ahead! Stopping!" if zone_f == "DANGER" else "Warning! Obstacle behind! Stopping!"
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)
                emit_log(f"🛑 [EMERGENCY STOP]: Obstacle < 60cm detected! Spoke: '{phrase}'", level="error", source="PI")

        elif overall_zone == "WARNING":
            should_speak = (now - state.last_obstacle_voice_time > 6.0) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Obstacle detected ahead." if zone_f == "WARNING" else "Obstacle detected behind."
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)
                emit_log(f"🟠 [OBSTACLE CAUTION]: Distance {d_front:.1f}cm. Spoke: '{phrase}'", level="warn", source="PI")

def esp32_reader_thread():
    """Reads incoming USB serial data and streams readings to the log screen in real time."""
    global esp32_serial, last_tilt_log_time
    from .choreography import handle_robot_ready
    
    while True:
        if not (esp32_serial and esp32_serial.is_open):
            time.sleep(0.1)
            continue
        try:
            line = esp32_serial.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue

            # 1. The Handshake Magic: When ESP32 says READY
            if line == "READY":
                emit_log("🔌 [ESP32 HANDSHAKE]: Robot Ready for next move", level="success", source="ESP32")
                handle_robot_ready()
                try:
                    from .hanthane_player import hanthane_runner
                    hanthane_runner.handle_ready()
                except Exception:
                    pass

            # 2. Tilt / IMU readings
            elif line.startswith("TILT:"):
                try:
                    roll = float(line.split(":", 1)[1])
                    import math
                    if math.isfinite(roll):
                        with state.lock:
                            state.body_roll = roll
                        now = time.time()
                        if now - last_tilt_log_time > 3.0:
                            last_tilt_log_time = now
                            emit_log(f"⚖️ [ESP32 IMU]: Chassis Tilt Roll={roll:.1f}°", level="info", source="ESP32")
                except ValueError:
                    pass

            # 3. Dual Ultrasonic distance readings (e.g. DIST:45.0,95.0 or US:F:45,B:95)
            elif line.startswith("DIST:") or line.startswith("US:"):
                try:
                    parts = line.split(":", 1)[1].split(",")
                    d_front = float(parts[0].replace("F:", "").strip())
                    d_back = float(parts[1].replace("B:", "").strip()) if len(parts) > 1 else 100.0
                    update_ultrasonic_zones(d_front, d_back)
                except Exception:
                    pass

            # 4. Any other raw readings from ESP32 (voltage, servo angles, calibrations)
            else:
                emit_log(f"🔌 [ESP32]: {line}", level="info", source="ESP32")

        except (ValueError, OSError, serial.SerialException) as e:
            emit_log(f"⚠️ Serial read error: {e}", level="warn", source="ESP32")
            time.sleep(0.1)
