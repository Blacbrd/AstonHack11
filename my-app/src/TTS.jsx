import { useRef, useState } from "react";

export default function TTS() {
  const audioRef = useRef(null);
  const [text, setText] = useState("Hello from ElevenLabs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const speak = async () => {
    setError("");
    if (!text.trim()) {
      setError("Type something first.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const err = await res.text();
        setError(err);
        return;
      }

      const blob = await res.blob();
      if (!blob.type.includes("audio")) {
        setError(`Expected audio, got: ${blob.type}`);
        return;
      }

      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;

      await audioRef.current.play();

      audioRef.current.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520, margin: "0 auto" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type what you want it to say…"
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #444",
          background: "transparent",
          color: "white",
          fontSize: 16,
        }}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={speak} disabled={loading}>
          {loading ? "Speaking..." : "Speak"}
        </button>

        <audio ref={audioRef} controls style={{ flex: 1 }} />
      </div>

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: 14, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}
    </div>
  );
}
