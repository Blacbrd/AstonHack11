// src/pages/MeditationPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen2";
import BreathButton from "../components/BreathButton";
import "./MeditationPage.css";

const FINISH_LINE =
  "Congrats on finishing your meditation session. See you tomorrow!";

const SESSION_5_MIN = 5 * 60 * 1000;
const SESSION_10_MIN = 10 * 60 * 1000;
const SESSION_15_MIN = 15 * 60 * 1000;

// Flow-based: speak blocks spend TTS credits, breathe blocks are silent + visual only.
const FLOW = [
  { type: "speak", text: "Welcome. Get comfortable. Sit or lie down where your body can relax." },
  { type: "speak", text: "Let your hands rest naturally. Allow your eyes to gently close, or soften your gaze." },

  { type: "breathe", pattern: { inhale: 4000, hold: 1000, exhale: 4000 }, cycles: 3 },

  { type: "speak", text: "Now allow the breath to return to a natural rhythm. No need to control it." },
  { type: "speak", text: "Notice your forehead. Let it soften. Relax around the eyes. Unclench the jaw." },
  { type: "speak", text: "Let the shoulders drop. Feel them become heavier, supported." },

  { type: "breathe", pattern: { inhale: 4000, exhale: 6000 }, durationMs: 60_000 },

  { type: "speak", text: "If your mind wanders, that’s normal. Notice it kindly and return to the next breath." },
  { type: "speak", text: "Feel the points of contact where your body is supported by the surface beneath you." },

  { type: "breathe", pattern: { inhale: 3000, hold: 1000, exhale: 5000 }, cycles: 4 },

  { type: "speak", text: "Take a few quiet moments. Breathing in… and breathing out…" },

  { type: "breathe", pattern: { inhale: 4000, exhale: 6000 }, durationMs: 45_000 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatMMSS = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function MeditationPage() {
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const finishLockRef = useRef(false);
  const runIdRef = useRef(0);

  const timerIntervalRef = useRef(null);
  const hardStopRef = useRef(null);
  const sessionMsRef = useRef(SESSION_5_MIN);
  const startTimeRef = useRef(0);

  const [step, setStep] = useState("select"); // select | loading | session | finished
  const [error, setError] = useState("");

  const [remainingMs, setRemainingMs] = useState(SESSION_5_MIN);

  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState(null);

  const [caption, setCaption] = useState("");

  const stopAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    a.removeAttribute("src");
    a.load();
  };

  const playTTS = async (text, runId) => {
    if (finishLockRef.current || runIdRef.current !== runId) return;

    setCaption(text);

    const res = await fetch("http://localhost:8000/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      setCaption("");
      throw new Error(await res.text());
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = audioRef.current;
    if (!a) {
      URL.revokeObjectURL(url);
      setCaption("");
      return;
    }

    stopAudio();
    a.src = url;
    a.load();
    await a.play();

    await new Promise((resolve) => {
      const onEnded = () => {
        a.removeEventListener("ended", onEnded);
        URL.revokeObjectURL(url);
        setCaption("");
        resolve();
      };
      a.addEventListener("ended", onEnded);
    });
  };

  const runBreathing = async (item, runId) => {
    const { pattern, cycles, durationMs } = item;

    setBreathActive(true);

    const start = Date.now();
    let completed = 0;

    const phase = async (name, ms) => {
      if (!ms) return;
      if (finishLockRef.current || runIdRef.current !== runId) return;
      setBreathPhase(name);
      await sleep(ms);
    };

    while (true) {
      if (finishLockRef.current || runIdRef.current !== runId) break;
      if (typeof cycles === "number" && completed >= cycles) break;
      if (typeof durationMs === "number" && Date.now() - start >= durationMs) break;

      await phase("inhale", pattern.inhale);
      if (pattern.hold) await phase("hold", pattern.hold);
      await phase("exhale", pattern.exhale);

      completed += 1;
    }

    setBreathPhase(null);
    setBreathActive(false);
  };

  const playFlow = async (runId) => {
    try {
      for (const item of FLOW) {
        if (finishLockRef.current || runIdRef.current !== runId) return;

        if (item.type === "speak") {
          setBreathActive(false);
          setBreathPhase(null);
          await playTTS(item.text, runId);
        }

        if (item.type === "breathe") {
          await runBreathing(item, runId);
        }
      }

      if (!finishLockRef.current && runIdRef.current === runId) {
        const elapsed = Date.now() - startTimeRef.current;
        const paddingTime = sessionMsRef.current - elapsed;

        if (paddingTime > 2000) {
          setCaption("Continue breathing at your own pace...");
          setBreathActive(true);
          await sleep(paddingTime);
          setBreathActive(false);
        }
      }

      if (!finishLockRef.current && runIdRef.current === runId) {
        if (hardStopRef.current) clearTimeout(hardStopRef.current);

        await playTTS(FINISH_LINE, runId);
        setStep("finished");
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
      setStep("select");
      stopAudio();
      setCaption("");
    }
  };

  const startSession = (sessionMs) => {
    setError("");
    setStep("loading");

    runIdRef.current += 1;
    const runId = runIdRef.current;

    finishLockRef.current = false;
    sessionMsRef.current = sessionMs;
    startTimeRef.current = Date.now();

    const start = Date.now();
    setRemainingMs(sessionMs);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(sessionMs - elapsed, 0);
      setRemainingMs(left);
      if (left <= 0) clearInterval(timerIntervalRef.current);
    }, 250);

    hardStopRef.current = setTimeout(() => {
      if (step !== "finished") {
        finishLockRef.current = true;
        stopAudio();
        setCaption("");
        setStep("finished");
      }
    }, sessionMs + 15000);

    setTimeout(() => {
      if (finishLockRef.current || runIdRef.current !== runId) return;
      setStep("session");
      playFlow(runId);
    }, 150);
  };

  const quitEarly = () => {
    finishLockRef.current = true;
    clearInterval(timerIntervalRef.current);
    if (hardStopRef.current) clearTimeout(hardStopRef.current);
    stopAudio();
    setCaption("");
    setStep("select");
  };

  useEffect(() => {
    return () => {
      finishLockRef.current = true;
      clearInterval(timerIntervalRef.current);
      if (hardStopRef.current) clearTimeout(hardStopRef.current);
      stopAudio();
      setCaption("");
    };
  }, []);

  let content = null;

  if (step === "loading") {
    content = (
      <div className="medPage">
        <div className="medBg" />
        <div className="medRays" />
        <div className="medSeaweed">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
            <g className="medSway medD1">
              <path className="medThick" d="M40,700 C90,560 20,460 70,320 C110,200 90,120 120,0" />
              <path className="medThin" d="M90,700 C140,560 80,470 120,330 C160,210 140,140 160,0" />
              <path className="medThin" d="M160,700 C210,560 150,470 190,340 C240,220 220,150 240,0" />
            </g>

            <g className="medSway medD2">
              <path className="medThick" d="M1040,700 C990,560 1060,460 1010,320 C970,200 990,120 960,0" />
              <path className="medThin" d="M1090,700 C1040,560 1100,470 1060,330 C1020,210 1040,140 1020,0" />
              <path className="medThin" d="M980,700 C930,560 990,470 950,340 C900,220 920,150 900,0" />
            </g>
          </svg>
        </div>

        <div className="medContent">
          <LoadingScreen message="Preparing your meditation..." />
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  if (step === "select") {
    content = (
      <div className="medPage">
        <div className="medBg" />
        <div className="medRays" />
        <div className="medSeaweed">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
            <g className="medSway medD1">
              <path className="medThick" d="M40,700 C90,560 20,460 70,320 C110,200 90,120 120,0" />
              <path className="medThin" d="M90,700 C140,560 80,470 120,330 C160,210 140,140 160,0" />
              <path className="medThin" d="M160,700 C210,560 150,470 190,340 C240,220 220,150 240,0" />
            </g>

            <g className="medSway medD2">
              <path className="medThick" d="M1040,700 C990,560 1060,460 1010,320 C970,200 990,120 960,0" />
              <path className="medThin" d="M1090,700 C1040,560 1100,470 1060,330 C1020,210 1040,140 1020,0" />
              <path className="medThin" d="M980,700 C930,560 990,470 950,340 C900,220 920,150 900,0" />
            </g>
          </svg>
        </div>

        <div className="medContent">
          <div className="medWrap">
            <button className="medBackBtn" onClick={() => navigate("/")}>
              ← Back
            </button>

            <h1 className="medTitle">Meditation</h1>

            <div className="medButtons">
              <button className="medBtn" onClick={() => startSession(SESSION_5_MIN)}>5 minutes</button>
              <button className="medBtn" onClick={() => startSession(SESSION_10_MIN)}>10 minutes</button>
              <button className="medBtn" onClick={() => startSession(SESSION_15_MIN)}>15 minutes</button>
            </div>

            {error && <pre className="medError">{error}</pre>}
          </div>
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  if (step === "session") {
    content = (
      <div className="medPage">
        <div className="medBg" />
        <div className="medRays" />
        <div className="medSeaweed">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
            <g className="medSway medD1">
              <path className="medThick" d="M40,700 C90,560 20,460 70,320 C110,200 90,120 120,0" />
              <path className="medThin" d="M90,700 C140,560 80,470 120,330 C160,210 140,140 160,0" />
              <path className="medThin" d="M160,700 C210,560 150,470 190,340 C240,220 220,150 240,0" />
            </g>

            <g className="medSway medD2">
              <path className="medThick" d="M1040,700 C990,560 1060,460 1010,320 C970,200 990,120 960,0" />
              <path className="medThin" d="M1090,700 C1040,560 1100,470 1060,330 C1020,210 1040,140 1020,0" />
              <path className="medThin" d="M980,700 C930,560 990,470 950,340 C900,220 920,150 900,0" />
            </g>
          </svg>
        </div>

        <div className="medContent">
          <div className="medWrap">
            <div className="medTopRow">
              <div className="medTimer">{formatMMSS(remainingMs)}</div>

              <h2 className="medH2">
                {Math.round(sessionMsRef.current / 60000)}-minute meditation
              </h2>

              <button className="medQuitBtn" onClick={quitEarly}>
                Quit
              </button>
            </div>

            {caption && (
              <div className="medCaption">
                {caption}
              </div>
            )}

            <div className="medBreathWrap">
              <BreathButton
                active={breathActive}
                phase={breathPhase}
                inhaleMs={4000}
                exhaleMs={6000}
              />
            </div>
          </div>
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  if (step === "finished") {
    content = (
      <div className="medPage">
        <div className="medBg" />
        <div className="medRays" />
        <div className="medSeaweed">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
            <g className="medSway medD1">
              <path className="medThick" d="M40,700 C90,560 20,460 70,320 C110,200 90,120 120,0" />
              <path className="medThin" d="M90,700 C140,560 80,470 120,330 C160,210 140,140 160,0" />
              <path className="medThin" d="M160,700 C210,560 150,470 190,340 C240,220 220,150 240,0" />
            </g>

            <g className="medSway medD2">
              <path className="medThick" d="M1040,700 C990,560 1060,460 1010,320 C970,200 990,120 960,0" />
              <path className="medThin" d="M1090,700 C1040,560 1100,470 1060,330 C1020,210 1040,140 1020,0" />
              <path className="medThin" d="M980,700 C930,560 990,470 950,340 C900,220 920,150 900,0" />
            </g>
          </svg>
        </div>

        <div className="medContent">
          <div className="medWrap">
            <h1 className="medTitle">Session complete</h1>
            <p className="medFinishText">{FINISH_LINE}</p>
            <button className="medBtn" onClick={() => setStep("select")}>
              Exit
            </button>
          </div>
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  return content;
}
