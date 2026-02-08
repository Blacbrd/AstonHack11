from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uvicorn
from pose_worker import PoseAnalysisWorker
from tts_worker import get_tts_audio
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pose worker
pose_worker = None
try:
    pose_worker = PoseAnalysisWorker()
    print("✅ PoseAnalysisWorker initialized.")
except Exception as e:
    print("❌ Error initializing PoseWorker:")
    traceback.print_exc()

class TTSRequest(BaseModel):
    text: str

# --- WebSocket: SIMPLE PROCESSING ONLY ---
# No rooms, no broadcasting. Just Input -> AI -> Output.
@app.websocket("/ws/analyze")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    if pose_worker is None:
        await websocket.close(code=1011)
        return

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            # 1. Process the frame locally
            try:
                # process_frame returns a JSON string
                result_json = pose_worker.process_frame(
                    message.get('image'), 
                    message.get('mode')
                )
                
                # 2. Send it RIGHT BACK to the same frontend
                await websocket.send_text(result_json)

            except Exception as e:
                print(f"Processing Error: {e}")
                
    except WebSocketDisconnect:
        print("Client disconnected")

@app.post("/tts")
def tts_endpoint(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    return get_tts_audio(text)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)