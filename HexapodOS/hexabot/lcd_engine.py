import time
import logging
import threading

def log_event(message: str):
    logging.info(message)
    print(message)

def display_loop():
    log_event("ℹ️ LCD Display Engine stub initialized (full draw logic omitted for brevity).")
    while True:
        time.sleep(1)
        # In the full implementation, this loops over state.mood and state.voice_active
        # and draws the animated eyes using adafruit_rgb_display.ili9341.
