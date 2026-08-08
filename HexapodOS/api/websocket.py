import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from hexabot import state, trigger_manual_command
import logging

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._broadcast_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logging.info("WebSocket client connected")
        
        if self._broadcast_task is None or self._broadcast_task.done():
            self._broadcast_task = asyncio.create_task(self._broadcast_telemetry())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logging.info("WebSocket client disconnected")

    async def _broadcast_telemetry(self):
        """Streams state data to all connected clients at ~7Hz."""
        while self.active_connections:
            try:
                with state.lock:
                    payload = {
                        "type": "telemetry",
                        "data": {
                            "bpm": getattr(state, "bpm", 0),
                            "energy": getattr(state, "energy_level", "LOW"),
                            "activity": getattr(state, "activity_level", "LOW"),
                            "rhythm_speed": getattr(state, "rhythm_speed", "SLOW"),
                            "mood": getattr(state, "mood", "IDLE"),
                            "context": getattr(state, "audio_context", "UNKNOWN"),
                            "genre": getattr(state, "genre", "UNKNOWN"),
                            "tilt": getattr(state, "body_roll", 0.0),
                            "mode": getattr(state, "operating_mode", "AUTO"),
                            "current_move": getattr(state, "current_move", "STAND"),
                            "planned_move": getattr(state, "planned_move", None),
                            "rms_db": getattr(state, "rms_db", 0.0),
                            "peak_amplitude": getattr(state, "peak_amplitude", 0.0),
                            "syllable_count": getattr(state, "syllable_count", 0),
                            "voice_active": getattr(state, "voice_active", False),
                            "voice_action_mode": getattr(state, "voice_action_mode", "SPEAK_AND_ACT"),
                            "last_voice_command": getattr(state, "last_voice_command", {}),
                            "manual_led_pattern": getattr(state, "manual_led_pattern", None),
                            "manual_mood": getattr(state, "manual_mood", None),
                            "show_audio_logs": getattr(state, "show_audio_logs", False),
                            "audio_source": getattr(state, "audio_source", "MIC"),
                            "robot_ready": getattr(state, "robot_ready", False),
                        }
                    }
                
                # Send to all connected clients
                disconnected = []
                for connection in self.active_connections:
                    try:
                        await connection.send_text(json.dumps(payload))
                    except Exception:
                        disconnected.append(connection)
                
                for conn in disconnected:
                    self.disconnect(conn)
                    
            except Exception as e:
                logging.error(f"Telemetry broadcast error: {e}")
                
            await asyncio.sleep(0.14) # ~7Hz update rate

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # Handle incoming commands from UI
                if message.get("type") == "command" and message.get("action"):
                    cmd = message["action"]
                    success = trigger_manual_command(cmd)
                    if not success:
                        await websocket.send_text(json.dumps({"type": "error", "message": "Robot is not in MANUAL mode."}))
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
