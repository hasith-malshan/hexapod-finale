"""
=======================================================================
  HEXABOT CHOREOGRAPHY PLAYER — හන්තානට පායන සඳ (Hanthanata Payana Sanda)
  Artist  : Amarasiri Peiris
  BPM     : 152  |  Key : C Major  |  Beat interval : ~0.395 s
=======================================================================
"""

import time
import threading
import logging
from typing import Optional, List, Tuple
from .state import state

# Choreography timeline: (song_time_seconds, dance_command, section_label, note)
CHOREOGRAPHY: List[Tuple[float, str, str, str]] = [
    # ── INTRO (0:00 – 0:20) ─────────────────────────────────────────────
    (0.0,   "DANCE_CHASSIS_BREATHE",  "Intro",     "Wake up — gentle sway on C"),
    (6.5,   "DANCE_WAVE",             "Intro",     "Gentle ripple on F"),
    (6.8,   "DANCE_CHASSIS_BREATHE",  "Intro",     "Rest, breathe on G"),
    (14.5,  "DANCE_PEACOCK",          "Intro",     "Proud slow display on Am→G"),

    # ── CHORUS 1 (0:20 – 0:52) ──────────────────────────────────────────
    (21.5,  "DANCE_ROLL_SLOW",        "Chorus 1",  "Moonlight ripple — C"),
    (28.5,  "DANCE_CHASSIS_BREATHE",  "Chorus 1",  "Gentle roll on G"),
    (36.0,  "DANCE_PEACOCK",          "Chorus 1",  "Full display — G"),
    (43.0,  "DANCE_ROLL_SLOW",        "Chorus 1",  "Ripple through — G7"),
    (45.5,  "DANCE_CHASSIS_BREATHE",  "Chorus 1",  "Breathe out — C resolve"),
    (49.5,  "DANCE_PITCH_PIVOT",      "Chorus 1",  "Lean and return — G7"),
    (51.0,  "DANCE_ROLL_SLOW",        "Chorus 1",  "Moonlight ripple — C"),

    # ── VERSE 1 (0:52 – 1:30) ───────────────────────────────────────────
    (53.0,  "DANCE_TWIST",            "Verse 1",   "Anduru lala — C, light twist"),
    (61.0,  "DANCE_PITCH_PIVOT",      "Verse 1",   "Sarasawi bima — Am, ripple 2"),
    (67.0,  "DANCE_ROLL_SLOW",        "Verse 1",   "Themenna — F→C, gentle wave"),
    (74.0,  "DANCE_TWIST",            "Verse 1",   "Repeat — C"),
    (82.0,  "DANCE_ROLL_SLOW",        "Verse 1",   "Em again — light spin"),

    # ── INTER / BRIDGE (1:30 – 1:50) ────────────────────────────────────
    (89.0,  "DANCE_CHASSIS_BREATHE",  "Bridge",    "Wake up — gentle sway on C"),
    (95.5,  "DANCE_WAVE",             "Bridge",    "Gentle ripple on F"),
    (95.8,  "DANCE_CHASSIS_BREATHE",  "Bridge",    "Rest, breathe on G"),
    (103.5, "DANCE_PEACOCK",          "Bridge",    "Proud slow display on Am→G"),

    # ── CHORUS 2 (1:50 – 2:22) ──────────────────────────────────────────
    (109.0, "DANCE_ROLL_SLOW",        "Chorus 2",  "Moonlight ripple — C"),
    (110.5, "DANCE_CHASSIS_BREATHE",  "Chorus 2",  "Gentle roll on G"),
    (118.0, "DANCE_PEACOCK",          "Chorus 2",  "Full display — G"),
    (125.0, "DANCE_ROLL_SLOW",        "Chorus 2",  "Ripple through — G7"),
    (127.5, "DANCE_CHASSIS_BREATHE",  "Chorus 2",  "Breathe out — C resolve"),
    (131.5, "DANCE_PITCH_PIVOT",      "Chorus 2",  "Lean and return — G7"),
    (133.0, "DANCE_ROLL_SLOW",        "Chorus 2",  "Moonlight ripple — C"),

    # ── VERSE 2 (2:22 – 3:00) ───────────────────────────────────────────
    (142.0, "DANCE_TWIST",            "Verse 2",   "Latha madulu — C"),
    (145.5, "DANCE_CIRCLE",           "Verse 2",   "Atha wanawi — Em, circle"),
    (149.0, "DANCE_RIPPLE_2",         "Verse 2",   "Epa ahaka — Am"),
    (152.5, "DANCE_WAVE",             "Verse 2",   "Balanna — F→C"),
    (156.5, "DANCE_TWIST",            "Verse 2",   "Repeat — C"),
    (160.0, "DANCE_CIRCLE",           "Verse 2",   "Em"),
    (163.5, "DANCE_PITCH_PIVOT",      "Verse 2",   "Maa geana — G, emotional sway"),
    (167.5, "DANCE_HEADBANG",         "Verse 2",   "Mathakaya guli — G7, nodding"),
    (171.5, "DANCE_PEACOCK",          "Verse 2",   "Maha weal — C, grand display"),
    (175.5, "DANCE_SALSA",            "Verse 2",   "Iyata — G, rising"),
    (179.5, "DANCE_RIPPLE",           "Verse 2",   "Damanna — C, flowing resolve"),

    # ── OUTRO / FADE (3:00 – end) ────────────────────────────────────────
    (183.0, "DANCE_CHASSIS_BREATHE",  "Outro",     "Settle — C"),
    (187.0, "DANCE_WAVE",             "Outro",     "Farewell wave — Am"),
    (191.0, "DANCE_BEG_WAVE",         "Outro",     "Last moonlit beg — F"),
    (196.0, "DANCE_PEACOCK",          "Outro",     "Final open display — G7→C"),
    (201.0, "DANCE_CHASSIS_BREATHE",  "Outro",     "Breathe and rest"),
    (208.0, "STAND",                  "Outro",     "Song ends — stand still"),
]

