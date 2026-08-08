import time
import math
import random
import colorsys
import logging
import threading

try:
    from rpi_ws281x import Color, PixelStrip, ws
except ImportError:
    Color = None
    PixelStrip = None
    ws = None

from .state import state
from .config import LED_PIN, LED_CHANNEL, NUM_LEDS, LED_BRIGHTNESS

def log_event(message: str):
    logging.info(message)
    print(message)

try:
    if PixelStrip and ws:
        strip = PixelStrip(NUM_LEDS, LED_PIN, 800_000, 10, False, LED_BRIGHTNESS, LED_CHANNEL, ws.WS2811_STRIP_GRB)
        strip.begin()
    else:
        strip = None
except Exception as e:
    log_event(f"ℹ️ WS2811 LED hardware initialization note: {e}")
    strip = None

def hsv(hue, sat=255, val=255):
    if not Color:
        return 0
    red, green, blue = colorsys.hsv_to_rgb((hue % 256) / 256.0, sat / 255.0, val / 255.0)
    return Color(int(red * 255), int(green * 255), int(blue * 255))

def beatsin(bpm, low, high, phase=0):
    return int(low + ((math.sin(time.monotonic() * bpm * 2 * math.pi / 60 + phase) + 1) / 2) * (high - low))

def fade_to_black_by(amount):
    if not strip or not Color:
        return
    scale = max(0, 255 - amount) / 255.0
    for i in range(NUM_LEDS):
        c = strip.getPixelColor(i)
        strip.setPixelColor(i, Color(int(((c >> 16) & 0xFF) * scale), int(((c >> 8) & 0xFF) * scale),
                                     int((c & 0xFF) * scale)))

def render_fire(heat):
    if not strip or not Color:
        return
    for i in range(NUM_LEDS):
        heat[i] = max(0, heat[i] - random.randrange(10, 35))
    for i in range(NUM_LEDS - 1, 1, -1):
        heat[i] = (heat[i - 1] + heat[i - 2] * 2) // 3
    if random.randrange(256) < 130:
        spot = random.randrange(min(2, NUM_LEDS))
        heat[spot] = min(255, heat[spot] + random.randrange(160, 256))
    for i, temperature in enumerate(heat):
        ramp = (temperature & 0x3F) << 2
        colour = Color(255, 255, ramp) if temperature > 0x80 else Color(255, ramp, 0) if temperature > 0x40 else Color(ramp, 0, 0)
        strip.setPixelColor(i, colour)

