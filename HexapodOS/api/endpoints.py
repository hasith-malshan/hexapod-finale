from fastapi import APIRouter, HTTPException
from hexabot import state, set_mode, trigger_manual_command

router = APIRouter()

@router.get("/status")
def get_status():
    """Returns the current state of the Hexabot."""
    with state.lock:
        return {
            "mode": state.operating_mode,
            "mood": state.mood,
            "bpm": state.bpm,
            "energy": state.energy_level,
            "activity": state.activity_level,
            "genre": state.genre,
            "context": state.audio_context,
            "voice_active": state.voice_active,
            "current_move": state.current_move,
            "planned_move": state.planned_move
        }

@router.post("/mode")
def change_mode(mode: str):
    """Sets the mode to AUTO or MANUAL."""
    mode = mode.upper()
    if mode not in ["AUTO", "MANUAL"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be AUTO or MANUAL.")
    
    set_mode(mode)
    return {"status": "success", "mode": mode}

@router.post("/command")
def manual_command(cmd: str):
    """Triggers a command in MANUAL mode (God Mode)."""
    success = trigger_manual_command(cmd)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot send manual command unless in MANUAL mode.")
    return {"status": "success", "command": cmd}

@router.post("/led")
def set_led_pattern(pattern: str):
    """Sets a specific LED pattern manually."""
    with state.lock:
        state.manual_led_pattern = pattern
    return {"status": "success", "pattern": pattern}
