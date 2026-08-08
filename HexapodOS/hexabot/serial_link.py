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

def esp32_reader_thread():
    """Reads incoming USB serial data and triggers the READY handshake."""
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

            # The Handshake Magic: When ESP32 says READY, send the next command
            if line == "READY":
                handle_robot_ready()
            elif line.startswith("TILT:"):
                try:
                    roll = float(line.split(":", 1)[1])
                    import math
                    if math.isfinite(roll):
                        with state.lock:
                            state.body_roll = roll
                except ValueError:
                    pass
            else:
                log_event(f"🤖 [ESP32 SAYS]: {line}")
        except (ValueError, OSError, serial.SerialException) as e:
            log_event(f"⚠️ Serial read error: {e}")
            time.sleep(0.1)
