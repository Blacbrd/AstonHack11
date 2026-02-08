import React, { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import './PoseSession.css'

const PoseSession = () => {
  const { poseName } = useParams()
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const ws = useRef(null)

  const [annotatedImage, setAnnotatedImage] = useState(null)
  const [poseStats, setPoseStats] = useState({})

  // Refs for throttling/backpressure
  const lastSentRef = useRef(0)
  const wsBusyRef = useRef(false)
  const runningRef = useRef(true)

  // Lower resolution for faster transmission
  const videoConstraints = {
    width: 320,
    height: 240,
    facingMode: 'user'
  }

  // Underwater bubbles config (purely visual)
  const bubbles = [
    { x: 6, r: 0.9, speed: 'A', delay: '1' },
    { x: 11, r: 1.2, speed: 'B', delay: '2' },
    { x: 18, r: 0.8, speed: 'A', delay: '3' },
    { x: 26, r: 1.6, speed: 'B', delay: '1' },
    { x: 33, r: 1.1, speed: 'A', delay: '2' },
    { x: 41, r: 1.9, speed: 'B', delay: '4' },
    { x: 49, r: 1.0, speed: 'A', delay: '5' },
    { x: 56, r: 2.2, speed: 'B', delay: '2' },
    { x: 63, r: 1.3, speed: 'A', delay: '4' },
    { x: 71, r: 1.7, speed: 'B', delay: '3' },
    { x: 79, r: 1.1, speed: 'A', delay: '1' },
    { x: 87, r: 2.0, speed: 'B', delay: '5' },
    { x: 94, r: 0.85, speed: 'A', delay: '3' }
  ]

  // 1. WebSocket Setup
  useEffect(() => {
    runningRef.current = true
    ws.current = new WebSocket('ws://127.0.0.1:8000/ws/analyze')

    ws.current.onopen = () => console.log('Connected to WebSocket')

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data)
        if (response.image) setAnnotatedImage(response.image)
        if (response.stats) setPoseStats(response.stats)
      } catch (e) {
        console.error('Error parsing WS message', e)
      } finally {
        wsBusyRef.current = false
      }
    }

    ws.current.onclose = () => console.log('WebSocket Disconnected')

    return () => {
      runningRef.current = false
      if (ws.current) ws.current.close()
    }
  }, [])

  // 2. Capture Loop
  useEffect(() => {
    let rafId = null
    const targetFps = 15
    const minInterval = 1000 / targetFps

    const loop = () => {
      if (!runningRef.current) return
      const now = performance.now()

      const canSend =
        ws.current &&
        ws.current.readyState === WebSocket.OPEN &&
        !wsBusyRef.current &&
        webcamRef.current

      if (canSend && now - lastSentRef.current >= minInterval) {
        const screenshot = webcamRef.current.getScreenshot()
        if (screenshot) {
          wsBusyRef.current = true
          lastSentRef.current = now
          try {
            ws.current.send(
              JSON.stringify({
                image: screenshot,
                mode: poseName
              })
            )
          } catch (err) {
            console.error('WS send error', err)
            wsBusyRef.current = false
          }
        }
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [poseName])

  return (
    <div className="pose-session-container pose-session-underwater">
      {/* Underwater background layers */}
      <div className="pose-session-bg" />
      <div className="pose-session-rays" />

      {/* Bubbles */}
      <svg className="pose-session-bubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokePose" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`pose-bubble pose-bubbleSpeed${b.speed} pose-bubbleDelay${b.delay}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle
              className="pose-bubbleOuter"
              cx={b.x}
              cy="96"
              r={b.r}
              stroke="url(#bubbleStrokePose)"
            />
            <circle
              className="pose-bubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="pose-session-seaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="pose-seaweedSway pose-seaweedD1" opacity="0.9">
          <path className="pose-seaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="pose-seaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="pose-seaweedSway pose-seaweedD2" opacity="0.9">
          <path className="pose-seaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="pose-seaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      {/* Foreground UI */}
      <div className="pose-session-foreground">
        <div className="pose-session-header">
          <button className="pose-session-back-btn" onClick={() => navigate('/yoga')}>
            ← End Session
          </button>
          <h2 className="pose-session-title">
            POSE: <span className="pose-session-mode">{poseName?.toUpperCase()}</span>
          </h2>
        </div>

        <div className="pose-session-content">
          {/* Video Area */}
          <div className="pose-session-video-wrapper">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              audio={false}
              className="pose-session-media pose-session-webcam"
              videoConstraints={videoConstraints}
            />

            {annotatedImage && (
              <img src={annotatedImage} alt="AI Overlay" className="pose-session-media pose-session-annotated" />
            )}

            {!annotatedImage && <div className="pose-session-loading">Loading Vision Model...</div>}
          </div>

          {/* Stats Area */}
          <aside className="pose-session-stats-panel">
            <h3 className="pose-session-stats-title">Live Metrics</h3>

            {Object.keys(poseStats).length > 0 ? (
              Object.entries(poseStats).map(([key, value]) => (
                <div key={key} className="pose-session-stat-item">
                  <span className="pose-session-stat-label">{key}</span>
                  <span className="pose-session-stat-value">{value}</span>
                </div>
              ))
            ) : (
              <div className="pose-session-stat-empty">
                <p>Get in frame to start...</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default PoseSession
