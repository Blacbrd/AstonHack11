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

  // refs for throttling/backpressure
  const lastSentRef = useRef(0);
  const wsBusyRef = useRef(false); // true while waiting for server response
  const runningRef = useRef(true);

  // Choose lower resolution for sending to server to reduce payload
  const videoConstraints = {
    width: 320,
    height: 240,
    facingMode: "user"
  };

  useEffect(() => {
    runningRef.current = true;
    // init ws
    ws.current = new WebSocket("ws://127.0.0.1:8000/ws/analyze");
    ws.current.onopen = () => console.log("Connected to WebSocket");
    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        // server may send annotated image + stats
        if (response.image) setAnnotatedImage(response.image);
        if (response.stats) setPoseStats(response.stats);
      } catch (e) {
        console.error("Error parsing WS message", e);
      } finally {
        // server responded; allow next frame to be sent
        wsBusyRef.current = false;
      }
    };
    ws.current.onclose = () => console.log("WebSocket Disconnected");
    ws.current.onerror = (e) => console.warn("WS error", e);

    return () => {
      runningRef.current = false;
      if (ws.current) ws.current.close();
    };
  }, []);

  // capture loop using requestAnimationFrame + throttling + backpressure
  useEffect(() => {
    let rafId = null;

    const targetFps = 15; // ~15 FPS to the server (feel smooth locally)
    const minInterval = 1000 / targetFps;

    const loop = (ts) => {
      if (!runningRef.current) return;
      const now = performance.now();

      const canSend =
        ws.current &&
        ws.current.readyState === WebSocket.OPEN &&
        !wsBusyRef.current &&
        webcamRef.current &&
        webcamRef.current.getCanvas; // react-webcam provides video via ref

      if (canSend && now - lastSentRef.current >= minInterval) {
        // getScreenshot returns a base64 dataURL at the video constraints resolution
        const screenshot = webcamRef.current.getScreenshot(); // uses videoConstraints resolution
        if (screenshot) {
          // set busy (backpressure) until a server reply arrives
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
        {/* Video wrapper: show the live webcam feed (visible) so it's instant/smooth */}
        <div className="pose-session-video-wrapper">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            audio={false}
            className="pose-session-media pose-session-webcam"
            videoConstraints={videoConstraints}
          />

          {/* Annotated image arrives asynchronously — displayed as overlay (top) */}
          {annotatedImage && (
            <img
              src={annotatedImage}
              alt="AI Overlay"
              className="pose-session-media pose-session-annotated"
            />
          )}

          {/* When annotated image not present, show loading text on top of video */}
          {!annotatedImage && (
            <div className="pose-session-loading">Loading Vision Model...</div>
          )}
        </div>

        {/* Stats panel */}
        <aside className="pose-session-stats-panel" aria-live="polite">
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
  );
};

export default PoseSession;
