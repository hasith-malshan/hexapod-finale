import time
import math
import random
import logging
import threading

try:
    import board
    import busio
    import digitalio
    from PIL import Image, ImageDraw
    from adafruit_rgb_display import ili9341
except ImportError:
    ili9341 = None

from .state import state
from .config import DISPLAY_CS_PIN, DISPLAY_DC_PIN, DISPLAY_RST_PIN

def log_event(message: str):
    logging.info(message)
    print(message)

def init_display():
    if ili9341 is None:
        return None
    spi = busio.SPI(clock=board.SCK, MOSI=board.MOSI)
    return ili9341.ILI9341(
        spi,
        cs=digitalio.DigitalInOut(DISPLAY_CS_PIN),
        dc=digitalio.DigitalInOut(DISPLAY_DC_PIN),
        rst=digitalio.DigitalInOut(DISPLAY_RST_PIN),
        rotation=90,
        baudrate=24_000_000
    )

def draw_rounded_rect(draw, xy, corner_radius, fill):
    x0, y0, x1, y1 = xy
    r = min(corner_radius, (x1 - x0) // 2, (y1 - y0) // 2)
    if r <= 0:
        draw.rectangle([x0, y0, x1, y1], fill=fill)
        return
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.pieslice([x0, y0, x0 + r * 2, y0 + r * 2], 180, 270, fill=fill)
    draw.pieslice([x1 - r * 2, y1 - r * 2, x1, y1], 0, 90, fill=fill)
    draw.pieslice([x0, y1 - r * 2, x0 + r * 2, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - r * 2, y0, x1, y0 + r * 2], 270, 360, fill=fill)

def display_loop():
    try:
        display = init_display()
    except Exception as e:
        log_event(f"ℹ️ LCD SPI display not available: {e}")
        display = None

    if display is None:
        log_event("ℹ️ LCD Display Engine running in virtual/telemetry mode.")
        while True:
            time.sleep(2)
        return

    width, height, eye_w, eye_h, lx, rx, cy = 320, 240, 70, 120, 90, 230, 120
    blink_timer = time.time()
    blink_interval = random.uniform(2.0, 5.0)
    is_blinking = False

    log_event("✅ LCD Eye Graphics Engine active on SPI.")

    while True:
        try:
            with state.lock:
                effective_mood = state.manual_mood if state.manual_mood is not None else state.mood
                mood = effective_mood
                va = state.voice_active
                cmd_t = state.command_detected_time
                bpm = state.bpm
                syl = state.syllable_count
                roll = state.body_roll
                beat_active = time.monotonic() - state.last_beat_time < 0.15

            dt = time.time() - cmd_t
            bg = (255, 255, 255) if dt < 0.25 else (30, 30, 80) if dt < 1.0 else (10, 35, 15) if va else (0, 0, 0)
            img = Image.new("RGB", (width, height), color=bg)
            draw = ImageDraw.Draw(img)

            draw.text((5, 5), f"BPM: {bpm:.0f} | Syl: {syl}/3s | Mood: {mood}", fill=(100, 100, 100))

            h, col, cy_r = eye_h, (0, 255, 255), cy
            if dt < 0.25:
                col, h, cy_r = (0, 0, 0), int(eye_h * 0.4), cy - 10
            elif dt < 1.0:
                col, h, cy_r = (0, 191, 255), int(eye_h * 0.4), cy - 10
            elif va or mood == "VOICE_ACTIVE":
                col, h = (0, 255, 100), int(eye_h * 0.75)
            elif mood == "AGGRESSIVE":
                col, h = (255, 50, 50), eye_h + 20
            elif mood == "ENERGY":
                col, h = (255, 150, 50), eye_h + 10
            elif mood == "CHILL":
                col, h = (150, 50, 255), int(eye_h * 0.6)
            elif mood == "HAPPY":
                col, h = (255, 220, 0), eye_h + 15
            elif mood == "CONFUSED":
                col, h = (255, 105, 180), eye_h

            h_l, h_r = (h - 30, h + 20) if mood == "CONFUSED" else (h, h)

            ew = eye_w + 10 if (beat_active and not va and dt > 1.0) else eye_w
            if time.time() - blink_timer > blink_interval:
                is_blinking = True
                blink_timer = time.time()
                blink_interval = random.uniform(2.0, 5.0)

            if is_blinking and not va and dt > 1.0:
                h_l, h_r = 10, 10
                if time.time() - blink_timer > 0.15:
                    is_blinking = False

            roll_offset = int(roll * 1.5)
            draw_rounded_rect(
                draw,
                [lx - ew // 2, cy_r + roll_offset - h_l // 2, lx + ew // 2, cy_r + roll_offset + h_l // 2],
                20,
                col
            )
            draw_rounded_rect(
                draw,
                [rx - ew // 2, cy_r - roll_offset - h_r // 2, rx + ew // 2, cy_r - roll_offset + h_r // 2],
                20,
                col
            )
            display.image(img)
            time.sleep(0.03)
        except Exception:
            time.sleep(1)
