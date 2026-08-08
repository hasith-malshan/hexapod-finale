import os
import threading
import logging
import time

from .serial_link import esp32_reader_thread, connect_to_esp32
from .audio_dsp import audio_listener
from .voice_cmd import yamnet_context_thread, say_phrase_offline, trigger_voice_action
from .led_engine import led_thread
from .lcd_engine import display_loop
from .state import state

def log_event(message: str, level: str = "info", source: str = "PI"):
    logging.info(message)
    print(message)
    
    # Infer level and source if not explicitly provided
    lvl = level
    src = source
    if "error" in message.lower() or "fault" in message.lower() or "❌" in message or "danger" in message.lower():
        lvl = "error"
    elif "warning" in message.lower() or "⚠️" in message or "obstacle" in message.lower() or "caution" in message.lower():
        lvl = "warn"
    elif "success" in message.lower() or "✅" in message or "live" in message.lower() or "connected" in message.lower() or "executed" in message.lower():
        lvl = "success"

    if "esp32" in message.lower() or "serial" in message.lower() or "tilt" in message.lower():
        src = "ESP32"
    elif "dashboard" in message.lower() or "ws" in message.lower():
        src = "DASHBOARD"

    entry = {
        "id": f"log_{int(time.time() * 1000)}_{len(state.log_history)}",
        "timestamp": time.strftime("%H:%M:%S"),
        "level": lvl,
        "message": message,
        "source": src
    }
    with state.lock:
        state.log_history.append(entry)

def set_system_volume(percent: int = 100):
    """Sets system ALSA and PulseAudio speaker volume to maximum level (or specified %)."""
    pct = max(0, min(100, percent))
    commands = [
        f"amixer set Master {pct}% > /dev/null 2>&1",
        f"amixer set PCM {pct}% > /dev/null 2>&1",
        f"amixer set Speaker {pct}% > /dev/null 2>&1",
        f"amixer set Headphone {pct}% > /dev/null 2>&1",
        f"amixer set Digital {pct}% > /dev/null 2>&1",
        f"pactl set-sink-volume @DEFAULT_SINK@ {pct}% > /dev/null 2>&1",
    ]
    for cmd in commands:
        try:
            os.system(cmd)
        except Exception:
            pass
    log_event(f"🔊 Speaker volume maximized to: {pct}%", level="success")
    return pct

def set_voice_action_mode(mode: str):
    """Sets voice action mode: 'SPEAK_AND_ACT' or 'SPEAK_ONLY'."""
    val = "SPEAK_AND_ACT" if "ACT" in mode.upper() else "SPEAK_ONLY"
    with state.lock:
        state.voice_action_mode = val
    log_event(f"🎙️ Voice Execution Mode set to: {val}", level="info")
    return val

def get_last_voice_command() -> dict:
    """Returns the last recognized voice command and execution record."""
    with state.lock:
        return {
            "mode": getattr(state, "voice_action_mode", "SPEAK_AND_ACT"),
            "last_command": getattr(state, "last_voice_command", {}),
        }

def start_hexabot_os():
    """
    Initializes the Hexabot OS logic by connecting to the ESP32 and starting
    all background threads (audio DSP, AI, serial, LEDs, LCD).
    """
    log_event("       🤖 CODEGENIX HEXABOT OS - UNIFIED 🤖", level="success")
    
    # Maximize speaker volume to 100% on startup
    set_system_volume(100)

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
        log_event("⚠️ MANUAL mode selected. Audio DSP & listener active for telemetry.", level="warn")
        threads.append(threading.Thread(target=audio_listener, daemon=True, name="audio_listener"))

    log_event("🚀 Starting OS daemon threads...", level="info")
    for t in threads:
        t.start()
        
    log_event("✅ Hexabot OS is running in background.", level="success")
    
def set_mode(new_mode: str):
    """Sets the operating mode of the robot (AUTO or MANUAL)."""
    with state.lock:
        state.operating_mode = new_mode.upper()
        if state.operating_mode == "MANUAL":
            # If switching to manual, ensure we stop any active dance
            state.planned_move = None
            state.current_move = "STAND"
        log_event(f"⚙️ Operating Mode set to: {state.operating_mode}", level="info")

def trigger_manual_command(command: str):
    """Triggers a specific action. Requires MANUAL mode."""
    with state.lock:
        if state.operating_mode != "MANUAL":
            log_event(f"⚠️ Ignored command {command} because not in MANUAL mode.", level="warn")
            return False
            
    from .serial_link import send_to_esp32
    send_to_esp32(command.upper())
    return True

def set_led_pattern(pattern: str):
    """Override LED pattern manually."""
    with state.lock:
        state.manual_led_pattern = pattern
    log_event(f"✨ LED Pattern set to: {pattern}", level="success")

def reset_led_auto():
    """Return LEDs to auto mood sync."""
    with state.lock:
        state.manual_led_pattern = None
    log_event("🎵 LEDs returned to AUTO MOOD SYNC", level="info")

def set_emotion(mood: str):
    """Override LCD eye emotion."""
    with state.lock:
        state.manual_mood = mood
    log_event(f"📺 Emotion set to: {mood}", level="info")

def reset_emotion_auto():
    """Return LCD to auto mood sync."""
    with state.lock:
        state.manual_mood = None
    log_event("📺 LCD returned to AUTO MOOD SYNC", level="info")

def run_emotion_test():
    """Run automated emotion test cycle in background thread."""
    import time as _time
    EMOTIONS = ["IDLE", "AGGRESSIVE", "ENERGY", "CHILL", "VOICE_ACTIVE", "HAPPY", "CONFUSED"]
    def _cycle():
        for mood in EMOTIONS:
            with state.lock:
                state.manual_mood = mood
            log_event(f"📺 Testing: {mood}", level="info")
            _time.sleep(2.5)
        with state.lock:
            state.manual_mood = None
        log_event("📺 Emotion test complete", level="success")
    threading.Thread(target=_cycle, daemon=True).start()

def set_audio_source(source: str):
    """Set audio source: MIC or BT."""
    with state.lock:
        state.audio_source = source.upper()
    log_event(f"🎧 Audio source set to: {source.upper()}", level="info")

def toggle_logging():
    """Toggle background telemetry logging."""
    with state.lock:
        state.show_audio_logs = not state.show_audio_logs
        enabled = state.show_audio_logs
    log_event(f"📁 Telemetry Logging: {'ON' if enabled else 'OFF'}", level="info")
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
            "audio_source": getattr(state, "audio_source", "MIC"),
            "voice_action_mode": getattr(state, "voice_action_mode", "SPEAK_AND_ACT"),
            "last_voice_command": getattr(state, "last_voice_command", {}),
            "healthy": bool(getattr(state, "rms_db", -60.0) > -65.0 or getattr(state, "bpm", 0) > 0),
        }
