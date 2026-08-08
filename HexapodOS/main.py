import os
import sys
import logging
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# --- LOGGING SETUP ---
log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hexabot.log")
logging.basicConfig(
    filename=log_file_path,
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    datefmt='%H:%M:%S'
)

# --- AUDIO PERMISSIONS HACK FOR SUDO ---
os.environ["PULSE_SERVER"] = "unix:/run/user/1000/pulse/native"
for cookie_path in (
        "/home/codegenix/.config/pulse/cookie",
        "/home/codegenix/.pulse-cookie",
        "/home/codegenix/.config/pulse-cookie",
):
    if os.path.exists(cookie_path):
        os.environ["PULSE_COOKIE"] = cookie_path
        break
os.environ.pop("XDG_RUNTIME_DIR", None)

# --- LIFESPAN MANAGER ---
from hexabot import start_hexabot_os
from hexabot.state import state
from hexabot.cli import manual_testing_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting up FastAPI Server & Hexabot OS...")
    start_hexabot_os()
    yield
    logging.info("Shutting down Hexabot OS...")

# --- APP INITIALIZATION ---
app = FastAPI(title="Hexapod OS Unified Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IMPORT ROUTES & LOGIC ---
from api.endpoints import router as api_router
from api.websocket import router as ws_router

app.include_router(api_router, prefix="/api", tags=["API"])
app.include_router(ws_router, prefix="/api", tags=["WebSockets"])

# Mount static React dashboard build
DASHBOARD_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(DASHBOARD_DIST_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=DASHBOARD_DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    print("\n" + "=" * 50 + "\n      HEXAPOD STARTUP MENU\n" + "=" * 50)
    print(" [1] Autonomous AI / Voice Dancer Mode")
    print(" [2] Manual Dashboard & CLI Testing Mode (Default)\n" + "=" * 50)
    
    selected_mode = "2"
    if sys.stdin.isatty():
        try:
            val = input("Select mode (1 or 2) [Default: 2]: ").strip()
            if val in ('1', '2'):
                selected_mode = val
        except (KeyboardInterrupt, EOFError):
            pass

    if selected_mode == '1':
        state.operating_mode = "AUTO"
        print("🤖 AUTO AI Mode selected.")
    else:
        state.operating_mode = "MANUAL"
        print("🦾 MANUAL Dashboard & CLI Mode selected.")
        
        # Start manual CLI loop in a background daemon thread if running in an interactive TTY
        if sys.stdin.isatty():
            cli_thread = threading.Thread(target=manual_testing_loop, daemon=True, name="manual_cli_thread")
            cli_thread.start()

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    import uvicorn
    try:
        uvicorn.run("main:app", host=host, port=port, reload=False)
    except OSError as e:
        if getattr(e, 'errno', None) == 98 or "address already in use" in str(e).lower():
            print(f"\n❌ Port {port} is already in use by another service or background server!")
            print(f"👉 Fix on Pi: run 'sudo fuser -k {port}/tcp' or 'sudo systemctl stop hexapod'")
            print(f"👉 Or start on a different port: PORT=8080 sudo python3 main.py\n")
        raise
