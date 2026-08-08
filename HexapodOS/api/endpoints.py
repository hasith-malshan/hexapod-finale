from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from hexabot import (
    state, set_mode, trigger_manual_command,
    set_led_pattern, reset_led_auto,
    set_emotion, reset_emotion_auto, run_emotion_test,
    set_audio_source, toggle_logging, get_mic_snapshot,
    set_system_volume, say_phrase_offline, trigger_voice_action
)

router = APIRouter()

class SpeakRequest(BaseModel):
    phrase: str

class VoiceTriggerRequest(BaseModel):
    action: str

@router.get("/status")
def get_status():
    with state.lock:
        return {
            "mode": getattr(state, "operating_mode", "AUTO"),
            "mood": getattr(state, "mood", "IDLE"),
            "bpm": getattr(state, "bpm", 0),
            "energy": getattr(state, "energy_level", "LOW"),
            "activity": getattr(state, "activity_level", "LOW"),
            "rhythm_speed": getattr(state, "rhythm_speed", "SLOW"),
            "genre": getattr(state, "genre", "UNKNOWN"),
            "context": getattr(state, "audio_context", "UNKNOWN"),
            "voice_active": getattr(state, "voice_active", False),
            "current_move": getattr(state, "current_move", "STAND"),
            "planned_move": getattr(state, "planned_move", None),
            "rms_db": getattr(state, "rms_db", 0.0),
            "peak_amplitude": getattr(state, "peak_amplitude", 0.0),
            "syllable_count": getattr(state, "syllable_count", 0),
            "body_roll": getattr(state, "body_roll", 0.0),
            "manual_led_pattern": getattr(state, "manual_led_pattern", None),
            "manual_mood": getattr(state, "manual_mood", None),
            "show_audio_logs": getattr(state, "show_audio_logs", False),
            "audio_source": getattr(state, "audio_source", "MIC"),
            "robot_ready": getattr(state, "robot_ready", False),
        }

@router.post("/mode")
def change_mode(mode: str):
    mode = mode.upper()
    if mode not in ["AUTO", "MANUAL"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be AUTO or MANUAL.")
    set_mode(mode)
    return {"status": "success", "mode": mode}

@router.post("/command")
def manual_command(cmd: str):
    success = trigger_manual_command(cmd)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot send manual command unless in MANUAL mode.")
    return {"status": "success", "command": cmd}

@router.post("/led")
def set_led(pattern: str):
    set_led_pattern(pattern)
    return {"status": "success", "pattern": pattern}

@router.post("/led/auto")
def led_auto():
    reset_led_auto()
    return {"status": "success", "message": "LEDs returned to AUTO mood sync"}

@router.post("/emotion")
def set_emotion_endpoint(mood: str):
    valid = ["IDLE", "AGGRESSIVE", "ENERGY", "CHILL", "VOICE_ACTIVE", "HAPPY", "CONFUSED"]
    mood = mood.upper()
    if mood not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid emotion. Must be one of: {valid}")
    set_emotion(mood)
    return {"status": "success", "emotion": mood}

@router.post("/emotion/auto")
def emotion_auto():
    reset_emotion_auto()
    return {"status": "success", "message": "LCD returned to AUTO mood sync"}

@router.post("/emotion/test")
def emotion_test():
    run_emotion_test()
    return {"status": "success", "message": "Emotion test cycle started"}

@router.post("/audio/source")
def audio_source(source: str):
    source = source.upper()
    if source not in ["MIC", "BT"]:
        raise HTTPException(status_code=400, detail="Invalid source. Must be MIC or BT.")
    set_audio_source(source)
    return {"status": "success", "source": source}

@router.post("/logging/toggle")
def logging_toggle():
    enabled = toggle_logging()
    return {"status": "success", "logging_enabled": enabled}

@router.get("/mic")
def mic_snapshot():
    return get_mic_snapshot()

@router.get("/audio/mic-verify")
def mic_verify():
    """Diagnostic check for microphone input stream & telemetry."""
    snap = get_mic_snapshot()
    rms = snap.get("rms_db", -60.0)
    peak = snap.get("peak_amplitude", 0.0)
    is_live = bool(rms > -58.0 or peak > 0.01)
    
    return {
        "status": "online" if is_live else "listening_idle",
        "mic_connected": True,
        "rms_db": rms,
        "peak_amplitude": peak,
        "syllable_count": snap.get("syllable_count", 0),
        "bpm": snap.get("bpm", 0),
        "audio_context": snap.get("audio_context", "Unknown"),
        "audio_source": snap.get("audio_source", "MIC"),
        "healthy": is_live or rms > -65.0,
        "message": "Microphone active & capturing stream" if is_live else "Microphone ready (room quiet)",
    }

@router.post("/audio/volume")
def set_volume(percent: int = Query(100, ge=0, le=100)):
    """Sets system speaker volume to percent (0-100%)."""
    val = set_system_volume(percent)
    return {"status": "success", "volume_percent": val}

@router.post("/audio/volume/max")
def max_volume():
    """Sets system speaker volume to 100% MAX."""
    val = set_system_volume(100)
    return {"status": "success", "volume_percent": val, "message": "Speaker volume boosted to 100% MAX"}

@router.post("/audio/speak")
def speak_phrase(phrase: Optional[str] = Query(None), req: Optional[SpeakRequest] = None):
    """Speaks custom text on the Raspberry Pi speaker/TTS."""
    text_to_speak = (req.phrase if req and req.phrase else phrase)
    if not text_to_speak:
        raise HTTPException(status_code=400, detail="Phrase required.")
    
    say_phrase_offline(text_to_speak)
    return {"status": "success", "phrase": text_to_speak}

@router.post("/audio/trigger")
def voice_trigger(action: Optional[str] = Query(None), req: Optional[VoiceTriggerRequest] = None):
    """
    Triggers one of the requested voice lines:
    - 'lets_dance' -> Speaks 'Let's Dance!' and dispatches dance
    - 'voice_detected' -> Speaks 'Voice Detected!' and activates listening eyes
    - 'activating_command' -> Speaks 'Activating command!'
    - 'stopping', 'party_mode', 'walking_forward', 'walking_backward'
    """
    action_key = (req.action if req and req.action else action)
    if not action_key:
        raise HTTPException(status_code=400, detail="Action required.")
        
    result = trigger_voice_action(action_key)
    return result
