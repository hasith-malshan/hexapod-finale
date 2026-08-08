import collections
import threading
from typing import Deque

class RobotState:
    def __init__(self):
        # Mode & Config
        self.operating_mode = "AUTO"  # "AUTO" or "MANUAL"
        self.audio_source = "MIC"     # "MIC" or "BT"
        self.show_audio_logs = False

        # Ultrasonic Ranging & Safety Zones (0-30 DANGER, 30-80 WARNING, >80 CLEAR)
        self.ultrasonic_front = 100.0
        self.ultrasonic_back = 100.0
        self.obstacle_zone = "CLEAR"  # "CLEAR", "WARNING", "DANGER"
        self.last_obstacle_voice_time = 0.0
        self.voice_obstacle_alert_enabled = True

        # Voice Recognition & Action Config
        self.voice_action_mode = "SPEAK_AND_ACT"  # "SPEAK_AND_ACT" or "SPEAK_ONLY"
        self.last_voice_command = {
            "phrase": "None yet",
            "recognized_command": "STAND",
            "spoken_response": "Ready",
            "timestamp": 0.0,
            "action_executed": False
        }

        # Audio DSP State
        self.bpm = 0.0
        self.raw_bpm = 0.0
        self.beat_confidence = 0.0
        self.last_beat_time = 0.0
        self.syllable_count = 0

        # Music Classification State
        self.energy_score = 0.0
        self.activity_score = 0.0
        self.rhythm_speed = "UNKNOWN"
        self.energy_level = "LOW"
        self.activity_level = "SMOOTH"
        self.mood = "IDLE"
        self.genre = "Listening..."
        self.audio_context = "Listening..."
        self.rms_db = -60.0
        self.peak_amplitude = 0.0

        # Voice Trigger State
        self.voice_active = False
        self.command_detected_time = 0.0
        self.voice_override_until = 0.0

        # Physical State (from ESP32)
        self.body_roll = 0.0

        # LED State
        self.manual_led_pattern = None
        self.manual_mood = None

        # Choreography State
        self.robot_ready = False
        self.initial_listen_sent = False
        self.current_move = None
        self.planned_move = None
        self.last_plan_signature = None

        self.bpm_history: Deque[float] = collections.deque(maxlen=32)
        self.lock = threading.RLock()


# Global Singleton Instance
state = RobotState()
