import time
import os
import threading
import logging
import csv
import subprocess
import numpy as np

try:
    import tensorflow as tf
    import tensorflow_hub as hub
except ImportError:
    tf = None
    hub = None

try:
    import speech_recognition as sr
    import pyttsx3
except ImportError:
    sr = None
    pyttsx3 = None

from .state import state
from .config import ENABLE_YAMNET, RATE
from .serial_link import send_to_esp32
from .audio_dsp import audio_ring

def log_event(message: str):
    logging.info(message)
    print(message)

yamnet_model = None
yamnet_classes = []

def yamnet_context_thread():
    global yamnet_model, yamnet_classes
    if not ENABLE_YAMNET or tf is None or hub is None:
        log_event("ℹ️ YAMNet disabled or unavailable; DSP dancing remains active.")
        return
    log_event("⏳ [AI] Loading optional YAMNet context model...")
    try:
        yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")
        class_path = yamnet_model.class_map_path().numpy().decode("utf-8")
        with tf.io.gfile.GFile(class_path) as file:
            yamnet_classes = [row["display_name"] for row in csv.DictReader(file)]
        log_event("✅ [AI] YAMNet loaded.")
    except Exception as exc:
        log_event(f"❌ [AI] YAMNet unavailable: {exc}")
        return

    while True:
        time.sleep(5)
        try:
            waveform = audio_ring.snapshot(RATE * 3)
            if len(waveform) < RATE: continue
            scores, _, _ = yamnet_model(waveform)
            means = np.mean(scores.numpy(), axis=0)

            with state.lock:
                if "CMD" not in state.genre:
                    state.audio_context = yamnet_classes[int(np.argmax(means))]
        except Exception:
            time.sleep(1)

recognizer = sr.Recognizer() if sr else None

def say_phrase_offline(text: str):
    """
    Robust multi-engine offline TTS:
    1. Tries pyttsx3
    2. Falls back to spd-say
    3. Falls back to espeak / espeak-ng
    """
    def speak():
        played = False

        # Attempt 1: pyttsx3
        if pyttsx3 is not None:
            try:
                engine = pyttsx3.init()
                engine.setProperty("rate", 145)
                engine.say(text)
                engine.runAndWait()
                played = True
            except Exception as e:
                log_event(f"ℹ️ pyttsx3 note: {e}")

        # Attempt 2: spd-say (standard Debian/Raspberry Pi tool)
        if not played:
            try:
                res = subprocess.run(["spd-say", "-r", "-10", text], capture_output=True, timeout=5)
                if res.returncode == 0:
                    played = True
            except Exception:
                pass

        # Attempt 3: espeak-ng / espeak
        if not played:
            for bin_name in ("espeak-ng", "espeak"):
                try:
                    res = subprocess.run([bin_name, "-v", "en-us", "-s", "140", text], capture_output=True, timeout=5)
                    if res.returncode == 0:
                        played = True
                        break
                except Exception:
                    pass

        log_event(f"🔊 [AUDIO SPEAKER]: '{text}' (Played: {played})")

    threading.Thread(target=speak, daemon=True).start()

def match_and_execute_voice_command(raw_text: str):
    """
    Core speech-to-action parser for the predefined commands:
    1. lets dance     -> Speaks 'Let's Dance!' -> DANCE_CIRCLE
    2. walk forward   -> Speaks 'Walking forward' -> WALK_FORWARD
    3. walk backward  -> Speaks 'Walking backward' -> WALK_BACKWARD
    4. turn left      -> Speaks 'Turning left' -> TURN_LEFT
    5. turn right     -> Speaks 'Turning right' -> TURN_RIGHT
    6. stop           -> Speaks 'Stopping' -> STAND
    
    Respects state.voice_action_mode:
    - 'SPEAK_AND_ACT': Speaks phrase AND sends move to ESP32
    - 'SPEAK_ONLY': Speaks phrase only (zero servo movement, safe test mode)
    """
    text = raw_text.lower().strip()
    command = None
    spoken_phrase = None
    
    # 1. Let's Dance
    if any(k in text for k in ("lets dance", "let's dance", "dance", "party")):
        command = "DANCE_CIRCLE"
        spoken_phrase = "Let's Dance!"

    # 2. Walk Forward
    elif any(k in text for k in ("walk forward", "walk fowrd", "walk fwd", "forward", "front", "fwd", "ahead")):
        command = "WALK_FORWARD"
        spoken_phrase = "Walking forward"

    # 3. Walk Backward
    elif any(k in text for k in ("walk backward", "walk back", "backward", "back", "reverse")):
        command = "WALK_BACKWARD"
        spoken_phrase = "Walking backward"

    # 4. Turn Left
    elif any(k in text for k in ("turn left", "rotate left", "left")):
        command = "TURN_LEFT"
        spoken_phrase = "Turning left"

    # 5. Turn Right
    elif any(k in text for k in ("turn right", "rotate right", "right")):
        command = "TURN_RIGHT"
        spoken_phrase = "Turning right"

    # 6. Stop
    elif any(k in text for k in ("stop", "stand", "halt", "freeze", "relax")):
        command = "STAND"
        spoken_phrase = "Stopping"

    # Fallback / General unrecognized voice
    else:
        spoken_phrase = f"Recognized: {raw_text}"
        command = None

    with state.lock:
        action_mode = state.voice_action_mode  # "SPEAK_AND_ACT" or "SPEAK_ONLY"
        should_act = (action_mode == "SPEAK_AND_ACT") and (command is not None)
        
        state.last_voice_command = {
            "phrase": raw_text,
            "recognized_command": command or "NONE",
            "spoken_response": spoken_phrase,
            "timestamp": time.time(),
            "action_executed": should_act,
            "action_mode": action_mode
        }
        state.command_detected_time = time.time()
        state.voice_override_until = time.monotonic() + 15.0

    # Output 1: Always speak the detected voice confirmation over the speaker
    say_phrase_offline(spoken_phrase)

    # Output 2: Conditionally dispatch the physical robot action based on selected mode
    if should_act and command:
        send_to_esp32(command)
        log_event(f"🦾 [VOICE ACTION]: Executed '{command}' | Spoken: '{spoken_phrase}' (Mode: {action_mode})")
    else:
        log_event(f"🔊 [VOICE VERIFICATION]: Spoke '{spoken_phrase}' | Action suppressed (Mode: {action_mode})")

    return {
        "status": "success",
        "input_phrase": raw_text,
        "spoken_response": spoken_phrase,
        "command": command,
        "action_executed": should_act,
        "mode": action_mode
    }

def process_voice_command(audio_bytes: bytes):
    if recognizer is None:
        with state.lock: state.voice_active = False
        return
    try:
        text = recognizer.recognize_google(sr.AudioData(audio_bytes, RATE, 2), language="en-US").lower()
        log_event(f"🎤 [VOICE RECOGNIZED FROM MIC]: '{text}'")
        match_and_execute_voice_command(text)
    except Exception as e:
        log_event(f"ℹ️ Speech recognition note: {e}")
    finally:
        with state.lock:
            state.voice_active = False

def trigger_voice_action(action: str):
    """Triggers voice actions from API or UI."""
    return match_and_execute_voice_command(action)
