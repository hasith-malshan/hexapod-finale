import time
import serial
import threading
import logging
from .state import state

def log_event(message: str):
    logging.info(message)
    print(message)

# Global serial instance
esp32_serial = None

def connect_to_esp32():
    global esp32_serial
    print("\n🔌 Searching for ESP32 via USB...")
    for port in ("/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/serial0"):
        try:
            connection = serial.Serial(port, 115200, timeout=1)
            print(f"✅ Connected to ESP32 on {port}")
            log_event(f"--- SYSTEM BOOT: USB CONNECTED ON {port} ---")
            esp32_serial = connection
            return connection
        except Exception:
            continue
    print("❌ ESP32 not found. Commands will be simulated.")
    esp32_serial = None
    return None

def send_to_esp32(command: str):
    """Sends action command to ESP32 over USB Serial."""
    global esp32_serial
    with state.lock:
        state.current_move = command

    if not (esp32_serial and esp32_serial.is_open):
        if state.show_audio_logs:
            log_event(f"🤖 [SIMULATED] {command}")
        return

    try:
        esp32_serial.write((command + "\n").encode("utf-8"))
        esp32_serial.flush()
        log_event(f"📡 [PI SENT]: {command}")
    except Exception as exc:
        log_event(f"❌ Serial write error: {exc}")

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
    now = time.time()
    zone_f = evaluate_single_distance(d_front)
    zone_b = evaluate_single_distance(d_back)

    # Determine highest priority zone across front & back (ignoring <30cm excluded zone)
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

        if overall_zone == "DANGER":
            should_speak = (now - state.last_obstacle_voice_time > 4.5) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Warning! Critical obstacle ahead! Stopping!" if zone_f == "DANGER" else "Warning! Obstacle behind! Stopping!"
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)

        elif overall_zone == "WARNING":
            should_speak = (now - state.last_obstacle_voice_time > 6.0) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Obstacle detected ahead." if zone_f == "WARNING" else "Obstacle detected behind."
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)

def esp32_reader_thread():
    """Reads incoming USB serial data and triggers the READY handshake & telemetry."""
    global esp32_serial
    # Import locally to avoid circular dependency
    from .choreography import handle_robot_ready
    
    while True:
        if not (esp32_serial and esp32_serial.is_open):
            time.sleep(0.1)
            continue
        try:
            line = esp32_serial.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue

            # 1. The Handshake Magic: When ESP32 says READY, send the next command
            if line == "READY":
                handle_robot_ready()

            # 2. Tilt / IMU readings
            elif line.startswith("TILT:"):
                try:
                    roll = float(line.split(":", 1)[1])
                    import math
                    if math.isfinite(roll):
                        with state.lock:
                            state.body_roll = roll
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

            else:
                log_event(f"🤖 [ESP32 SAYS]: {line}")
        except (ValueError, OSError, serial.SerialException) as e:
            log_event(f"⚠️ Serial read error: {e}")
            time.sleep(0.1)
