import React, { useRef, useState } from "react";

const PRESETS = [
  {
    id: "calm_2min",
    label: "2-min Calm Breathing",
    text:
      "Find a comfortable position. Gently close your eyes. " +
      "Inhale through your nose for four… 1…2…3…4. " +
      "Hold for two… 1…2. " +
      "Exhale slowly for six… 1…2…3…4…5…6. " +
      "Let your shoulders drop. " +
      "Repeat this rhythm. If your mind wanders, return to counting the breath. " +
      "One more round… inhale… hold… exhale… and soften.",
  },
  {
    id: "sleep_winddown",
    label: "Sleep Wind-Down",
    text:
      "Lie down comfortably. Unclench your jaw. " +
      "Breathe in gently… and breathe out a little longer. " +
      "Feel the bed supporting you. " +
      "With each exhale, release the day. " +
      "If thoughts come, let them drift past and return to the breath. " +
      "You are safe to rest.",
  },
];

export default function MeditationPlayer() {
  const audioRef = useRef(null);

  // mode: "preset" or "custom"
  const [mode, setMode] = useState("preset");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // custom inputs
  const [issue, setIssue] = useState("I feel anxious at night and can’t sleep");
  const [minutes, setMinutes] = useState(5);
  const [tone, setTone] = useState("calm");
  const [style, setStyle] = useState("breathing + grounding");

  async function fetchWithTimeout(url, options, ms = 90000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  async function playTextViaTTS(text) {
    setStatus("Converting to audio…");

    const res = await fetchWithTimeout(
      "http://127.0.0.1:8000/tts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      },
      90000
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`TTS failed (${res.status}): ${msg}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = url;

    setStatus("Playing…");
    await audioRef.current.play();
    setStatus("");
  }

  async function playPreset(presetText) {
    setLoading(true);
    try {
      await playTextViaTTS(presetText);
    } catch (e) {
      console.error(e);
      alert(String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function generateCustomAndPlay() {
    setLoading(true);
    setStatus("Generating custom script…");

    try {
      const genRes = await fetchWithTimeout(
        "http://127.0.0.1:8000/custom_meditation_script",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issue, minutes, tone, style }),
        },
        90000
      );

      if (!genRes.ok) {
        const msg = await genRes.text();
        throw new Error(`Custom script failed (${genRes.status}): ${msg}`);
      }

      const { text } = await genRes.json();
      if (!text) throw new Error("Custom script returned empty text");

      await playTextViaTTS(text);
    } catch (e) {
      console.error(e);
      alert(String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setStatus("");
    setLoading(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, display: "grid", gap: 16 }}>
      <h2>Meditation</h2>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setMode("preset")} disabled={loading}>
          Premade
        </button>
        <button onClick={() => setMode("custom")} disabled={loading}>
          Custom (AI)
        </button>
        <button onClick={stop}>Stop</button>
        <span style={{ opacity: 0.75 }}>{status}</span>
      </div>

      {mode === "preset" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <h3>Pick a premade script</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => playPreset(p.text)} disabled={loading}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <h3>Tell the AI what you’re dealing with</h3>

          <label style={{ display: "grid", gap: 6 }}>
            Your issue (what you want help with)
            <textarea
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. I’m stressed about exams and can’t relax"
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label>
              Minutes{" "}
              <input
                type="number"
                min={1}
                max={20}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>

            <label>
              Tone{" "}
              <input value={tone} onChange={(e) => setTone(e.target.value)} />
            </label>

            <label>
              Style{" "}
              <input value={style} onChange={(e) => setStyle(e.target.value)} />
            </label>
          </div>

          <button onClick={generateCustomAndPlay} disabled={loading}>
            {loading ? "Working..." : "Generate & Play"}
          </button>
        </div>
      )}

      <audio ref={audioRef} controls style={{ width: "100%" }} />
    </div>
  );
}