FINAL_READY_TIMEOUT = 8.0

class HanthaneShowRunner:
    def __init__(self):
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._ready_event = threading.Event()
        self.is_playing = False
        self.start_offset = 0.0
        self.song_start_wall = 0.0
        self.current_section = "Intro"
        self.current_move = "STAND"
        self.next_move = "DANCE_CHASSIS_BREATHE"
        self.next_time = 0.0
        self.total_duration = 208.0

    def handle_ready(self):
        """Called when ESP32 finishes a move ahead of time."""
        self._ready_event.set()

    def start(self, start_offset: float = 0.0):
        """Starts the Hanthane choreography at the given offset seconds."""
        from .engine import log_event

        self.stop() # Stop any active run

        with self._lock:
            self._stop_event.clear()
            self._ready_event.clear()
            self.start_offset = max(0.0, start_offset)
            self.is_playing = True
            self.song_start_wall = time.monotonic() - self.start_offset

        log_event(f"🎵 [HANTHANE SHOWCASE]: Starting choreography from {self.start_offset:.1f}s", level="success", source="PI")

        def _worker():
            from .serial_link import send_to_esp32

            pending = [(t, cmd, sec, note) for t, cmd, sec, note in CHOREOGRAPHY if t >= self.start_offset]
            if not pending:
                with self._lock:
                    self.is_playing = False
                return

            i = 0
            while i < len(pending) and not self._stop_event.is_set():
                song_time, command, section, note = pending[i]

                with self._lock:
                    self.current_section = section
                    self.current_move = command
                    if i + 1 < len(pending):
                        self.next_move = pending[i + 1][1]
                        self.next_time = pending[i + 1][0]
                    else:
                        self.next_move = "END"
                        self.next_time = self.total_duration

                # Step 1: Wait until beat
                target_wall = self.song_start_wall + song_time
                wait = target_wall - time.monotonic()
                if wait > 0:
                    if self._stop_event.wait(timeout=wait):
                        break

                if self._stop_event.is_set():
                    break

                # Step 2: Send command
                self._ready_event.clear()
                send_to_esp32(command)
                elapsed = time.monotonic() - self.song_start_wall
                from .engine import log_event
                log_event(f"💃 [{elapsed:5.1f}s | {section}] {command:<24} ← {note}", level="info", source="PI")

                # Step 3: Last move
                if i + 1 >= len(pending):
                    self._ready_event.wait(timeout=FINAL_READY_TIMEOUT)
                    break

                # Step 4: Wait for READY or next deadline
                next_song_time = pending[i + 1][0]
                deadline_wall = self.song_start_wall + next_song_time
                remaining = deadline_wall - time.monotonic()

                if remaining > 0:
                    self._ready_event.wait(timeout=remaining)

                i += 1

            with self._lock:
                self.is_playing = False
                self.current_move = "STAND"
                self.next_move = "STAND"

            from .serial_link import send_to_esp32
            from .engine import log_event
            send_to_esp32("STAND")
            log_event("✅ [HANTHANE SHOWCASE]: Choreography complete. Robot standing by.", level="success", source="PI")

        self._thread = threading.Thread(target=_worker, daemon=True, name="hanthane_show_runner")
        self._thread.start()

    def stop(self):
        """Stops the choreography immediately and sets robot to STAND."""
        from .serial_link import send_to_esp32
        with self._lock:
            self._stop_event.set()
            self._ready_event.set()
            self.is_playing = False
            self.current_move = "STAND"
            self.next_move = "STAND"

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.3)

        send_to_esp32("STAND")

    def get_status(self) -> dict:
        with self._lock:
            elapsed = (time.monotonic() - self.song_start_wall) if self.is_playing else self.start_offset
            return {
                "is_playing": self.is_playing,
                "elapsed": max(0.0, min(self.total_duration, elapsed)),
                "total_duration": self.total_duration,
                "current_section": self.current_section,
                "current_move": self.current_move,
                "next_move": self.next_move,
                "next_time": self.next_time,
                "bpm": 152,
                "song_title": "Hanthanata Payana Sanda",
                "artist": "Amarasiri Peiris"
            }

hanthane_runner = HanthaneShowRunner()
