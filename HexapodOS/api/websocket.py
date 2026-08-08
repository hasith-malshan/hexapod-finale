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
                            "bpm": state.bpm,
                            "energy": state.energy_level,
                            "activity": state.activity_level,
                            "mood": state.mood,
                            "context": state.audio_context,
                            "tilt": state.body_roll,
                            "mode": state.operating_mode,
                            "current_move": state.current_move,
                            "planned_move": state.planned_move
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
