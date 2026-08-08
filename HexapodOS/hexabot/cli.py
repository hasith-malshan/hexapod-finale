import os
import sys
import time
from .state import state
from .serial_link import send_to_esp32

MANUAL_COMMANDS = {
    1: ("WALK_FORWARD", "Walk Forward"),
    2: ("WALK_BACKWARD", "Walk Backward"),
    3: ("TURN_LEFT", "Turn Left"),
    4: ("TURN_RIGHT", "Turn Right"),
    5: ("STAND", "Stand / Stop / Reset"),
    6: ("DANCE_WAVE", "Dance: Wave"),
    7: ("DANCE_RIPPLE", "Dance: Ripple"),
    8: ("DANCE_PEACOCK", "Dance: Peacock"),
    9: ("DANCE_SALSA", "Dance: Salsa"),
    10: ("DANCE_TWIST", "Dance: Twist"),
    11: ("DANCE_CIRCLE", "Dance: Circle"),
    12: ("DANCE_CRAWL", "Dance: Crawl"),
    13: ("DANCE_HEADBANG", "Dance: Headbang"),
    14: ("DANCE_GALLOP", "Dance: Gallop"),
    15: ("DANCE_ROLL_FAST", "Dance: Fast Roll"),
    16: ("DANCE_STROBE", "Dance: Strobe"),
    17: ("DANCE_PULSE", "Dance: Pulse"),
    18: ("DANCE_BEG_WAVE", "NEW: Humanoid Beg & Wave"),
    19: ("DANCE_CHASSIS_BREATHE", "NEW: Sine Wave Chassis Breathe"),
    20: ("DANCE_BELLY_CRAWL", "NEW: Low-Rider Belly Crawl"),
    21: ("DANCE_PITCH_PIVOT", "NEW: Pitch & Pivot Sway"),
    22: ("DANCE_TWITCH", "NEW: High-Frequency Twitch/Shiver"),
    23: ("DANCE_WORM", "NEW: Brownian Ripple Worm"),
    24: ("TEST_LEG_0", "DIAGNOSTIC: Test Leg 0 (Front Left)"),
    25: ("TEST_LEG_1", "DIAGNOSTIC: Test Leg 1 (Mid Left)"),
    26: ("TEST_LEG_2", "DIAGNOSTIC: Test Leg 2 (Back Left)"),
    27: ("TEST_LEG_3", "DIAGNOSTIC: Test Leg 3 (Front Right)"),
    28: ("TEST_LEG_4", "DIAGNOSTIC: Test Leg 4 (Mid Right)"),
    29: ("TEST_LEG_5", "DIAGNOSTIC: Test Leg 5 (Back Right)"),
    30: ("RELAX", "SAFETY: Deactivate (Relax) All Servos")
}

def manual_testing_loop():
    print("\n" + "=" * 50 + "\n   🤖 HEXAPOD MANUAL TESTING CLI 🤖\n" + "=" * 50)
    for k, v in MANUAL_COMMANDS.items():
        if k == 6: print("--- Current Dances ---")
        if k == 18: print("--- NEW Experimental Dances ---")
        if k == 24: print("--- Diagnostics ---")
        print(f"  [{k:02d}] {v[1]}")
    print("\n  [ 0] EXIT SCRIPT\n" + "=" * 50)

    while True:
        try:
            choice = input("\nEnter move number >>> ").strip()
            if choice == '0' or choice.lower() == 'q':
                os._exit(0)
            if choice.isdigit() and (cmd_idx := int(choice)) in MANUAL_COMMANDS:
                cmd_str = MANUAL_COMMANDS[cmd_idx][0]
                print(f" >> Sending: {cmd_str}")
                send_to_esp32(cmd_str)
                with state.lock:
                    state.command_detected_time = time.time()
            else:
                print("Invalid selection.")
        except ValueError:
            print("Please enter a valid number.")
        except KeyboardInterrupt:
            os._exit(0)
