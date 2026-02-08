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

# Initialize pose worker safely
pose_worker = None
try:
    pose_worker = PoseAnalysisWorker()
    print("PoseAnalysisWorker initialized successfully.")
except Exception as e:
    print("Error initializing PoseAnalysisWorker:")
    traceback.print_exc()
    pose_worker = None

class TTSRequest(BaseModel):
    text: str

# --- WebSocket for Pose Analysis ---
@app.websocket("/ws/analyze")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    if pose_worker is None:
        await websocket.close(code=1011, reason="Pose Worker failed to initialize")
        return

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            # Process frame
            try:
                result_json = pose_worker.process_frame(
                    message.get('image'), 
                    message.get('mode')
                )
            except Exception as e:
                print("process_frame exception:", e)
                result_json = json.dumps({"error": "processing error"})

            if result_json:
                await websocket.send_text(result_json)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print("WebSocket Error:")
        traceback.print_exc()

# --- REST Endpoint for TTS (Now with Caching) ---
@app.post("/tts")
def tts_endpoint(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Delegates logic to tts_worker.py which handles the file check
    return get_tts_audio(text)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
