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
        threading.Thread(target=led_thread, daemon=True, name="led_thread"),
        threading.Thread(target=display_loop, daemon=True, name="display_loop"),
    ]

    if state.operating_mode == "AUTO":
        threads.extend([
            threading.Thread(target=yamnet_context_thread, daemon=True, name="yamnet_context_thread"),
            threading.Thread(target=audio_listener, daemon=True, name="audio_listener"),
        ])
    else:
        log_event("⚠️ MANUAL mode selected. AI and Audio threads will not be started.")

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

def set_led_pattern(pattern: str):
    """Override LED pattern manually."""
    with state.lock:
        state.manual_led_pattern = pattern
    log_event(f"✨ LED Pattern set to: {pattern}")

def reset_led_auto():
    """Return LEDs to auto mood sync."""
    with state.lock:
        state.manual_led_pattern = None
    log_event("🎵 LEDs returned to AUTO MOOD SYNC")

def set_emotion(mood: str):
    """Override LCD eye emotion."""
    with state.lock:
        state.manual_mood = mood
    log_event(f"📺 Emotion set to: {mood}")

def reset_emotion_auto():
    """Return LCD to auto mood sync."""
    with state.lock:
        state.manual_mood = None
    log_event("📺 LCD returned to AUTO MOOD SYNC")

def run_emotion_test():
    """Run automated emotion test cycle in background thread."""
    import time as _time
    EMOTIONS = ["IDLE", "AGGRESSIVE", "ENERGY", "CHILL", "VOICE_ACTIVE", "HAPPY", "CONFUSED"]
    def _cycle():
        for mood in EMOTIONS:
            with state.lock:
                state.manual_mood = mood
            log_event(f"📺 Testing: {mood}")
            _time.sleep(2.5)
        with state.lock:
            state.manual_mood = None
        log_event("📺 Emotion test complete")
    threading.Thread(target=_cycle, daemon=True).start()

def set_audio_source(source: str):
    """Set audio source: MIC or BT."""
    with state.lock:
        state.audio_source = source.upper()
    log_event(f"🎧 Audio source set to: {source.upper()}")

def toggle_logging():
    """Toggle background telemetry logging."""
    with state.lock:
        state.show_audio_logs = not state.show_audio_logs
        enabled = state.show_audio_logs
    log_event(f"📁 Telemetry Logging: {'ON' if enabled else 'OFF'}")
    return enabled

def get_mic_snapshot() -> dict:
    """Get a snapshot of live microphone readings."""
    with state.lock:
        return {
            "rms_db": getattr(state, "rms_db", 0.0),
            "peak_amplitude": getattr(state, "peak_amplitude", 0.0),
            "bpm": getattr(state, "bpm", 0),
            "syllable_count": getattr(state, "syllable_count", 0),
            "mood": getattr(state, "mood", "IDLE"),
            "energy_level": getattr(state, "energy_level", "LOW"),
            "activity_level": getattr(state, "activity_level", "LOW"),
            "rhythm_speed": getattr(state, "rhythm_speed", "SLOW"),
            "audio_context": getattr(state, "audio_context", "UNKNOWN"),
        }
