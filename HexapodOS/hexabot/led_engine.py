import time
import math
import random
import colorsys
import logging
import threading

try:
    from rpi_ws281x import Color, PixelStrip, ws
except ImportError:
    pass

from .state import state
from .config import LED_PIN, LED_CHANNEL, NUM_LEDS, LED_BRIGHTNESS

def log_event(message: str):
    logging.info(message)
    print(message)

try:
    strip = PixelStrip(NUM_LEDS, LED_PIN, 800_000, 10, False, LED_BRIGHTNESS, LED_CHANNEL, ws.WS2811_STRIP_GRB)
    strip.begin()
except Exception:
    strip = None

def hsv(hue, sat=255, val=255):
    if strip is None: return 0
    red, green, blue = colorsys.hsv_to_rgb((hue % 256) / 256.0, sat / 255.0, val / 255.0)
    from rpi_ws281x import Color
    return Color(int(red * 255), int(green * 255), int(blue * 255))

def beatsin(bpm, low, high, phase=0):
    return int(low + ((math.sin(time.monotonic() * bpm * 2 * math.pi / 60 + phase) + 1) / 2) * (high - low))

def fade_to_black_by(amount):
    if strip is None: return
    scale = max(0, 255 - amount) / 255.0
    for i in range(NUM_LEDS):
        c = strip.getPixelColor(i)
        from rpi_ws281x import Color
        strip.setPixelColor(i, Color(int(((c >> 16) & 0xFF) * scale), int(((c >> 8) & 0xFF) * scale),
                                     int((c & 0xFF) * scale)))

def render_fire(heat):
    if strip is None: return
    for i in range(NUM_LEDS): heat[i] = max(0, heat[i] - random.randrange(10, 35))
    for i in range(NUM_LEDS - 1, 1, -1): heat[i] = (heat[i - 1] + heat[i - 2] * 2) // 3
    if random.randrange(256) < 130:
        spot = random.randrange(min(2, NUM_LEDS))
        heat[spot] = min(255, heat[spot] + random.randrange(160, 256))
    for i, temperature in enumerate(heat):
        ramp = (temperature & 0x3F) << 2
        from rpi_ws281x import Color
        colour = Color(255, 255, ramp) if temperature > 0x80 else Color(255, ramp, 0) if temperature > 0x40 else Color(ramp, 0, 0)
        strip.setPixelColor(i, colour)

def render_manual_led(pattern, frame, heat):
    if strip is None: return
    from rpi_ws281x import Color
    if pattern == "rainbow":
        for i in range(NUM_LEDS): strip.setPixelColor(i, hsv((frame * 5 + i * 18) % 256))
    elif pattern == "fire":
        render_fire(heat)
    elif pattern == "color_wipe":
        colors = [Color(255, 0, 0), Color(0, 255, 0), Color(0, 0, 255), Color(255, 100, 0)]
        strip.setPixelColor((frame // 4) % NUM_LEDS, colors[(frame // (NUM_LEDS * 4)) % 4])
    else:
        # Fallback breathing
        c_val = int(20 + ((math.sin(frame * 0.05) + 1) / 2) * 100)
        for i in range(NUM_LEDS): strip.setPixelColor(i, Color(0, c_val, int(c_val * 2.5)))

def led_thread():
    if strip is None:
        log_event("ℹ️ LED strip disabled or unavailable.")
        return
    
    from rpi_ws281x import Color
    frame = 0
    heat = [0] * NUM_LEDS
    while True:
        try:
            with state.lock:
                mood, voice_active, command_time = state.mood, state.voice_active, state.command_detected_time
                manual, bpm, beat_active = state.manual_led_pattern, state.bpm, time.monotonic() - state.last_beat_time < 0.15
            elapsed = time.time() - command_time
            frame += 1

            if elapsed < 0.25:
                for i in range(NUM_LEDS): strip.setPixelColor(i, Color(255, 255, 255))
            elif elapsed < 1.0:
                for i in range(NUM_LEDS): strip.setPixelColor(i, Color(0, 50, 255))
            elif voice_active:
                strip.setPixelColor(0, Color(0, 0, 0))
                fade_to_black_by(60)
                pos = frame % (NUM_LEDS * 2 - 2)
                strip.setPixelColor(NUM_LEDS * 2 - 2 - pos if pos >= NUM_LEDS else pos, Color(0, 255, 50))
            elif manual:
                render_manual_led(manual, frame, heat)
            elif mood == "AGGRESSIVE":
                if beat_active:
                    for i in range(NUM_LEDS): strip.setPixelColor(i, Color(255, 255, 255))
                else:
                    render_fire(heat)
            elif mood == "ENERGY":
                fade_to_black_by(40)
                strip.setPixelColor(beatsin(bpm if bpm > 0 else 120, 0, NUM_LEDS - 1),
                                    Color(255, 255, 255) if beat_active else hsv(int(time.monotonic() * 50) % 256))
            elif mood == "CHILL":
                for i in range(NUM_LEDS): strip.setPixelColor(i, hsv(frame + i * 10, 230, 255 if beat_active else int(
                    25 + ((math.sin(frame * ((bpm / 60.0) * 0.1 if bpm > 0 else 0.1) - i * 0.5) + 1) / 2) * 200)))
            else:
                for i in range(NUM_LEDS): strip.setPixelColor(i, Color(0, int(10 + (
                            (math.sin(frame * 0.05) + 1) / 2) * 80), int(10 + ((math.sin(frame * 0.05) + 1) / 2) * 80)))
            strip.show()
            time.sleep(0.02)
        except Exception:
            time.sleep(1)
