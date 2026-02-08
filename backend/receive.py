# receive.py (FULL FastAPI + Gemini modes + robust meditation_script JSON handling)
# ------------------------------------------------------------------------------
# Install:
#   pip install fastapi uvicorn python-dotenv google-genai
#
# .env:
#   GEMINI_API_KEY=xxxxxxxx
#
# Run (recommended while debugging):
#   python -m uvicorn receive:app --port 5000
# Avoid --reload while testing meditation_script, because reload can interrupt responses.

import os
import json
from typing import List, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in .env")

client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

# CORS for local React dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Pydantic request models
# -----------------------
Role = Literal["user", "gemini", "model"]

class AskMessage(BaseModel):
    role: Role
    text: str

class AskBody(BaseModel):
    mode: str = "journal"
    tone: str = "calm"
    max_words: int = 80
    messages: List[AskMessage] = []


# -----------------------
# System prompts by mode
# -----------------------
def build_system_prompt(body: AskBody) -> str:
    if body.mode == "diet":
        return f"""
You are a diet logging assistant inside a meal-tracking app.
You ONLY help with meal planning, meal logging, cravings, portion ideas, and simple nutrition guidance.
You MUST respond in no more than TWO sentences.
Ask at most ONE short question if needed to clarify.
Do NOT talk about journaling, emotions, therapy, or unrelated topics.
Tone: {body.tone}.
Return plain text only.
""".strip()

    if body.mode == "meditation":
        return f"""
You are a guided meditation coach.
You ONLY help with calming breathing or grounding instructions.
You MUST respond in no more than TWO sentences.
Do NOT talk about journaling, diet, sleep analysis, or unrelated topics.
Tone: {body.tone}.
Return plain text only.
""".strip()

    if body.mode == "meditation_script":
        # Keep it SHORT to reduce truncation risk.
        return f"""
Return ONLY valid JSON (no markdown, no commentary).
You are a guided meditation SCRIPT GENERATOR inside a meditation app.
The user gives ONE statement (their goal/problem). You generate a complete meditation FLOW.

Output format: a JSON array of blocks. Each block is either:
1) {{ "type": "speak", "text": "..." }}
2) {{ "type": "breathe", "pattern": {{ "inhale": 4000, "hold": 1000, "exhale": 4000 }}, "cycles": 3 }}
or {{ "type": "breathe", "pattern": {{ "inhale": 4000, "exhale": 6000 }}, "durationMs": 60000 }}

Rules:
- Use short, natural sentences suitable for TTS.
- Mix speak + breathe blocks throughout.
- Timings: inhale/exhale 3000–6000ms, hold 0–1500ms.
- Breathe blocks: durationMs 30000–90000 OR cycles 2–6.
- Maximum 12 blocks total (to avoid truncation).
- Do NOT include any extra keys.
- End with a final calming "speak" line (but do NOT include the app's FINISH_LINE).
Tone: {body.tone}.
""".strip()

    if body.mode == "sleep":
        return f"""
You are a sleep coaching assistant inside a sleep-tracking app.
You ONLY help with sleep habits, bedtime routines, wake-time consistency, naps, caffeine timing, and wind-down strategies.
You MUST respond in no more than TWO sentences.
Ask at most ONE short clarifying question if helpful.
Do NOT provide medical diagnoses, therapy, or unrelated advice.
Tone: {body.tone}.
Return plain text only.
""".strip()

    if body.mode == "yoga":
        return f"""
You are a yoga pose assistant inside a yoga app.
You ONLY help with yoga poses, alignment cues, breathing, safe modifications, beginner-friendly steps, and short sequencing advice.
You MUST respond in no more than TWO sentences.
Ask at most ONE short clarifying question if helpful.
Do NOT talk about diet, journaling, therapy, or unrelated topics.
If the user mentions pain, injury, pregnancy, dizziness, or medical conditions, advise them to stop and consult a qualified professional.
Tone: {body.tone}.
Return plain text only.
""".strip()

    # default = journal
    return f"""
You are a journaling reflection assistant.
You ONLY help users reflect on thoughts, emotions, and experiences.
You MUST respond in no more than TWO sentences.
Ask at most ONE gentle reflective question if appropriate.
Do NOT provide general factual info or unrelated advice.
Tone: {body.tone}.
Return plain text only.
""".strip()


# -----------------------
# Convert incoming chat to Gemini "contents"
# -----------------------
def to_gemini_contents(messages: List[AskMessage]) -> List[dict]:
    out = []
    for m in messages or []:
        # google-genai expects roles "user" or "model"
        role = "user" if m.role == "user" else "model"
        out.append({"role": role, "parts": [{"text": m.text}]})
    return out


# -----------------------
# Robust JSON parsing / salvage
# -----------------------
def safe_parse_json_array(text: str):
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty JSON")

    # 1) parse as-is
    try:
        obj = json.loads(text)
        if isinstance(obj, list):
            return obj
    except Exception:
        pass

    # 2) trim to last closing bracket ]
    last = text.rfind("]")
    if last != -1:
        candidate = text[: last + 1]
        obj = json.loads(candidate)
        if isinstance(obj, list):
            return obj

    # 3) extract array region
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        candidate = text[start : end + 1]
        obj = json.loads(candidate)
        if isinstance(obj, list):
            return obj

    raise ValueError("Could not parse JSON array")


