import random
import time
import logging
from .state import state
from .config import DANCE_POOLS, SAFE_DANCES, INITIAL_LISTEN_MOVE

def log_event(message: str):
    logging.info(message)
    print(message)

def choose_dance(rhythm: str, energy: str, activity: str) -> str:
    exact = DANCE_POOLS.get((rhythm, energy, activity))
    if exact: return random.choice(exact)
    if energy == "LOW": return random.choice(["DANCE_WAVE", "DANCE_BEG_WAVE", "DANCE_CHASSIS_BREATHE"])
    if activity == "BUSY": return random.choice(["DANCE_RIPPLE", "DANCE_HEADBANG", "DANCE_PULSE"])
    if rhythm == "FAST": return random.choice(["DANCE_SALSA", "DANCE_TWIST", "DANCE_CIRCLE"])
    return random.choice(SAFE_DANCES)

def update_dance_plan():
    """Keep one next movement ready while the current movement is running."""
    if state.operating_mode != "AUTO":
        return

    with state.lock:
        if state.voice_active or time.monotonic() < state.voice_override_until:
            return

        signature = (state.rhythm_speed, state.energy_level, state.activity_level)
        if state.planned_move is not None and signature == state.last_plan_signature:
            return

        planned = choose_dance(state.rhythm_speed, state.energy_level, state.activity_level)
        if planned == state.current_move:
            alternatives = [move for move in SAFE_DANCES if move != state.current_move]
            if alternatives: planned = random.choice(alternatives)

        state.planned_move = planned
        state.last_plan_signature = signature

    if state.show_audio_logs:
        log_event(f"🧠 [PLANNED] {planned} | {signature[0]}/{signature[1]}/{signature[2]}")

def handle_robot_ready():
    """Dispatch exactly one dance whenever the ESP32 reports completion."""
    from .serial_link import send_to_esp32
    
    if state.operating_mode != "AUTO":
        with state.lock:
            state.robot_ready = True
        return

    with state.lock:
        state.robot_ready = True

        if not state.initial_listen_sent:
            command = INITIAL_LISTEN_MOVE
            state.initial_listen_sent = True
        elif state.planned_move:
            command = state.planned_move
            state.planned_move = None
        else:
            command = choose_dance(state.rhythm_speed, state.energy_level, state.activity_level)

        state.robot_ready = False

    send_to_esp32(command)
    log_event(f"▶️ [READY→DANCE] Dispatched: {command}")
