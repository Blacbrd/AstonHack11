import { useEffect, useRef, useState } from "react";

export default function BreathButton({
  size = 260,                // button diameter
  inhaleMs = 4000,           // inhale duration (used for smooth transitions)
  exhaleMs = 6000,           // exhale duration (used for smooth transitions)

  // Controlled mode (from MeditationPage):
  active = true,             // true during breathe blocks, false otherwise
  phase: externalPhase = null, // "inhale" | "hold" | "exhale" | null
}) {
  const [internalPhase, setInternalPhase] = useState("inhale"); // AUTO mode only
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // If parent passes phase, we are controlled
  const controlled = externalPhase !== null;

  // Visual phase mapping: treat "hold" as steady (no extra movement)
  const phase = controlled
    ? (externalPhase === "hold" ? "hold" : externalPhase)
    : internalPhase;

  // AUTO inhale/exhale loop only when NOT controlled and active
  useEffect(() => {
    clearTimer();

    if (controlled) return;
    if (!active) return;

    const ms = phase === "inhale" ? inhaleMs : exhaleMs;
    timerRef.current = setTimeout(() => {
      setInternalPhase((p) => (p === "inhale" ? "exhale" : "inhale"));
    }, ms);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, active, phase, inhaleMs, exhaleMs]);

  useEffect(() => clearTimer, []);

  const ringSize = size + 54;
  const dotOrbit = ringSize / 2 - 8;

  // Freeze visuals when inactive (during speak blocks)
  const innerScale = !active
    ? 0.92
    : phase === "inhale"
      ? 1.0
      : phase === "exhale"
        ? 0.86
        : 0.95; // hold

  const haloScale = !active
    ? 0.95
    : phase === "inhale"
      ? 1.02
      : phase === "exhale"
        ? 0.92
        : 0.98; // hold

  const transitionMs =
    phase === "inhale" ? inhaleMs : exhaleMs;

  const dotRotation =
    phase === "inhale" ? 40 : phase === "exhale" ? 220 : 130; // hold mid-point

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: ringSize,
          height: ringSize,
          cursor: "default",
          opacity: active ? 1 : 0.55,
        }}
        aria-label="Breathing button"
        role="button"
      >
        {/* Outer ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.22)",
          }}
        />

        {/* Orbit dot */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            transform: `translate(-50%, -50%) rotate(${dotRotation}deg) translateX(${dotOrbit}px)`,
            transition: active ? "transform 600ms ease" : "none",
            boxShadow: "0 0 12px rgba(255,255,255,0.25)",
          }}
        />

        {/* Inner breathing circle */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size,
            height: size,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${innerScale})`,
            transition: active ? `transform ${transitionMs}ms linear` : "none",
            background:
              "radial-gradient(circle at 30% 30%, rgba(140,255,230,0.95), rgba(120,140,255,0.9) 70%)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
          }}
        />

        {/* Soft halo */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size + 34,
            height: size + 34,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${haloScale})`,
            transition: active ? `transform ${transitionMs}ms linear` : "none",
            background: "rgba(120, 200, 255, 0.06)",
            filter: "blur(2px)",
          }}
        />
      </div>
    </div>
  );
}
