import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import './PoseSession.css';

const PoseSession = () => {
  const { poseName } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const ws = useRef(null);

  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [poseStats, setPoseStats] = useState({});

  // Refs for throttling/backpressure
  const lastSentRef = useRef(0);
  const wsBusyRef = useRef(false); 
  const runningRef = useRef(true);

  // Lower resolution for faster transmission
  const videoConstraints = {
    width: 320,
    height: 240,
    facingMode: "user"
  };

  // 1. WebSocket Setup
  useEffect(() => {
    runningRef.current = true;
    ws.current = new WebSocket("ws://127.0.0.1:8000/ws/analyze");
    
    ws.current.onopen = () => console.log("Connected to WebSocket");
    
    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.image) setAnnotatedImage(response.image);
        if (response.stats) setPoseStats(response.stats);
      } catch (e) {
        console.error("Error parsing WS message", e);
      } finally {
        wsBusyRef.current = false;
      }
    };
    
    ws.current.onclose = () => console.log("WebSocket Disconnected");
    
    return () => {
      runningRef.current = false;
      if (ws.current) ws.current.close();
    };
  }, []);

  // 2. Capture Loop
  useEffect(() => {
    let rafId = null;
    const targetFps = 15; 
    const minInterval = 1000 / targetFps;

    const loop = (ts) => {
      if (!runningRef.current) return;
      const now = performance.now();

      const canSend =
        ws.current &&
        ws.current.readyState === WebSocket.OPEN &&
        !wsBusyRef.current &&
        webcamRef.current &&
        webcamRef.current.getCanvas;

      if (canSend && now - lastSentRef.current >= minInterval) {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          wsBusyRef.current = true;
          lastSentRef.current = now;
          try {
            ws.current.send(JSON.stringify({
              image: screenshot,
              mode: poseName
            }));
          } catch (err) {
            console.error("WS send error", err);
            wsBusyRef.current = false;
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [poseName]);

  return (
    <div className="pose-session-container">
      <div className="pose-session-header">
        <button 
          className="pose-session-back-btn" 
          onClick={() => navigate('/yoga')}
        >
          ← End Session
        </button>
        <h2 className="pose-session-title">
          POSE: <span className="pose-session-mode">{poseName?.toUpperCase()}</span>
        </h2>
      </div>

      <div className="pose-session-content">
        {/* Video Area */}
        <div className="pose-session-video-wrapper">
          {/* Live Webcam Feed (Bottom Layer) */}
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            audio={false}
            className="pose-session-media pose-session-webcam"
            videoConstraints={videoConstraints}
          />
          
          {/* Annotated AI Overlay (Top Layer) */}
          {annotatedImage && (
            <img 
              src={annotatedImage} 
              alt="AI Overlay" 
              className="pose-session-media pose-session-annotated" 
            />
          )}

          {/* Loading State */}
          {!annotatedImage && (
            <div className="pose-session-loading">Loading Vision Model...</div>
          )}
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
            <div className="pose-session-stat-empty" style={{color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '50px'}}>
              <p>Get in frame to start...</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PoseSession;