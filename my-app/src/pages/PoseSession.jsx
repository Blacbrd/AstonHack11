import React, { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Webcam from 'react-webcam'
import './PoseSession.css'

const PoseSession = () => {
  const { poseName } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Auth & Room State
  const [session, setSession] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [partnerName, setPartnerName] = useState(null)
  
  // Media & Local Processing
  const webcamRef = useRef(null)
  const ws = useRef(null) // Local Python connection

  // Supabase Realtime Channel
  const broadcastChannelRef = useRef(null)

  // STREAMS
  const [myImage, setMyImage] = useState(null)      // Processed locally
  const [partnerImage, setPartnerImage] = useState(null) // Received via Supabase
  const [myStats, setMyStats] = useState({})
  
  // Control Refs (Throttling)
  const lastSentRef = useRef(0)
  const lastBroadcastRef = useRef(0)
  const runningRef = useRef(true)

  // Low res for speed over Supabase
  const videoConstraints = { width: 320, height: 240, facingMode: 'user' }

  // 1. Setup Session & Determine Room
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        checkIfInRoom(data.session.user.id)
      }
    })
  }, [])

  const checkIfInRoom = async (userId) => {
    const { data } = await supabase.from('yoga_rooms')
      .select('room_id, host_id, joiner_id')
      .or(`host_id.eq.${userId},joiner_id.eq.${userId}`)
      .eq('status', 'active') 
      .maybeSingle()
    
    if (data) {
      setRoomId(data.room_id)
      const partnerId = data.host_id === userId ? data.joiner_id : data.host_id
      const { data: p } = await supabase.from('profiles').select('username').eq('id', partnerId).single()
      if (p) setPartnerName(p.username)
    } else {
      setRoomId('solo') 
    }
  }

  // 2. SUPABASE BROADCAST (Send/Receive Partner Video)
  useEffect(() => {
    if (!roomId || roomId === 'solo' || !session) return;

    console.log(`📡 Connecting to Shared Room: ${roomId}`)

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false } // Don't receive my own messages
      }
    })

    channel
      .on('broadcast', { event: 'frame' }, (payload) => {
        // RECEIVED PARTNER FRAME
        if (payload.payload?.image) {
          setPartnerImage(payload.payload.image)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log("✅ Connected to Partner Stream")
      })

    broadcastChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, session])

  // 3. LOCAL PYTHON CONNECTION (Process My Video)
  useEffect(() => {
    runningRef.current = true
    
    // Always connect to localhost:8000 because each laptop runs its own backend
    ws.current = new WebSocket('ws://127.0.0.1:8000/ws/analyze')

    ws.current.onopen = () => console.log('✅ Connected to Local AI')

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data)
        
        // 1. Update My Screen
        if (response.image) setMyImage(response.image)
        if (response.stats) setMyStats(response.stats)

        // 2. Broadcast to Partner (If in Co-op)
        // We limit this to ~10fps to save bandwidth
        const now = performance.now()
        if (roomId && roomId !== 'solo' && broadcastChannelRef.current && (now - lastBroadcastRef.current > 100)) {
          broadcastChannelRef.current.send({
            type: 'broadcast',
            event: 'frame',
            payload: { image: response.image } // Send the processed AI image
          })
          lastBroadcastRef.current = now
        }

      } catch (e) {
        console.error('Local Processing Error', e)
      }
    }

    return () => {
      runningRef.current = false
      if (ws.current) ws.current.close()
    }
  }, [roomId])

  // 4. Capture Loop (Send Webcam to Local Python)
  useEffect(() => {
    let rafId = null
    const targetFps = 15 // Keep it smooth locally
    const minInterval = 1000 / targetFps

    const loop = () => {
      if (!runningRef.current) return
      const now = performance.now()

      if (
        ws.current && 
        ws.current.readyState === WebSocket.OPEN && 
        webcamRef.current && 
        (now - lastSentRef.current >= minInterval)
      ) {
        const screenshot = webcamRef.current.getScreenshot()
        if (screenshot) {
          lastSentRef.current = now
          ws.current.send(JSON.stringify({
            image: screenshot,
            mode: poseName
          }))
        }
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [poseName])

  const handleBack = () => {
    if (searchParams.get('coop_user')) {
      navigate(`/yoga?coop_user=${searchParams.get('coop_user')}`)
    } else {
      navigate('/yoga')
    }
  }

  // Visuals
  const bubbles = [
    { x: 6, r: 0.9, speed: 'A', delay: '1' }, { x: 26, r: 1.6, speed: 'B', delay: '1' },
    { x: 49, r: 1.0, speed: 'A', delay: '5' }, { x: 71, r: 1.7, speed: 'B', delay: '3' }
  ]

  return (
    <div className="pose-session-container pose-session-underwater">
      <div className="pose-session-bg" />
      <div className="pose-session-rays" />

      <svg className="pose-session-bubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs><linearGradient id="bubbleStrokePose" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.45)" /><stop offset="100%" stopColor="rgba(255,255,255,0.15)" /></linearGradient></defs>
        {bubbles.map((b, i) => (
          <g key={i} className={`pose-bubble pose-bubbleSpeed${b.speed} pose-bubbleDelay${b.delay}`} style={{ '--bx': `${b.x}` }}>
            <circle className="pose-bubbleOuter" cx={b.x} cy="96" r={b.r} stroke="url(#bubbleStrokePose)" />
          </g>
        ))}
      </svg>

      <div className="pose-session-foreground">
        <div className="pose-session-header">
          <button className="pose-session-back-btn" onClick={handleBack}>← End Session</button>
          
          <div style={{textAlign:'right'}}>
            <h2 className="pose-session-title">POSE: <span className="pose-session-mode">{poseName?.toUpperCase()}</span></h2>
            {partnerName && <div style={{fontSize:'0.9rem', color:'#4ade80'}}>● Joint Session with {partnerName}</div>}
          </div>
        </div>

        <div className="pose-session-content">
          
          {/* VIDEO GRID */}
          <div className={`pose-video-grid ${partnerImage ? 'dual-mode' : 'solo-mode'}`}>
            
            {/* 1. MY FEED (Processed Locally) */}
            <div className="pose-feed-container">
              <div className="pose-label">You</div>
              <div className="pose-video-wrapper">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  audio={false}
                  className="pose-hidden-webcam"
                  videoConstraints={videoConstraints}
                />
                
                {myImage ? (
                  <img src={myImage} alt="My AI Overlay" className="pose-stream-img" />
                ) : (
                  <div className="pose-loading">Starting AI...</div>
                )}
              </div>
            </div>

            {/* 2. PARTNER FEED (Received via Supabase) */}
            {partnerImage && (
              <div className="pose-feed-container">
                <div className="pose-label" style={{color:'#4ade80'}}>
                  {partnerName || 'Partner'}
                </div>
                <div className="pose-video-wrapper">
                  <img src={partnerImage} alt="Partner AI Overlay" className="pose-stream-img" />
                </div>
              </div>
            )}

          </div>

          {/* STATS */}
          <aside className="pose-session-stats-panel">
            <h3 className="pose-session-stats-title">Live Metrics</h3>
            {Object.keys(myStats).length > 0 ? (
              Object.entries(myStats).map(([key, value]) => (
                <div key={key} className="pose-session-stat-item">
                  <span className="pose-session-stat-label">{key}</span>
                  <span className="pose-session-stat-value">{value}</span>
                </div>
              ))
            ) : (
              <div className="pose-session-stat-empty"><p>Get in frame...</p></div>
            )}
          </aside>

        </div>
      </div>
    </div>
  )
}

export default PoseSession