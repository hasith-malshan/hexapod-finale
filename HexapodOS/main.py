import os
import sys
import logging
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
# Also output to stdout so we can see it in terminal
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
logging.getLogger().addHandler(console_handler)

# --- APP INITIALIZATION ---
app = FastAPI(title="Hexapod OS Unified Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IMPORT ROUTES & LOGIC ---
from api.endpoints import router as api_router
from api.websocket import router as ws_router
from hexabot import start_hexabot_os

app.include_router(api_router, prefix="/api", tags=["API"])
app.include_router(ws_router, prefix="/api", tags=["WebSockets"])

# Ensure static directory exists to prevent startup crash
DASHBOARD_DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(DASHBOARD_DIST_DIR, exist_ok=True)

# Mount the static React dashboard build
app.mount("/", StaticFiles(directory=DASHBOARD_DIST_DIR, html=True), name="static")

@app.on_event("startup")
async def startup_event():
    logging.info("Starting up FastAPI Server & Hexabot OS...")
    # This spawns all the background threads for Audio, YAMNet, Serial, LEDs, LCD
    start_hexabot_os()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
