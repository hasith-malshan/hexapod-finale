import threading
import logging

from .serial_link import esp32_reader_thread, connect_to_esp32
from .audio_dsp import audio_listener
from .voice_cmd import yamnet_context_thread
from .led_engine import led_thread
from .lcd_engine import display_loop
from .state import state

def log_event(message: str):
    logging.info(message)
    print(message)

def start_hexabot_os():
    """
    Initializes the Hexabot OS logic by connecting to the ESP32 and starting
    all background threads (audio DSP, AI, serial, LEDs, LCD).
    """
    log_event("\n" + "=" * 54)
    log_event("       🤖 CODEGENIX HEXABOT OS - UNIFIED 🤖")
    log_event("=" * 54)
    
    # Establish connection first
    connect_to_esp32()

    # Define all daemon threads
    threads = [
        threading.Thread(target=esp32_reader_thread, daemon=True, name="esp32_reader_thread"),
        threading.Thread(target=yamnet_context_thread, daemon=True, name="yamnet_context_thread"),
        threading.Thread(target=audio_listener, daemon=True, name="audio_listener"),
        threading.Thread(target=led_thread, daemon=True, name="led_thread"),
        threading.Thread(target=display_loop, daemon=True, name="display_loop"),
    ]

    log_event("🚀 Starting OS daemon threads...")
    for t in threads:
        t.start()
        
    log_event("✅ Hexabot OS is running in background.")
    
def set_mode(new_mode: str):
    """Sets the operating mode of the robot (AUTO or MANUAL)."""
    with state.lock:
        state.operating_mode = new_mode.upper()
        if state.operating_mode == "MANUAL":
            # If switching to manual, ensure we stop any active dance
            state.planned_move = None
            state.current_move = "STAND"
        log_event(f"⚙️ Operating Mode set to: {state.operating_mode}")

def trigger_manual_command(command: str):
    """Triggers a specific action. Requires MANUAL mode."""
    with state.lock:
        if state.operating_mode != "MANUAL":
            log_event(f"⚠️ Ignored command {command} because not in MANUAL mode.")
            return False
            
    from .serial_link import send_to_esp32
    send_to_esp32(command.upper())
    return True
