import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import Response


load_dotenv()

API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1")

if not API_KEY:
  raise RuntimeError("Missing ELEVENLABS_API_KEY in .env")

ELEVEN_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

app = FastAPI()

# ✅ allow React frontend to call this backend
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173", "http://localhost:3000"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

class TTSRequest(BaseModel):
  text: str

@app.post("/tts")
def tts(req: TTSRequest):
  text = (req.text or "").strip()
  if not text:
    raise HTTPException(status_code=400, detail="No text provided")

  headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "audio/mpeg",
  }

  payload = {
    "text": text,
    "model_id": MODEL_ID,
    "voice_settings": {
      "stability": 0.4,
      "similarity_boost": 0.7
    }
  }

  r = requests.post(ELEVEN_URL, headers=headers, json=payload, timeout=60)

  if r.status_code != 200:
    raise HTTPException(status_code=500, detail=r.text)

  # ✅ IMPORTANT: return raw mp3 bytes
  return Response(content=r.content, media_type="audio/mpeg")

