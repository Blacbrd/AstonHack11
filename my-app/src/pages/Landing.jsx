import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SocialModal from '../components/SocialModal';
import './Landing.css';
import octo from '../images/octo.png';

import OctopusSegments, { DEFAULT_CLIPS } from '../components/OctopusSegments';
import {
  loadOctoState,
  saveOctoState,
  advanceDemoDay,
  getWeekId,
  makeEmptyProgress,
} from '../components/octopusProgress';

const Landing = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Social & Notification State ---
  const [showSocial, setShowSocial] = useState(false);
  const [socialMode, setSocialMode] = useState('search');
  const [hasUnread, setHasUnread] = useState(false);

  const username =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // --- Progress (saved locally) ---
  const [octoState, setOctoState] = useState(() => loadOctoState());

  // Debug toggle (shows/hides outlines)
  const [debugSegments, setDebugSegments] = useState(false);

  // Fixed clips
  const [octoClips] = useState(DEFAULT_CLIPS);

  // 🔁 Reload progress whenever you navigate back here
  useEffect(() => {
    setOctoState(loadOctoState());
  }, [location.key]);

  // Persist progress
  useEffect(() => {
    saveOctoState(octoState);
  }, [octoState]);

  // --- Realtime Notifications Logic ---
  useEffect(() => {
    if (!session?.user?.id) return;

    checkNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => setHasUnread(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const checkNotifications = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', session.user.id);

    if (count > 0) setHasUnread(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const openSocial = (mode) => {
    setSocialMode(mode);
    setShowSocial(true);
    if (mode === 'notifications') setHasUnread(false);
  };

  // ✅ RAGO: advance demo day
  const rago = () => {
    advanceDemoDay();
    setOctoState(loadOctoState()); // refresh immediately so UI updates
  };

  // ✅ RAGO 2: add ONE highlight to EVERY tentacle
  const rago2 = () => {
    setOctoState((prev) => {
      const nextProgress = { ...prev.progress };

      Object.keys(nextProgress).forEach((featureKey) => {
        const arr = [...nextProgress[featureKey]];
        const nextIdx = arr.findIndex((v) => v === false);
        if (nextIdx !== -1) arr[nextIdx] = true;
        nextProgress[featureKey] = arr;
      });

      const nextState = { ...prev, progress: nextProgress };
      saveOctoState(nextState);
      return nextState;
    });
  };

  // 🔁 DEV RESET BUTTON (for testing)
  const resetOctopusProgress = () => {
    const fresh = {
      weekId: getWeekId(),
      progress: makeEmptyProgress(),
      lastDone: {},
    };
    setOctoState(fresh);
    saveOctoState(fresh);
  };

  // Debug click: toggle segment on/off
  const handleDebugClick = (featureKey, segIdx) => {
    setOctoState((prev) => {
      const nextProgress = { ...prev.progress };
      nextProgress[featureKey] = [...nextProgress[featureKey]];
      nextProgress[featureKey][segIdx] = !nextProgress[featureKey][segIdx];
      return { ...prev, progress: nextProgress };
    });
  };

  return (
    <div className="landing">
      <div className="bubbles" />
      <div className="bubbles2" />
      <div className="seaweed" />

      {/* Header */}
      <div className="header">
        <button onClick={() => openSocial('list')}>👥 Friends</button>
        <button onClick={() => openSocial('search')}>🔍 Add</button>
        <button onClick={() => openSocial('notifications')}>
          🔔 {hasUnread && <span className="notifDot" />}
        </button>

        <div className="userInfo">
          <span>Logged in as</span>
          <strong>{username}</strong>
        </div>

        <button onClick={handleLogout}>Sign Out</button>
      </div>

      {/* Main Content */}
      <div className="landingContent">
        <h1 className="title">Wellness Hub</h1>

        <div className="octoHub">
          {/* Octopus */}
          <div className={`octoLayer ${debugSegments ? 'octoLayer--debug' : ''}`}>
            <OctopusSegments
              src={octo}
              progress={octoState.progress}
              debug={debugSegments}
              clips={octoClips}
              onDebugClick={handleDebugClick}
            />
          </div>

          {/* Buttons */}
          <button className="tentacle t1" onClick={() => navigate('/yoga')}>
            🧘 Yoga & AI Form
          </button>

          <button className="tentacle t2" onClick={() => navigate('/meditation')}>
            🧠 Meditation (AI)
          </button>

          <button className="tentacle t3" onClick={() => navigate('/journal')}>
            📓 Journal
          </button>

          <button className="tentacle t4" onClick={() => navigate('/diet')}>
            🥗 Diet Calendar
          </button>

          <button className="tentacle t5" onClick={() => navigate('/sleep')}>
            😴 Sleep Tracker
          </button>

          <button className="tentacle t6 disabled" disabled>
            🔒 Coming Soon
          </button>

          {/* Debug toggle */}
          <button
            className="octoDebugToggle"
            onClick={() => setDebugSegments((d) => !d)}
            title="Show/hide segment outlines"
          >
            {debugSegments ? 'Hide Segments' : 'Show Segments'}
          </button>

          {/* RESET BUTTON */}
          <button
            className="octoResetBtn"
            onClick={resetOctopusProgress}
            title="Reset all progress"
          >
            Reset Progress
          </button>

          {/* RAGO 1 */}
          <button
            className="octoRagoBtn"
            onClick={rago}
            title="Demo: advance to the next day"
          >
            RAGO → Next Day
          </button>

          {/* RAGO 2 */}
          <button
            className="octoRago2Btn"
            onClick={rago2}
            title="Demo: add one segment to every tentacle"
          >
            RAGO 2 ⚡ Fill All
          </button>
        </div>
      </div>

      {showSocial && (
        <SocialModal
          session={session}
          onClose={() => setShowSocial(false)}
          initialMode={socialMode}
        />
      )}
    </div>
  );
};

export default Landing;
