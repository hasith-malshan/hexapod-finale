from fastapi import APIRouter, HTTPException
from hexabot import (
    state, set_mode, trigger_manual_command,
    set_led_pattern, reset_led_auto,
    set_emotion, reset_emotion_auto, run_emotion_test,
    set_audio_source, toggle_logging, get_mic_snapshot
)

router = APIRouter()

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
