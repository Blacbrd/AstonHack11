import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Yoga.css'

export default function Yoga() {
  const navigate = useNavigate()

  const bubbles = [
    { x: 7, r: 0.9, speed: 'A', delay: '1' },
    { x: 13, r: 1.2, speed: 'B', delay: '2' },
    { x: 20, r: 0.8, speed: 'A', delay: '3' },
    { x: 28, r: 1.7, speed: 'B', delay: '1' },
    { x: 36, r: 1.1, speed: 'A', delay: '2' },
    { x: 44, r: 1.9, speed: 'B', delay: '4' },
    { x: 52, r: 1.0, speed: 'A', delay: '5' },
    { x: 60, r: 2.2, speed: 'B', delay: '2' },
    { x: 68, r: 1.3, speed: 'A', delay: '4' },
    { x: 76, r: 1.7, speed: 'B', delay: '3' },
    { x: 84, r: 1.1, speed: 'A', delay: '1' },
    { x: 92, r: 2.0, speed: 'B', delay: '5' }
  ]

  return (
    <div className="yogaPage">
      <div className="yogaBg" />
      <div className="yogaRays" />

      {/* Bubbles */}
      <svg className="yogaBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeYoga" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`yogaBubble yogaSpeed${b.speed} yogaDelay${b.delay}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle className="yogaBubbleOuter" cx={b.x} cy="96" r={b.r} stroke="url(#bubbleStrokeYoga)" />
            <circle
              className="yogaBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="yogaSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="yogaSeaweedSway yogaSeaweedD1" opacity="0.9">
          <path className="yogaSeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="yogaSeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="yogaSeaweedSway yogaSeaweedD2" opacity="0.9">
          <path className="yogaSeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="yogaSeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      {/* Foreground */}
      <div className="yogaContent">
        <button className="yogaBackBtn" onClick={() => navigate('/')}>
          ← Back
        </button>

        <div className="yogaCard">
          <h1 className="yogaTitle">Select Your Pose</h1>

          <div className="yogaButtons">
            <button className="yogaBtn" onClick={() => navigate('/yoga/tree')}>
              Tree Pose
            </button>

            <button className="yogaBtn" onClick={() => navigate('/yoga/warrior')}>
              Warrior Pose
            </button>

            <button className="yogaBtn" onClick={() => navigate('/yoga/sphinx')}>
              Sphinx Pose
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