def render_manual_led(pattern, frame, heat):
    if not strip or not Color:
        return
    if pattern == "rainbow":
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, hsv((frame * 5 + i * 18) % 256))
    elif pattern == "confetti":
        fade_to_black_by(25)
        if random.random() < 0.3:
            strip.setPixelColor(random.randrange(NUM_LEDS), hsv(random.randrange(256)))
    elif pattern == "sinelon":
        fade_to_black_by(35)
        strip.setPixelColor(beatsin(18, 0, NUM_LEDS - 1), hsv((frame * 8) % 256))
    elif pattern == "bpm":
        value = beatsin(90, 80, 255)
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, hsv((i * 24 + frame * 3) % 256, 255, value))
    elif pattern == "juggle":
        fade_to_black_by(40)
        for d in range(4):
            strip.setPixelColor(beatsin(d + 8, 0, NUM_LEDS - 1, d * 0.6), hsv(d * 64))
    elif pattern == "fire":
        render_fire(heat)
    elif pattern == "color_wipe":
        colors = [Color(255, 0, 0), Color(0, 255, 0), Color(0, 0, 255), Color(255, 100, 0)]
        strip.setPixelColor((frame // 4) % NUM_LEDS, colors[(frame // (NUM_LEDS * 4)) % 4])
    elif pattern == "theater_chase":
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, hsv((frame * 5 + i * 20) % 256) if (i + (frame // 3)) % 3 == 0 else Color(0, 0, 0))
    elif pattern == "comet":
        fade_to_black_by(50)
        pos = frame % (NUM_LEDS * 2 - 2)
        strip.setPixelColor(NUM_LEDS * 2 - 2 - pos if pos >= NUM_LEDS else pos, hsv((frame * 5) % 256))
    elif pattern == "dual_scanner":
        fade_to_black_by(65)
        pos = frame % (NUM_LEDS * 2 - 2)
        pos = NUM_LEDS * 2 - 2 - pos if pos >= NUM_LEDS else pos
        strip.setPixelColor(pos, Color(255, 20, 0))
        strip.setPixelColor(NUM_LEDS - 1 - pos, Color(0, 60, 255))
    elif pattern == "breathing":
        c_val = int(20 + ((math.sin(frame * 0.05) + 1) / 2) * 100)
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, Color(0, c_val, int(c_val * 2.5)))
    elif pattern == "sparkle_burst":
        if frame % 40 == 0:
            for i in range(NUM_LEDS):
                strip.setPixelColor(i, Color(0, 0, 0))
            for _ in range(random.randint(2, NUM_LEDS)):
                strip.setPixelColor(random.randint(0, NUM_LEDS - 1), hsv(random.randint(0, 255)))
        else:
            fade_to_black_by(30)
    elif pattern == "strobe":
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, hsv((frame * 11) % 256, 100, 255) if (frame // 3) % 2 == 0 else Color(0, 0, 0))
    elif pattern == "wave":
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, hsv((frame * 2 + i * 16) % 256, 230,
                                       int(25 + ((math.sin(frame * 0.18 - i * 0.9) + 1) / 2) * 230)))
    elif pattern == "alternating":
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, Color(255, 0, 80) if (i + (frame // 10)) % 2 == 0 else Color(0, 180, 255))
    elif pattern == "random_palette":
        if frame % 100 == 0 or not hasattr(state, 'rand_pal'):
            state.rand_pal = [hsv(random.randint(0, 255)) for _ in range(4)]
        for i in range(NUM_LEDS):
            strip.setPixelColor(i, state.rand_pal[i % 4])

def led_thread():
    if not strip or not Color:
        log_event("ℹ️ LED strip in virtual/telemetry mode.")
        while True:
            time.sleep(2)
        return
    
    frame = 0
    heat = [0] * NUM_LEDS
    while True:
        try:
            with state.lock:
                mood = state.mood
                voice_active = state.voice_active
                command_time = state.command_detected_time
                manual = state.manual_led_pattern
                bpm = state.bpm
                beat_active = time.monotonic() - state.last_beat_time < 0.15
                obstacle_zone = getattr(state, "obstacle_zone", "CLEAR")

            elapsed = time.time() - command_time
            frame += 1

            # TOP PRIORITY 1: ULTRASONIC OBSTACLE DETECTION ZONES
            # Zone 1: Critical Proximity Hazard (< 30cm) -> ALL LEDs flash fast bright RED
            if obstacle_zone == "DANGER":
                strobe_on = (frame // 3) % 2 == 0
                red_color = Color(255, 0, 0) if strobe_on else Color(40, 0, 0)
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, red_color)
            
            # Zone 2: Obstacle Warning (30cm to 80cm) -> ALL LEDs pulse solid AMBER / ORANGE
            elif obstacle_zone == "WARNING":
                amber_val = int(140 + ((math.sin(frame * 0.15) + 1) / 2) * 115)
                amber_color = Color(amber_val, int(amber_val * 0.45), 0)
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, amber_color)

            # TOP PRIORITY 2: Command & Voice overrides
            elif elapsed < 0.25:
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, Color(255, 255, 255))
            elif elapsed < 1.0:
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, Color(0, 50, 255))
            elif voice_active:
                strip.setPixelColor(0, Color(0, 0, 0))
                fade_to_black_by(60)
                pos = frame % (NUM_LEDS * 2 - 2)
                strip.setPixelColor(NUM_LEDS * 2 - 2 - pos if pos >= NUM_LEDS else pos, Color(0, 255, 50))
            
            # STANDARD RUNTIME: Manual Patterns or Music Mood Sync
            elif manual:
                render_manual_led(manual, frame, heat)
            elif mood == "AGGRESSIVE":
                if beat_active:
                    for i in range(NUM_LEDS):
                        strip.setPixelColor(i, Color(255, 255, 255))
                else:
                    render_fire(heat)
            elif mood == "ENERGY":
                fade_to_black_by(40)
                strip.setPixelColor(beatsin(bpm if bpm > 0 else 120, 0, NUM_LEDS - 1),
                                    Color(255, 255, 255) if beat_active else hsv(int(time.monotonic() * 50) % 256))
            elif mood == "CHILL":
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, hsv(frame + i * 10, 230, 255 if beat_active else int(
                        25 + ((math.sin(frame * ((bpm / 60.0) * 0.1 if bpm > 0 else 0.1) - i * 0.5) + 1) / 2) * 200)))
            else:
                for i in range(NUM_LEDS):
                    strip.setPixelColor(i, Color(0, int(10 + (
                                ((math.sin(frame * 0.05) + 1) / 2) * 80)), int(10 + ((math.sin(frame * 0.05) + 1) / 2) * 80)))
            strip.show()
            time.sleep(0.02)
        except Exception:
            time.sleep(1)
