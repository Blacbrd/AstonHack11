import React from 'react'
import { useNavigate } from 'react-router-dom'

function PuzzlePiece({
  x,
  y,
  rot = 0,
  s = 1,
  fill = 'rgba(253, 230, 138, 0.92)',
  stroke = 'rgba(0,0,0,0.55)'
}) {
  // Round "suction cup"
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx="0" cy="0" r="1.05" fill={fill} stroke={stroke} strokeWidth="0.25" />
      <circle
        cx="0.05"
        cy="0.05"
        r="0.55"
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.18"
      />
      <circle cx="-0.35" cy="-0.35" r="0.18" fill="rgba(255,255,255,0.55)" />
    </g>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  const HoverButton = ({ onClick, disabled, children }) => {
    const [hover, setHover] = React.useState(false)
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: '12px 16px',
          borderRadius: 999,
          border: disabled ? '1px solid rgba(255,255,255,0.18)' : '2px solid rgba(34,197,94,0.9)',
          background: disabled
            ? 'rgba(255,255,255,0.04)'
            : hover
            ? 'rgba(34,197,94,0.16)'
            : 'rgba(34,197,94,0.10)',
          color: disabled ? 'rgba(255,255,255,0.45)' : 'white',
          fontWeight: 800,
          cursor: disabled ? 'not-allowed' : 'pointer',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          whiteSpace: 'nowrap'
        }}
      >
        {children}
      </button>
    )
  }

  const actions = [
    { label: '🧘 Yoga', route: '/yoga', disabled: false },
    { label: '📓 Journal', route: '/journal', disabled: false },
    { label: '🥗 Diet', route: '/diet', disabled: false },
    { label: '😴 Sleep', route: '/sleep', disabled: false }
  ]

  const tipButtons = [
    { x: 18, y: 40, label: '🧘 Yoga', route: '/yoga', disabled: false },
    { x: 82, y: 40, label: '📓 Journal', route: '/journal', disabled: false },
    { x: 12, y: 66, label: '🥗 Diet', route: '/diet', disabled: false },
    { x: 88, y: 66, label: '😴 Sleep', route: '/sleep', disabled: false },
    { x: 30, y: 86, label: '✨ Coming soon', route: null, disabled: true },
    { x: 70, y: 86, label: '✨ Coming soon', route: null, disabled: true }
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#06111c' }}>
      {/* ===== Background gradient + vignette ===== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(900px 500px at 20% 10%, rgba(56,189,248,0.18), transparent 60%),' +
            'radial-gradient(700px 500px at 80% 30%, rgba(34,197,94,0.10), transparent 55%),' +
            'linear-gradient(180deg, #06111c 0%, #041a2a 35%, #022236 70%, #011827 100%)'
        }}
      />

      {/* ===== Light rays ===== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.35,
          background:
            'repeating-linear-gradient(105deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.02) 60px, transparent 140px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))'
        }}
      />

      {/* ===== Underwater SVG overlay ===== */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="bubbleStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>

          <radialGradient id="octoGrad" cx="35%" cy="20%" r="85%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="55%" stopColor="#c76a10" />
            <stop offset="100%" stopColor="#8f4b0b" />
          </radialGradient>

          <radialGradient id="octoGlow" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <style>{`
            @keyframes floatUpA { 
              0% { transform: translateY(110%); opacity: 0; }
              10% { opacity: 0.55; }
              100% { transform: translateY(-140%); opacity: 0; }
            }
            @keyframes floatUpB { 
              0% { transform: translateY(120%); opacity: 0; }
              12% { opacity: 0.50; }
              100% { transform: translateY(-150%); opacity: 0; }
            }
            @keyframes sway { 
              0% { transform: translateX(0px); }
              50% { transform: translateX(6px); }
              100% { transform: translateX(0px); }
            }
            @keyframes bob {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-1.4px); }
              100% { transform: translateY(0px); }
            }
            @keyframes waveL {
              0% { transform: rotate(-1.2deg); }
              50% { transform: rotate(1.8deg); }
              100% { transform: rotate(-1.2deg); }
            }
            @keyframes waveR {
              0% { transform: rotate(1.2deg); }
              50% { transform: rotate(-1.8deg); }
              100% { transform: rotate(1.2deg); }
            }
            .bubbleA { animation: floatUpA 10s linear infinite; }
            .bubbleB { animation: floatUpB 13s linear infinite; }
            .sway { animation: sway 4.2s ease-in-out infinite; }
            .delay1 { animation-delay: 0.8s; }
            .delay2 { animation-delay: 2.1s; }
            .delay3 { animation-delay: 3.7s; }
            .delay4 { animation-delay: 5.0s; }
            .delay5 { animation-delay: 6.6s; }

            .octoBob { animation: bob 5.2s ease-in-out infinite; transform-origin: 50px 52px; }
            .waveL { animation: waveL 4.0s ease-in-out infinite; transform-origin: 50px 55px; }
            .waveR { animation: waveR 4.2s ease-in-out infinite; transform-origin: 50px 55px; }
          `}</style>
        </defs>

        {/* Bubbles */}
        {[
          { x: 10, r: 1.2, cls: 'bubbleA delay1' },
          { x: 18, r: 0.9, cls: 'bubbleB delay2' },
          { x: 28, r: 1.6, cls: 'bubbleA delay3' },
          { x: 40, r: 1.1, cls: 'bubbleB delay4' },
          { x: 52, r: 1.9, cls: 'bubbleA delay2' },
          { x: 64, r: 1.3, cls: 'bubbleB delay1' },
          { x: 76, r: 2.1, cls: 'bubbleA delay5' },
          { x: 88, r: 1.0, cls: 'bubbleB delay3' }
        ].map((b, i) => (
          <g key={i} className={b.cls} style={{ transformOrigin: `${b.x}px 100px` }}>
            <circle cx={b.x} cy="95" r={b.r} fill="rgba(255,255,255,0.06)" stroke="url(#bubbleStroke)" strokeWidth="0.25" />
            <circle cx={b.x - 0.4} cy="94.6" r={b.r * 0.25} fill="rgba(255,255,255,0.35)" />
          </g>
        ))}

        {/* Seaweed */}
        <g className="sway" opacity="0.9">
          <path d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" stroke="rgba(34,197,94,0.45)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" stroke="rgba(34,197,94,0.35)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M90 100 C88 88, 92 78, 88 66 C84 54, 90 46, 86 36" stroke="rgba(34,197,94,0.40)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M84 100 C82 90, 86 80, 82 70 C78 60, 83 50, 79 40" stroke="rgba(34,197,94,0.30)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>

        {/* Coral mound */}
        <path
          d="M0 100 C10 90, 18 92, 28 86 C38 80, 44 84, 52 78 C60 72, 70 78, 78 72 C86 66, 92 72, 100 66 L100 100 Z"
          fill="rgba(255,255,255,0.05)"
        />

        {/* ===== Octopus ===== */}
        <g className="octoBob">
          {/* OUTWARD arms (upper + lower) */}
          <g className="waveL">
            {/* left-upper (OUTWARD) */}
            <path
              d="M46 56
                 C34 48, 22 38, 10 36
                 C2 35, 0 46, 6 56
                 C12 66, 22 64, 30 58"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M46 56
                 C34 48, 22 38, 10 36
                 C2 35, 0 46, 6 56
                 C12 66, 22 64, 30 58"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 43.0, y: 55.6, r: -10 },
              { x: 40.8, y: 54.6, r: -12 },
              { x: 38.6, y: 53.5, r: -14 },
              { x: 36.4, y: 52.3, r: -16 },
              { x: 34.2, y: 51.1, r: -18 },
              { x: 32.0, y: 49.8, r: -16 },
              { x: 29.8, y: 48.6, r: -14 },
              { x: 27.6, y: 47.6, r: -12 },
              { x: 25.4, y: 46.7, r: -10 },
              { x: 23.2, y: 46.3, r: -6 },
              { x: 21.0, y: 46.2, r: 2 },
              { x: 18.8, y: 46.8, r: 10 },
              { x: 16.8, y: 48.0, r: 14 },
              { x: 14.8, y: 49.8, r: 16 },
              { x: 13.0, y: 52.0, r: 18 },
              { x: 12.0, y: 55.0, r: 22 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}

            {/* left-lower (OUTWARD) */}
            <path
              d="M47 62
                 C35 66, 24 74, 17 84
                 C12 92, 18 98, 28 95
                 C38 92, 40 84, 34 78"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M47 62
                 C35 66, 24 74, 17 84
                 C12 92, 18 98, 28 95
                 C38 92, 40 84, 34 78"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 44.0, y: 63.0, r: -8 },
              { x: 41.8, y: 64.0, r: -10 },
              { x: 39.6, y: 65.1, r: -12 },
              { x: 37.4, y: 66.3, r: -14 },
              { x: 35.2, y: 67.8, r: -16 },
              { x: 33.0, y: 69.5, r: -18 },
              { x: 30.8, y: 71.4, r: -20 },
              { x: 28.8, y: 73.6, r: -18 },
              { x: 26.8, y: 76.0, r: -14 },
              { x: 24.8, y: 78.6, r: -10 },
              { x: 22.8, y: 81.4, r: -6 },
              { x: 21.0, y: 84.2, r: 2 },
              { x: 20.0, y: 87.0, r: 10 },
              { x: 20.5, y: 90.0, r: 16 },
              { x: 23.0, y: 92.8, r: 20 },
              { x: 26.0, y: 93.8, r: 22 },
              { x: 29.0, y: 93.0, r: 18 },
              { x: 32.0, y: 90.8, r: 10 },
              { x: 34.0, y: 87.8, r: 2 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}
          </g>

          <g className="waveR">
            {/* right-upper (OUTWARD) */}
            <path
              d="M54 56
                 C66 48, 78 38, 90 36
                 C98 35, 100 46, 94 56
                 C88 66, 78 64, 70 58"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M54 56
                 C66 48, 78 38, 90 36
                 C98 35, 100 46, 94 56
                 C88 66, 78 64, 70 58"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 57.0, y: 55.6, r: 10 },
              { x: 59.2, y: 54.6, r: 12 },
              { x: 61.4, y: 53.5, r: 14 },
              { x: 63.6, y: 52.3, r: 16 },
              { x: 65.8, y: 51.1, r: 18 },
              { x: 68.0, y: 49.8, r: 16 },
              { x: 70.2, y: 48.6, r: 14 },
              { x: 72.4, y: 47.6, r: 12 },
              { x: 74.6, y: 46.7, r: 10 },
              { x: 76.8, y: 46.3, r: 6 },
              { x: 79.0, y: 46.2, r: -2 },
              { x: 81.2, y: 46.8, r: -10 },
              { x: 83.2, y: 48.0, r: -14 },
              { x: 85.2, y: 49.8, r: -16 },
              { x: 87.0, y: 52.0, r: -18 },
              { x: 88.0, y: 55.0, r: -22 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}

            {/* right-lower (OUTWARD) */}
            <path
              d="M53 62
                 C65 66, 76 74, 83 84
                 C88 92, 82 98, 72 95
                 C62 92, 60 84, 66 78"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M53 62
                 C65 66, 76 74, 83 84
                 C88 92, 82 98, 72 95
                 C62 92, 60 84, 66 78"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 56.0, y: 63.0, r: 8 },
              { x: 58.2, y: 64.0, r: 10 },
              { x: 60.4, y: 65.1, r: 12 },
              { x: 62.6, y: 66.3, r: 14 },
              { x: 64.8, y: 67.8, r: 16 },
              { x: 67.0, y: 69.5, r: 18 },
              { x: 69.2, y: 71.4, r: 20 },
              { x: 71.2, y: 73.6, r: 18 },
              { x: 73.2, y: 76.0, r: 14 },
              { x: 75.2, y: 78.6, r: 10 },
              { x: 77.2, y: 81.4, r: 6 },
              { x: 79.0, y: 84.2, r: -2 },
              { x: 80.0, y: 87.0, r: -10 },
              { x: 79.5, y: 90.0, r: -16 },
              { x: 77.0, y: 92.8, r: -20 },
              { x: 74.0, y: 93.8, r: -22 },
              { x: 71.0, y: 93.0, r: -18 },
              { x: 68.0, y: 90.8, r: -10 },
              { x: 66.0, y: 87.8, r: -2 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}
          </g>

          {/* Middle tentacles (keep inward/down) */}
          <g className="waveL">
            <path
              d="M49 64 C44 70, 42 77, 44 83 C46 89, 52 90, 52 84 C52 78, 47 78, 47 73"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M49 64 C44 70, 42 77, 44 83 C46 89, 52 90, 52 84 C52 78, 47 78, 47 73"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 48.8, y: 66.2, r: -8 },
              { x: 47.6, y: 68.2, r: -10 },
              { x: 46.6, y: 70.3, r: -12 },
              { x: 45.8, y: 72.6, r: -14 },
              { x: 45.6, y: 74.9, r: -12 },
              { x: 45.8, y: 77.2, r: -8 },
              { x: 46.6, y: 79.3, r: 2 },
              { x: 48.0, y: 81.2, r: 10 },
              { x: 49.6, y: 83.0, r: 16 },
              { x: 51.0, y: 84.8, r: 20 },
              { x: 51.8, y: 86.6, r: 22 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}
          </g>

          <g className="waveR">
            <path
              d="M51 64 C56 70, 58 77, 56 83 C54 89, 48 90, 48 84 C48 78, 53 78, 53 73"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M51 64 C56 70, 58 77, 56 83 C54 89, 48 90, 48 84 C48 78, 53 78, 53 73"
              fill="none"
              stroke="url(#octoGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[
              { x: 51.2, y: 66.2, r: 8 },
              { x: 52.4, y: 68.2, r: 10 },
              { x: 53.4, y: 70.3, r: 12 },
              { x: 54.2, y: 72.6, r: 14 },
              { x: 54.4, y: 74.9, r: 12 },
              { x: 54.2, y: 77.2, r: 8 },
              { x: 53.4, y: 79.3, r: -2 },
              { x: 52.0, y: 81.2, r: -10 },
              { x: 50.4, y: 83.0, r: -16 },
              { x: 49.0, y: 84.8, r: -20 },
              { x: 48.2, y: 86.6, r: -22 }
            ].map((p, idx) => (
              <PuzzlePiece key={idx} x={p.x} y={p.y} rot={p.r} s={0.55} />
            ))}
          </g>

          {/* Head */}
          <path
            d="
              M50 26
              C40 26, 34 34, 34 44
              C34 56, 41 66, 50 66
              C59 66, 66 56, 66 44
              C66 34, 60 26, 50 26
              Z
            "
            fill="url(#octoGrad)"
            stroke="rgba(0,0,0,0.65)"
            strokeWidth="2.4"
          />
          <ellipse cx="50" cy="48" rx="19" ry="17" fill="url(#octoGlow)" opacity="0.55" />

          {/* Spots */}
          {[
            { x: 41.5, y: 38.5, r: 1.2, o: 0.9 },
            { x: 44.5, y: 36.0, r: 0.9, o: 0.8 },
            { x: 58.2, y: 38.0, r: 1.1, o: 0.85 },
            { x: 55.5, y: 36.2, r: 0.8, o: 0.75 },
            { x: 39.2, y: 43.5, r: 0.8, o: 0.7 },
            { x: 60.7, y: 43.8, r: 0.8, o: 0.7 }
          ].map((s, idx) => (
            <circle key={idx} cx={s.x} cy={s.y} r={s.r} fill="rgba(120, 55, 10, 0.95)" opacity={s.o} />
          ))}

          {/* Eyebrows REMOVED */}

          {/* Eyes */}
          <g>
            <ellipse cx="44.5" cy="49" rx="4.3" ry="4.8" fill="white" />
            <circle cx="45.4" cy="49.6" r="2.0" fill="#0b0f14" />
            <circle cx="46.0" cy="48.9" r="0.6" fill="white" />

            <ellipse cx="55.5" cy="49" rx="4.3" ry="4.8" fill="white" />
            <circle cx="54.6" cy="49.6" r="2.0" fill="#0b0f14" />
            <circle cx="55.2" cy="48.9" r="0.6" fill="white" />
          </g>

          {/* Smile */}
          <path
            d="M44.2 56.2 Q50 60 55.8 56.2"
            stroke="#0b0f14"
            strokeWidth="2.0"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* ===== Foreground content ===== */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24
        }}
      >
        <div
          style={{
            width: 'min(980px, 92vw)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: 18,
            alignItems: 'center'
          }}
        >
          {/* Left: title */}
          <div
            style={{
              padding: 24,
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)'
            }}
          >
            <h1 style={{ margin: 0, fontSize: 56, letterSpacing: '-0.02em' }}>Wellness Hub</h1>
            <p style={{ marginTop: 10, opacity: 0.72, maxWidth: 520, lineHeight: 1.5 }}>
              Pick a tentacle to grow. Track habits across sleep, diet, journaling, and movement.
            </p>

            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', opacity: 0.9 }}>
                🫧 Calm UI
              </span>
              <span style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', opacity: 0.9 }}>
                🌊 Underwater vibe
              </span>
              <span style={{ padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', opacity: 0.9 }}>
                🧠 Habit tracking
              </span>
            </div>
          </div>

          {/* Right: navigation panel */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              display: 'grid',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, opacity: 0.9 }}>Sections</h2>
              <span style={{ fontSize: 12, opacity: 0.6 }}>pick one</span>
            </div>

            {actions.map((a) => (
              <HoverButton key={a.label} disabled={a.disabled} onClick={() => !a.disabled && navigate(a.route)}>
                {a.label}
              </HoverButton>
            ))}

            <button
              disabled
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 800,
                cursor: 'not-allowed'
              }}
              title="Coming soon"
            >
              👥 Social (soon)
            </button>
          </div>
        </div>

        {/* Floating tentacle-tip buttons */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {tipButtons.map((b, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                top: `${b.y}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto'
              }}
            >
              <HoverButton
                disabled={b.disabled}
                onClick={() => {
                  if (!b.disabled && b.route) navigate(b.route)
                }}
              >
                {b.label}
              </HoverButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

