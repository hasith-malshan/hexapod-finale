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
    4. Falls back to pico2wave
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

        log_event(f"🔊 [AUDIO OUTPUT]: '{text}' (Success: {played})")

    threading.Thread(target=speak, daemon=True).start()

def trigger_voice_action(action: str):
    """
    Triggers specific requested voice output presets + corresponding robot response:
    - lets_dance: Speaks 'Let's Dance!', dispatches dynamic dance, sets hype mood
    - voice_detected: Speaks 'Voice Detected!', activates green eye mode
    - activating_command: Speaks 'Activating command!', confirms action
    - stopping: Speaks 'Stopping', sets Stand pose
    - party_mode: Speaks 'Party mode engaged!', dispatches fast roll dance
    - walking_forward: Speaks 'Walking forward', executes forward walk
    - walking_backward: Speaks 'Walking backward', executes backward walk
    """
    action_key = action.lower().strip()
    
    if action_key in ("lets_dance", "dance", "lets dance"):
        phrase = "Let's Dance!"
        say_phrase_offline(phrase)
        with state.lock:
            state.mood = "ENERGY"
        send_to_esp32("DANCE_CIRCLE")
        return {"status": "success", "phrase": phrase, "action": "DANCE_CIRCLE"}

    elif action_key in ("voice_detected", "voice detected", "listen"):
        phrase = "Voice Detected!"
        say_phrase_offline(phrase)
        with state.lock:
            state.manual_mood = "VOICE_ACTIVE"
            state.voice_active = True
        return {"status": "success", "phrase": phrase, "action": "VOICE_ACTIVE"}

    elif action_key in ("activating_command", "activating command", "command"):
        phrase = "Activating command!"
        say_phrase_offline(phrase)
        return {"status": "success", "phrase": phrase, "action": "COMMAND_CONFIRM"}

    elif action_key in ("stopping", "stop", "stand"):
        phrase = "Stopping!"
        say_phrase_offline(phrase)
        send_to_esp32("STAND")
        return {"status": "success", "phrase": phrase, "action": "STAND"}

    elif action_key in ("party_mode", "party", "party mode"):
        phrase = "Party mode engaged!"
        say_phrase_offline(phrase)
        send_to_esp32("DANCE_ROLL_FAST")
        return {"status": "success", "phrase": phrase, "action": "DANCE_ROLL_FAST"}

    elif action_key in ("walking_forward", "forward"):
        phrase = "Walking forward!"
        say_phrase_offline(phrase)
        send_to_esp32("WALK_FORWARD")
        return {"status": "success", "phrase": phrase, "action": "WALK_FORWARD"}

    elif action_key in ("walking_backward", "backward", "back"):
        phrase = "Walking backward!"
        say_phrase_offline(phrase)
        send_to_esp32("WALK_BACKWARD")
        return {"status": "success", "phrase": phrase, "action": "WALK_BACKWARD"}

    else:
        # Generic speak
        say_phrase_offline(action)
        return {"status": "success", "phrase": action, "action": "CUSTOM_TTS"}

def process_voice_command(audio_bytes: bytes):
    if recognizer is None:
        with state.lock: state.voice_active = False
        return
    try:
        text = recognizer.recognize_google(sr.AudioData(audio_bytes, RATE, 2), language="en-US").lower()
        log_event(f"🎤 [VOICE RECOGNIZED]: '{text}'")
        command, phrase = None, None

        if "stop" in text or "stand" in text:
            command, phrase = "STAND", "stopping"
        elif "forward" in text:
            command, phrase = "WALK_FORWARD", "walking forward"
        elif "back" in text:
            command, phrase = "WALK_BACKWARD", "walking backward"
        elif "dance" in text or "party" in text:
            command, phrase = "DANCE_CIRCLE", "let's dance"
        elif "slow" in text or "relax" in text:
            command, phrase = "DANCE_CHASSIS_BREATHE", "slow mode"
        elif "fast" in text or "speed" in text:
            command, phrase = "DANCE_ROLL_FAST", "high speed"

        if command:
            send_to_esp32(command)
            say_phrase_offline(phrase)
            with state.lock:
                state.command_detected_time = time.time()
                state.voice_override_until = time.monotonic() + 15.0
    except Exception:
        pass
    finally:
        with state.lock:
            state.voice_active = False
