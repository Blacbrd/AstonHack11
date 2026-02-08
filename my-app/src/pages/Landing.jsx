// Landing.jsx
import React, { useState, useEffect, useCallback } from 'react';
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

  // --- Profile Popup State ---
  const [showProfile, setShowProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePoints, setProfilePoints] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ NEW: Octopus count (placeholder for now)
  const profileOctopusCount = 0;

  const fallbackUsername =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // --- Progress (saved locally) ---
  const [octoState, setOctoState] = useState(() => {
    const loaded = loadOctoState();
    // track how many segments we have already converted into points locally (prevents double-award)
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    return loaded;
  });

  const [debugSegments, setDebugSegments] = useState(false);
  const [octoClips] = useState(DEFAULT_CLIPS);

  // 🔁 Reload progress whenever you navigate back here
  useEffect(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    setOctoState(loaded);
  }, [location.key]);

  // Persist progress
  useEffect(() => {
    saveOctoState(octoState);
  }, [octoState]);

  // --- Helpers ---
  const countCompletedSegments = (progress) => {
    if (!progress) return 0;
    let total = 0;
    Object.values(progress).forEach((arr) => {
      if (Array.isArray(arr)) {
        for (const v of arr) if (v === true) total += 1;
      }
    });
    return total;
  };

  // --- Fetch profile (username + points) ---
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    setProfileLoading(true);
    try {
      // If your profiles table uses `user_id` instead of `id`, swap this filter:
      // .eq('id', session.user.id) -> .eq('user_id', session.user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('username, points')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setProfileUsername((data?.username || fallbackUsername).trim());
      setProfilePoints(Number.isFinite(data?.points) ? data.points : 0);
    } catch {
      setProfileUsername(fallbackUsername);
      // keep existing points if fetch fails
    } finally {
      setProfileLoading(false);
    }
  }, [session?.user?.id, fallbackUsername]);

  // Fetch profile once you have a session
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProfile();
  }, [session?.user?.id, fetchProfile]);

  // --- Award points when new segments glow (i.e., become true) ---
  const awardPointsForNewSegments = useCallback(
    async (delta) => {
      if (!session?.user?.id) return;
      if (!Number.isFinite(delta) || delta <= 0) return;

      try {
        // Read current points
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        const current = Number.isFinite(data?.points) ? data.points : 0;
        const next = current + delta;

        // Write back
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ points: next })
          .eq('id', session.user.id);

        if (updErr) throw updErr;

        setProfilePoints(next);
      } catch {
        // If update fails, we simply won't reflect it here; you can log if you want.
      }
    },
    [session?.user?.id]
  );

  // Whenever octo progress increases, add points for newly completed segments (once).
  useEffect(() => {
    if (!session?.user?.id) return;

    const completed = countCompletedSegments(octoState.progress);
    const awardedTotal = Number.isFinite(octoState.awardedTotal) ? octoState.awardedTotal : 0;

    const delta = completed - awardedTotal;

    if (delta > 0) {
      // 1 point per new glowing segment
      awardPointsForNewSegments(delta);

      // Update local awardedTotal so we don't double-award next render
      setOctoState((prev) => {
        const nowCompleted = countCompletedSegments(prev.progress);
        return { ...prev, awardedTotal: nowCompleted };
      });
    } else if (delta < 0) {
      // If user resets progress / week changes, don't subtract points.
      // Just realign awardedTotal to the new completed count.
      setOctoState((prev) => ({ ...prev, awardedTotal: completed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [octoState.progress, session?.user?.id]); // keep it tied to progress changes

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

  // --- Profile popup controls ---
  const openProfile = async () => {
    setShowProfile(true);
    // refresh when opening so it’s always current
    await fetchProfile();
  };

  const closeProfile = () => setShowProfile(false);

  useEffect(() => {
    if (!showProfile) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeProfile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showProfile]);

  // ✅ RAGO: advance demo day
  const rago = () => {
    advanceDemoDay();
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    setOctoState(loaded);
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
      awardedTotal: 0,
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

  // Inline styles (no CSS edits needed)
  const profileBackdropStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: '74px 16px 16px 16px',
  };

  const profilePopupStyle = {
    width: 280,
    borderRadius: 16,
    background: 'rgba(10, 18, 35, 0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.38)',
    color: '#fff',
    padding: 14,
    backdropFilter: 'blur(10px)',
  };

  const profilePopupHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  };

  // ✅ NEW: Left header row to align "Profile" with octo badge
  const profileHeaderLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  // ✅ NEW: Octo badge style
  const octoBadgeStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.12)',
  };

  const octoIconStyle = {
    width: 18,
    height: 18,
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
  };

  const closeBtnStyle = {
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 10,
    padding: '6px 10px',
    cursor: 'pointer',
  };

  const sectionLabelStyle = {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 10,
  };

  const sectionValueStyle = {
    marginTop: 6,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
    wordBreak: 'break-word',
  };

  return (
    <div className="landing">
      <div className="bubbles" />
      <div className="bubbles2" />
      <div className="seaweed" />

      {/* Header */}
      <div className="header">
        <button onClick={openProfile}>👤 Profile</button>

        <button onClick={() => openSocial('list')}>👥 Friends</button>
        <button onClick={() => openSocial('search')}>🔍 Add</button>
        <button onClick={() => openSocial('notifications')}>
          🔔 {hasUnread && <span className="notifDot" />}
        </button>

        <div className="userInfo">
          <span>Logged in as</span>
          <strong>{fallbackUsername}</strong>
        </div>

        <button onClick={handleLogout}>Sign Out</button>
      </div>

      {/* Profile Popup */}
      {showProfile && (
        <div
          style={profileBackdropStyle}
          onClick={closeProfile}
          role="button"
          tabIndex={-1}
          aria-label="Close profile popup"
        >
          <div
            style={profilePopupStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Profile popup"
          >
            <div style={profilePopupHeaderStyle}>
              {/* ✅ CHANGED: left side now has Profile + octo count aligned */}
              <div style={profileHeaderLeftStyle}>
                <div style={{ fontWeight: 800 }}>Profile</div>

                <div style={octoBadgeStyle} title="Octopus count (placeholder)">
                  <img src={octo} alt="Octopus" style={octoIconStyle} />
                  <span style={{ fontWeight: 800 }}>{profileOctopusCount}</span>
                </div>
              </div>

              <button style={closeBtnStyle} onClick={closeProfile}>
                ✕
              </button>
            </div>

            <div style={sectionLabelStyle}>Username</div>
            <div style={sectionValueStyle}>
              {profileLoading ? 'Loading…' : profileUsername || fallbackUsername}
            </div>

            <div style={sectionLabelStyle}>Points</div>
            <div style={sectionValueStyle}>
              {profileLoading ? 'Loading…' : profilePoints}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
              (Click outside to close)
            </div>
          </div>
        </div>
      )}

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
          <button className="octoRagoBtn" onClick={rago} title="Demo: advance to the next day">
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