def salvage_flow_from_partial_json(text: str):
    """
    Extract as many COMPLETE top-level JSON objects as possible from a partially-truncated
    JSON array like: [ {..}, {..}, {.. cut off... }
    Returns a list of dicts.
    """
    text = (text or "").strip()
    start = text.find("[")
    if start == -1:
        raise ValueError("No JSON array start '[' found")

    objs = []
    in_string = False
    escape = False
    depth = 0
    obj_start = None

    for i in range(start, len(text)):
        ch = text[i]

        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        else:
            if ch == '"':
                in_string = True
                continue

        if ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and obj_start is not None:
                    obj_text = text[obj_start : i + 1]
                    try:
                        objs.append(json.loads(obj_text))
                    except Exception:
                        pass
                    obj_start = None

    if not objs:
        raise ValueError("Could not salvage any complete objects from partial JSON")

    return objs


def validate_flow(flow):
    if not isinstance(flow, list) or not flow:
        raise ValueError("Flow must be a non-empty list")

    for i, item in enumerate(flow):
        if not isinstance(item, dict):
            raise ValueError(f"Flow item {i} is not an object")

        t = item.get("type")
        if t not in ("speak", "breathe"):
            raise ValueError(f"Flow item {i} has invalid type: {t}")

        if t == "speak":
            txt = item.get("text")
            if not isinstance(txt, str) or not txt.strip():
                raise ValueError(f"Flow item {i} speak.text missing/empty")

        if t == "breathe":
            pat = item.get("pattern")
            if not isinstance(pat, dict):
                raise ValueError(f"Flow item {i} breathe.pattern missing")

            inhale = pat.get("inhale")
            exhale = pat.get("exhale")
            hold = pat.get("hold", 0)

            if not isinstance(inhale, int) or not isinstance(exhale, int):
                raise ValueError(f"Flow item {i} inhale/exhale must be ints")
            if inhale <= 0 or exhale <= 0:
                raise ValueError(f"Flow item {i} inhale/exhale must be > 0")
            if hold and (not isinstance(hold, int) or hold < 0):
                raise ValueError(f"Flow item {i} hold must be int >= 0")

            if "cycles" not in item and "durationMs" not in item:
                raise ValueError(f"Flow item {i} breathe must include cycles or durationMs")

            if "cycles" in item and (not isinstance(item["cycles"], int) or item["cycles"] <= 0):
                raise ValueError(f"Flow item {i} cycles must be int > 0")

            if "durationMs" in item and (not isinstance(item["durationMs"], int) or item["durationMs"] < 1000):
                raise ValueError(f"Flow item {i} durationMs must be int >= 1000")

    return True


# -----------------------
# Main endpoint
# -----------------------
@app.post("/ask_gemini")
def ask_gemini(body: AskBody):
    if body.messages:
        print("Received last:", body.messages[-1].text)
    else:
        print("Received: (no messages)")

    system_prompt = build_system_prompt(body)
    contents = to_gemini_contents(body.messages)

    is_script = body.mode == "meditation_script"

    response_mime = "application/json" if is_script else "text/plain"
    max_tokens = 3500 if is_script else 220
    temp = 0.2 if is_script else 0.6

    try:
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temp,
                response_mime_type=response_mime,
                max_output_tokens=max_tokens,
            ),
        )

        reply_text = (result.text or "").strip()
        print("Gemini reply:\n", reply_text)

        # SCRIPT MODE: parse/repair -> salvage -> retry -> salvage
        if is_script:
            # 1) parse/repair
            try:
                flow = safe_parse_json_array(reply_text)
                validate_flow(flow)
                return {"ok": True, "flow": flow}
            except Exception:
                # 2) salvage partial JSON
                try:
                    flow_partial = salvage_flow_from_partial_json(reply_text)
                    validate_flow(flow_partial)
                    return {"ok": True, "flow": flow_partial, "partial": True}
                except Exception:
                    pass

                # 3) retry once with stricter + shorter instruction
                retry_prompt = (
                    system_prompt
                    + "\n\nIMPORTANT: Return ONLY valid JSON. Do not truncate. End with a closing ]."
                    + "\nMaximum 10 blocks total."
                )

                result2 = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=retry_prompt,
                        temperature=0.1,
                        response_mime_type="application/json",
                        max_output_tokens=3500,
                    ),
                )

                retry_text = (result2.text or "").strip()
                print("Gemini retry reply:\n", retry_text)

                # 4) parse retry
                try:
                    flow2 = safe_parse_json_array(retry_text)
                    validate_flow(flow2)
                    return {"ok": True, "flow": flow2}
                except Exception:
                    # 5) salvage retry
                    flow2_partial = salvage_flow_from_partial_json(retry_text)
                    validate_flow(flow2_partial)
                    return {"ok": True, "flow": flow2_partial, "partial": True}

        # NORMAL MODES
        return {"ok": True, "reply": reply_text}

    except Exception as e:
        err = str(e)
        print("ERROR calling Gemini:", err)
        return {"ok": False, "error": err, "reply": ""}


@app.get("/health")
def health():
    return {"ok": True}

