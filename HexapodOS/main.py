import os
import sys
import logging
import threading
import socket
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

# Mount static resources (audio, models, assets)
RES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "res")
os.makedirs(RES_DIR, exist_ok=True)
app.mount("/res", StaticFiles(directory=RES_DIR), name="res")

# Mount static React dashboard build
DASHBOARD_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(DASHBOARD_DIST_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=DASHBOARD_DIST_DIR, html=True), name="static")

def is_port_in_use(port: int, host: str = "0.0.0.0") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def find_available_port(start_port: int = 8080) -> int:
    port = start_port
    while is_port_in_use(port) and port < start_port + 20:
        port += 1
    return port

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

    # Determine port (Default: 8080 with auto-fallback)
    env_port = os.environ.get("PORT")
    if env_port:
        port = int(env_port)
    else:
        port = find_available_port(start_port=8080)

    host = os.environ.get("HOST", "0.0.0.0")

    print("\n" + "=" * 50)
    print(f"🚀 Hexapod Dashboard live at: http://10.42.0.1:{port}")
    print(f"📡 WebSocket endpoint at:     ws://10.42.0.1:{port}/api/ws")
    print("=" * 50 + "\n")

    import uvicorn
    uvicorn.run("main:app", host=host, port=port, reload=False)
