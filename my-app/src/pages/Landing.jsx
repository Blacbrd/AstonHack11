import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SocialModal from '../components/SocialModal';
import './Landing.css';
import octo from '../images/octo.png';

// Octopus Components & Helpers
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

  // --- 1. Notification & Social State ---
  const [showSocial, setShowSocial] = useState(false);
  const [socialMode, setSocialMode] = useState('search');
  const [hasUnread, setHasUnread] = useState(false);
  const channelRef = useRef(null);

  // --- 2. Profile Popup State ---
  const [showProfile, setShowProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePoints, setProfilePoints] = useState(0);
  const [profileOctopusCount, setProfileOctopusCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  const fallbackUsername =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // --- 3. Octopus Progress State ---
  const [octoState, setOctoState] = useState(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    return loaded;
  });

  const [debugSegments, setDebugSegments] = useState(false);
  const [octoClips] = useState(DEFAULT_CLIPS);

  // Sync state with local storage
  useEffect(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    setOctoState(loaded);
  }, [location.key]);

  useEffect(() => {
    saveOctoState(octoState);
  }, [octoState]);

  // --- 4. Realtime Notifications Logic ---
  useEffect(() => {
    if (!session?.user?.id) return;
    const myId = session.user.id;
    let isMounted = true;

    checkNotifications();

    const connectRealtime = () => {
      if (!isMounted) return;
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase
        .channel(`public:notifications:${myId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${myId}`,
          },
          (payload) => {
            console.log('🔔 [Landing] New Notification!', payload);
            setHasUnread(true);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    const timer = setTimeout(() => connectRealtime(), 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [session?.user?.id]);

  const checkNotifications = async () => {
    if (!session?.user?.id) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (count > 0) setHasUnread(true);
    else setHasUnread(false);
  };

  // --- 5. Profile & Point Logic ---
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) {
      console.log('[Landing] fetchProfile called but no session.user.id present');
      return;
    }
    console.log('[Landing] fetchProfile START for id=', session.user.id);
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, points, octopus_count')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('[Landing] fetchProfile supabase error:', error);
      } else {
        console.log('[Landing] fetchProfile data:', data);
      }

      setProfileUsername(data?.username || fallbackUsername);
      setProfilePoints(data?.points ?? 0);
      setProfileOctopusCount(data?.octopus_count ?? 0);
    } catch (err) {
      console.error('[Landing] fetchProfile caught error:', err);
    } finally {
      setProfileLoading(false);
      console.log('[Landing] fetchProfile FINISHED');
    }
  }, [session?.user?.id, fallbackUsername]);

  useEffect(() => {
    if (session?.user?.id) fetchProfile();
  }, [session?.user?.id, fetchProfile]);

  const awardPointsForNewSegments = useCallback(
    async (delta) => {
      if (!session?.user?.id || delta <= 0) return;
      const { data } = await supabase.from('profiles').select('points').eq('id', session.user.id).single();
      const next = (data?.points ?? 0) + delta;
      await supabase.from('profiles').update({ points: next }).eq('id', session.user.id);
      setProfilePoints(next);
    },
    [session?.user?.id]
  );

  const awardOctopusForFullGlow = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('octopus_count').eq('id', session.user.id).single();
    const next = (data?.octopus_count ?? 0) + 1;
    await supabase.from('profiles').update({ octopus_count: next }).eq('id', session.user.id);
    setProfileOctopusCount(next);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const countCompletedSegments = (progress) =>
      Object.values(progress || {}).flat().filter(Boolean).length;
    const completed = countCompletedSegments(octoState.progress);
    const delta = completed - (octoState.awardedTotal ?? 0);

    if (delta > 0) {
      awardPointsForNewSegments(delta);
      setOctoState((p) => ({ ...p, awardedTotal: completed }));
    }
  }, [octoState.progress, session?.user?.id, octoState.awardedTotal, awardPointsForNewSegments]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const countCompletedSegments = (progress) =>
      Object.values(progress || {}).flat().filter(Boolean).length;
    const countTotalSegments = (progress) =>
      Object.values(progress || {}).reduce((a, b) => a + b.length, 0);

    const weekId = octoState.weekId || getWeekId();
    const isFullyGlown =
      countTotalSegments(octoState.progress) > 0 &&
      countCompletedSegments(octoState.progress) === countTotalSegments(octoState.progress);

    if (isFullyGlown && octoState.fullAwardedWeekId !== weekId) {
      awardOctopusForFullGlow();
      setOctoState((p) => ({ ...p, fullAwardedWeekId: weekId }));
    }
  }, [octoState.progress, session?.user?.id, octoState.fullAwardedWeekId, octoState.weekId, awardOctopusForFullGlow]);

  // --- 6. Actions ---
  const handleLogout = async () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    await supabase.auth.signOut();
  };

  const openSocial = (mode) => {
    setSocialMode(mode);
    setShowSocial(true);
    if (mode === 'notifications') setHasUnread(false);
  };

  const rago = () => {
    advanceDemoDay();
    const loaded = loadOctoState();
    loaded.awardedTotal = 0;
    loaded.fullAwardedWeekId = '';
    setOctoState(loaded);
  };

  const rago2 = () => {
    setOctoState((prev) => {
      const next = { ...prev.progress };
      Object.keys(next).forEach((k) => {
        const i = next[k].findIndex((v) => !v);
        if (i !== -1) next[k][i] = true;
      });
      const s = { ...prev, progress: next };
      saveOctoState(s);
      return s;
    });
  };

  const resetOctopusProgress = () => {
    const fresh = {
      weekId: getWeekId(),
      progress: makeEmptyProgress(),
      lastDone: {},
      awardedTotal: 0,
      fullAwardedWeekId: '',
    };
    setOctoState(fresh);
    saveOctoState(fresh);
  };

  const socialBtnStyle = {
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    color: '#eee',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.9rem',
    position: 'relative',
    marginRight: '10px',
  };

  const badgeStyle = {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    backgroundColor: 'red',
    borderRadius: '50%',
    border: '2px solid #121212',
  };

  // Profile card styles (copied to match Friend Profile layout)
  const profileStyles = {
    friendBackdrop: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 4000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    friendPopup: {
      width: 320,
      borderRadius: 16,
      background: 'rgba(10, 18, 35, 0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 18px 50px rgba(0,0,0,0.38)',
      color: '#fff',
      padding: 14,
      backdropFilter: 'blur(10px)',
    },
    friendHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    friendClose: {
      border: 'none',
      background: 'rgba(255,255,255,0.12)',
      color: '#fff',
      borderRadius: 10,
      padding: '6px 10px',
      cursor: 'pointer',
    },
    friendLabel: {
      fontSize: 12,
      opacity: 0.8,
      marginTop: 10,
    },
    friendValue: {
      marginTop: 6,
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: 0.2,
      wordBreak: 'break-word',
    },
    friendMuted: {
      fontSize: 13,
      opacity: 0.8,
    },
  };

  return (
    <div className="landing">
      <div className="bubbles" />
      <div className="bubbles2" />
      <div className="seaweed" />

      {/* DEV CONTROLS */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 1000,
        }}
      >
        <button className="octoResetBtn" onClick={resetOctopusProgress}>
          Reset Progress
        </button>
        <button className="octoRagoBtn" onClick={rago}>
          RAGO → Next Day
        </button>
        <button className="octoRago2Btn" onClick={rago2}>
          RAGO 2 ⚡ Fill All
        </button>
      </div>

      {/* HEADER */}
      <div
        className="header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '20px',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            console.log('[Landing] Profile button clicked, session.user.id =', session?.user?.id);
            setShowProfile(true);
            fetchProfile();
          }}
          style={socialBtnStyle}
        >
          👤 Profile
        </button>
        <button onClick={() => openSocial('list')} style={socialBtnStyle}>
          👥 Friends
        </button>
        <button onClick={() => openSocial('search')} style={socialBtnStyle}>
          🔍 Add
        </button>
        <button onClick={() => openSocial('notifications')} style={socialBtnStyle}>
          🔔 {hasUnread && <div style={badgeStyle} />}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', margin: '0 15px' }}>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Logged in as:</span>
          <strong style={{ color: '#646cff', fontSize: '1.1rem' }}>{fallbackUsername}</strong>
        </div>

        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="landingContent">
        <div>
          <h1 className="title">🐙Inklings🐙</h1>
          <p className="subtitle">Small splashes lead to big ripples</p>
        </div>
        <div className="octoHub">
          <div className={`octoLayer ${debugSegments ? 'octoLayer--debug' : ''}`}>
            <OctopusSegments src={octo} progress={octoState.progress} debug={debugSegments} clips={octoClips} />
          </div>
          <button className="tentacle t1" onClick={() => navigate('/yoga')}>🧘 Yoga</button>
          <button className="tentacle t2" onClick={() => navigate('/meditation')}>🧠 Meditation</button>
          <button className="tentacle t3" onClick={() => navigate('/journal')}>📓 Journal</button>
          <button className="tentacle t4" onClick={() => navigate('/diet')}>🥗 Diet</button>
          <button className="tentacle t5" onClick={() => navigate('/sleep')}>😴 Sleep</button>
        </div>
      </div>

      {/* MODALS */}
      {showSocial && (
        <SocialModal session={session} onClose={() => setShowSocial(false)} initialMode={socialMode} />
      )}

      {/* USER PROFILE — now uses the Friend-style popup UI */}
      {showProfile && (
        <div
          onClick={() => setShowProfile(false)}
          style={profileStyles.friendBackdrop}
        >
          <div style={profileStyles.friendPopup} onClick={(e) => e.stopPropagation()}>
            <div style={profileStyles.friendHeader}>
              <div style={{ fontWeight: 800 }}>User Profile</div>
              <button style={profileStyles.friendClose} onClick={() => setShowProfile(false)}>
                ✕
              </button>
            </div>

            {profileLoading && <div style={profileStyles.friendMuted}>Loading…</div>}

            {!profileLoading && (
              <>
                <div style={profileStyles.friendLabel}>Username</div>
                <div style={profileStyles.friendValue}>{profileUsername || 'User'}</div>

                <div style={profileStyles.friendLabel}>Points</div>
                <div style={profileStyles.friendValue}>{profilePoints ?? 0}</div>

                <div style={profileStyles.friendLabel}>Octopus Count</div>
                <div style={profileStyles.friendValue}>{profileOctopusCount ?? 0}</div>
              </>
            )}

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
              (Click outside to close)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
