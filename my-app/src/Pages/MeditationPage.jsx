import { useEffect, useRef, useState } from "react";
import LoadingScreen from "../components/LoadingScreen2";
import BreathButton from "../components/BreathButton";

const FINISH_LINE = "Congrats on finishing your meditation session. See you tomorrow!";

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
  const audioRef = useRef(null);

  const finishLockRef = useRef(false);
  const runIdRef = useRef(0);

  const timerIntervalRef = useRef(null);
  const hardStopRef = useRef(null);
  const sessionMsRef = useRef(SESSION_5_MIN);

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

    const res = await fetch("http://localhost:5000/tts", {
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

      if (!finishLockRef.current) {
        await playTTS(FINISH_LINE, runId);
        setStep("finished");
      }
    } catch (e) {
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

    const start = Date.now();
    setRemainingMs(sessionMs);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setRemainingMs(Math.max(sessionMs - elapsed, 0));
    }, 250);

    hardStopRef.current = setTimeout(() => {
      finishLockRef.current = true;
      stopAudio();
      setCaption("");
      setStep("finished");
    }, sessionMs);

    setTimeout(() => {
      if (finishLockRef.current || runIdRef.current !== runId) return;
      setStep("session");
      playFlow(runId);
    }, 150);
  };

  const quitEarly = () => {
    finishLockRef.current = true;
    clearInterval(timerIntervalRef.current);
    clearTimeout(hardStopRef.current);
    stopAudio();
    setCaption("");
    setStep("select");
  };

  useEffect(() => {
    return () => {
      finishLockRef.current = true;
      clearInterval(timerIntervalRef.current);
      clearTimeout(hardStopRef.current);
      stopAudio();
      setCaption("");
    };
  }, []);

  // ---------- UI ----------
  let content = null;

  if (step === "loading") {
    content = <LoadingScreen message="Preparing your meditation..." />;
  }

  if (step === "select") {
    content = (
      <div style={{ maxWidth: 900, margin: "48px auto", padding: "0 16px" }}>
        <h1>Meditation</h1>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button onClick={() => startSession(SESSION_5_MIN)}>5 minutes</button>
          <button onClick={() => startSession(SESSION_10_MIN)}>10 minutes</button>
          <button onClick={() => startSession(SESSION_15_MIN)}>15 minutes</button>
        </div>

        {error && <pre style={{ color: "#ff6b6b" }}>{error}</pre>}
      </div>
    );
  }

  if (step === "session") {
    content = (
      <div style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
            {formatMMSS(remainingMs)}
          </div>

          <h2 style={{ margin: 0 }}>
            {Math.round(sessionMsRef.current / 60000)}-minute meditation
          </h2>

          <button onClick={quitEarly}>Quit</button>
        </div>

        {caption && (
          <div
            style={{
              marginTop: 16,
              marginBottom: 12,
              padding: "12px 16px",
              textAlign: "center",
              fontSize: 16,
              lineHeight: 1.5,
              background: "rgba(0,0,0,0.35)",
              borderRadius: 12,
              color: "#fff",
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {caption}
          </div>
        )}

        <BreathButton
          active={breathActive}
          phase={breathPhase}
          inhaleMs={4000}
          exhaleMs={6000}
        />
      </div>
    );
  }

  if (step === "finished") {
    content = (
      <div style={{ maxWidth: 900, margin: "48px auto", padding: "0 16px" }}>
        <h1>Session complete</h1>
        <p>{FINISH_LINE}</p>
        <button onClick={() => setStep("select")}>Exit</button>
      </div>
    );
  }

  return (
    <>
      {content}
      <audio ref={audioRef} />
    </>
  );
}
