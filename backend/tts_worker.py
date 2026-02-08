import os
import requests
import hashlib
from dotenv import load_dotenv
from fastapi import HTTPException
from fastapi.responses import FileResponse
import traceback

load_dotenv()

API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1")
ELEVEN_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

# Define the folder for cached audio
CACHE_DIR = "pre_loaded_audio"

# Ensure the directory exists when the app starts
os.makedirs(CACHE_DIR, exist_ok=True)

def get_tts_audio(text: str):
    """
    Checks if audio for the given text exists in 'pre_loaded_audio'.
    If yes, returns it.
    If no, calls ElevenLabs, saves it, then returns it.
    """
    
    # 1. Create a unique filename based on the text content (MD5 Hash)
    # This ensures the same text always maps to the same file.
    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    audio_filename = os.path.join(CACHE_DIR, f"{text_hash}.mp3")

    # 2. Check if this file already exists locally
    if os.path.exists(audio_filename):
        print(f"Loading cached audio for text hash {text_hash[:8]}...")
        return FileResponse(audio_filename, media_type="audio/mpeg")

    # 3. If not, we must generate it. Verify API Key first.
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY in environment (.env)")

    print(f"Generating new audio via ElevenLabs for: '{text[:30]}...'")

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

    try:
        r = requests.post(ELEVEN_URL, headers=headers, json=payload, timeout=60)
        
        if r.status_code != 200:
            print("ElevenLabs returned non-200:", r.status_code, r.text)
            raise HTTPException(status_code=500, detail=f"ElevenLabs Error: {r.status_code} - {r.text}")

        # 4. Save the new audio to the pre_loaded_audio folder
        with open(audio_filename, "wb") as f:
            f.write(r.content)
            
        print(f"Saved new audio to: {audio_filename}")

        # 5. Return the newly saved file
        return FileResponse(audio_filename, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as e:
        print("TTS Error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))