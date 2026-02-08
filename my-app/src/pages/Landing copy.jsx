import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  const cardBtn = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  }

  const cardBtnHover = {
    background: 'rgba(255,255,255,0.12)'
  }

  // tiny helper for hover without external CSS
  const HoverButton = ({ onClick, left, right }) => {
    const [hover, setHover] = React.useState(false)
    return (
      <button
        onClick={onClick}
        style={{ ...cardBtn, ...(hover ? cardBtnHover : null) }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {left}
        </span>
        <span style={{ opacity: 0.8 }}>{right}</span>
      </button>
    )
  }

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

      {/* ===== Bubbles (SVG overlay) ===== */}
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

          {/* Bubble float animations */}
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
            .bubbleA { animation: floatUpA 10s linear infinite; }
            .bubbleB { animation: floatUpB 13s linear infinite; }
            .sway { animation: sway 4.2s ease-in-out infinite; }
            .delay1 { animation-delay: 0.8s; }
            .delay2 { animation-delay: 2.1s; }
            .delay3 { animation-delay: 3.7s; }
            .delay4 { animation-delay: 5.0s; }
            .delay5 { animation-delay: 6.6s; }
          `}</style>
        </defs>

        {/* Bubble groups placed across the scene */}
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

        {/* A couple larger “foreground” bubbles */}
        <g className="bubbleB delay4">
          <circle cx="33" cy="98" r="3.2" fill="rgba(255,255,255,0.05)" stroke="url(#bubbleStroke)" strokeWidth="0.35" />
          <circle cx="31.8" cy="96.8" r="0.9" fill="rgba(255,255,255,0.25)" />
        </g>
        <g className="bubbleA delay5">
          <circle cx="71" cy="102" r="4.2" fill="rgba(255,255,255,0.04)" stroke="url(#bubbleStroke)" strokeWidth="0.4" />
          <circle cx="69.6" cy="100.4" r="1.0" fill="rgba(255,255,255,0.22)" />
        </g>

        {/* ===== Seaweed + coral at bottom ===== */}
        <g className="sway" opacity="0.9">
          {/* seaweed left */}
          <path
            d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36"
            stroke="rgba(34,197,94,0.45)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40"
            stroke="rgba(34,197,94,0.35)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />

          {/* seaweed right */}
          <path
            d="M90 100 C88 88, 92 78, 88 66 C84 54, 90 46, 86 36"
            stroke="rgba(34,197,94,0.40)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M84 100 C82 90, 86 80, 82 70 C78 60, 83 50, 79 40"
            stroke="rgba(34,197,94,0.30)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* coral mound */}
        <path
          d="M0 100 C10 90, 18 92, 28 86 C38 80, 44 84, 52 78 C60 72, 70 78, 78 72 C86 66, 92 72, 100 66 L100 100 Z"
          fill="rgba(255,255,255,0.05)"
        />
        <path
          d="M6 100 C14 94, 20 96, 28 92 C36 88, 46 92, 54 88 C62 84, 72 88, 80 84 C88 80, 94 84, 100 80"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
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
              Your tentacles, your progress. Pick a section to start building habits — journaling, diet, sleep and more.
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

            <HoverButton
              onClick={() => navigate('/yoga')}
              left={<><span style={{ fontSize: 18 }}>🧘</span> Yoga</>}
              right="→"
            />
            <HoverButton
              onClick={() => navigate('/journal')}
              left={<><span style={{ fontSize: 18 }}>📓</span> Journal</>}
              right="→"
            />
            <HoverButton
              onClick={() => navigate('/diet')}
              left={<><span style={{ fontSize: 18 }}>🥗</span> Diet</>}
              right="→"
            />
            <HoverButton
              onClick={() => navigate('/sleep')}
              left={<><span style={{ fontSize: 18 }}>😴</span> Sleep</>}
              right="→"
            />

            <button
              disabled
              style={{
                ...cardBtn,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'not-allowed'
              }}
              title="Coming soon"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>👥</span> Social (soon)
              </span>
              <span style={{ opacity: 0.55 }}>•</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
