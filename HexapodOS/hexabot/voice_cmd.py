import time
import threading
import logging
import csv
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
    if pyttsx3 is None: return

    def speak():
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", 145)
            engine.say(text)
            engine.runAndWait()
        except Exception:
            pass

    threading.Thread(target=speak, daemon=True).start()

def process_voice_command(audio_bytes: bytes):
    if recognizer is None:
        with state.lock: state.voice_active = False
        return
    try:
        text = recognizer.recognize_google(sr.AudioData(audio_bytes, RATE, 2), language="en-US").lower()
        log_event(f"🎤 [VOICE] Recognized: '{text}'")
        command, phrase = None, None

        if "stop" in text or "stand" in text:
            command, phrase = "STAND", "stopping"
        elif "forward" in text:
            command, phrase = "WALK_FORWARD", "walking forward"
        elif "back" in text:
            command, phrase = "WALK_BACKWARD", "walking backward"
        elif "dance" in text or "party" in text:
            command, phrase = "DANCE_CIRCLE", "party mode"
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
