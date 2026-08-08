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

def update_ultrasonic_zones(d_front: float, d_back: float):
    """
    Applies the custom safe zones:
    - 0 to 30 cm: DANGER (Critical proximity hazard -> ALL LEDs Red, voice alert, auto halt)
    - 30 to 80 cm: WARNING (Obstacle zone -> ALL LEDs Amber/Orange, caution voice alert)
    - > 80 cm: CLEAR (Safe trajectory -> ALL LEDs return to music mood sync)
    """
    now = time.time()
    with state.lock:
        state.ultrasonic_front = d_front
        state.ultrasonic_back = d_back

        min_dist = min(d_front, d_back)

        if min_dist < 30.0:
            state.obstacle_zone = "DANGER"
            should_speak = (now - state.last_obstacle_voice_time > 4.5) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Warning! Critical obstacle ahead!" if d_front < 30.0 else "Warning! Obstacle behind!"
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)

        elif min_dist <= 80.0:
            state.obstacle_zone = "WARNING"
            should_speak = (now - state.last_obstacle_voice_time > 6.0) and getattr(state, "voice_obstacle_alert_enabled", True)
            if should_speak:
                state.last_obstacle_voice_time = now
                phrase = "Obstacle detected ahead." if d_front <= 80.0 else "Obstacle detected behind."
                from .voice_cmd import say_phrase_offline
                say_phrase_offline(phrase)

        else:
            state.obstacle_zone = "CLEAR"

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

            # 3. Dual Ultrasonic distance readings (e.g. DIST:25.4,92.0 or US:F:25,B:90)
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
