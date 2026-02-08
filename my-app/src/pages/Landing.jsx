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

  // --- 1. Notification & Social State (From Main) ---
  const [showSocial, setShowSocial] = useState(false);
  const [socialMode, setSocialMode] = useState('search');
  const [hasUnread, setHasUnread] = useState(false);
  
  // Ref to track channel for cleanup
  const channelRef = useRef(null);

  // --- 2. Profile & Octopus State (From Grow Tentacles) ---
  const [showProfile, setShowProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePoints, setProfilePoints] = useState(0);
  const [profileOctopusCount, setProfileOctopusCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fallback username logic
  const fallbackUsername =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // --- 3. Octopus Progress State (Local Storage) ---
  const [octoState, setOctoState] = useState(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    return loaded;
  });

  const [debugSegments, setDebugSegments] = useState(false);
  const [octoClips] = useState(DEFAULT_CLIPS);

  // Reload local state if location changes (e.g. returning from a task)
  useEffect(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    setOctoState(loaded);
  }, [location.key]);

  // Save state whenever it changes
  useEffect(() => {
    saveOctoState(octoState);
  }, [octoState]);

  // --- 4. Realtime Notifications Logic (The Fix from Main) ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const myId = session.user.id;
    let isMounted = true;

    // Initial Check
    checkNotifications();

    // Define Subscription Logic
    const connectRealtime = () => {
      if (!isMounted) return;

      // Clean up existing channel if any
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      console.log("[Landing] Subscribing to notifications...");

      const channel = supabase
        .channel(`public:notifications:${myId}`)
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications', 
            filter: `user_id=eq.${myId}` 
          }, 
          (payload) => {
            console.log("🔔 [Landing] New Notification!", payload);
            setHasUnread(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("[Landing] Connected to notifications.");
          }
        });

      channelRef.current = channel;
    };

    // Safety Timer (Prevents WebSocket crash in Strict Mode)
    const timer = setTimeout(() => {
      connectRealtime();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session.user.id]);

  const checkNotifications = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true }) 
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error("[Landing] Error checking notifications:", error);
        return;
      }

      if (count > 0) setHasUnread(true);
      else setHasUnread(false);
    } catch (err) {
      console.error("[Landing] Check failed:", err);
    }
  };

  // --- 5. Profile & Gamification Logic ---
  
  // Helpers
  const countCompletedSegments = (progress) =>
    Object.values(progress || {}).flat().filter(Boolean).length;

  const countTotalSegments = (progress) =>
    Object.values(progress || {}).reduce((a, b) => a + b.length, 0);

  const isFullyGlown = (progress) =>
    countTotalSegments(progress) > 0 &&
    countCompletedSegments(progress) === countTotalSegments(progress);

  // Fetch Profile Data
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, points, octopus_count')
        .eq('id', session.user.id)
        .single();

      setProfileUsername(data?.username || fallbackUsername);
      setProfilePoints(data?.points ?? 0);
      setProfileOctopusCount(data?.octopus_count ?? 0);
    } finally {
      setProfileLoading(false);
    }
  }, [session?.user?.id, fallbackUsername]);

  useEffect(() => {
    if (session?.user?.id) fetchProfile();
  }, [session?.user?.id, fetchProfile]);

  // Award Points
  const awardPointsForNewSegments = useCallback(async (delta) => {
    if (!session?.user?.id || delta <= 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', session.user.id)
      .single();

    const next = (data?.points ?? 0) + delta;
    await supabase.from('profiles').update({ points: next }).eq('id', session.user.id);
    setProfilePoints(next);
  }, [session?.user?.id]);

  // Award Full Octopus
  const awardOctopusForFullGlow = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('octopus_count')
      .eq('id', session.user.id)
      .single();

    const next = (data?.octopus_count ?? 0) + 1;
    await supabase.from('profiles').update({ octopus_count: next }).eq('id', session.user.id);
    setProfileOctopusCount(next);
  }, [session?.user?.id]);

  // Watch for progress updates
  useEffect(() => {
    if (!session?.user?.id) return;
    const completed = countCompletedSegments(octoState.progress);
    const delta = completed - (octoState.awardedTotal ?? 0);

    if (delta > 0) {
      awardPointsForNewSegments(delta);
      setOctoState((p) => ({ ...p, awardedTotal: completed }));
    }
  }, [octoState.progress, session?.user?.id, octoState.awardedTotal, awardPointsForNewSegments]);

  // Watch for Full Completion
  useEffect(() => {
    if (!session?.user?.id) return;
    const weekId = octoState.weekId || getWeekId();

    if (
      isFullyGlown(octoState.progress) &&
      octoState.fullAwardedWeekId !== weekId
    ) {
      awardOctopusForFullGlow();
      setOctoState((p) => ({ ...p, fullAwardedWeekId: weekId }));
    }
  }, [octoState.progress, session?.user?.id, octoState.fullAwardedWeekId, octoState.weekId, awardOctopusForFullGlow]);

  // --- 6. Actions (Logout, Social, Dev Tools) ---

  const handleLogout = async () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    await supabase.auth.signOut();
  };

  const openSocial = (mode) => {
    setSocialMode(mode);
    setShowSocial(true);
    if (mode === 'notifications') setHasUnread(false);
  };

  // Dev Tools
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

  // --- Styles ---
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
    marginRight: '10px'
  };

  const badgeStyle = {
    position: 'absolute', top: -5, right: -5, width: 10, height: 10,
    backgroundColor: 'red', borderRadius: '50%', border: '2px solid #121212'
  };

  return (
    <div className="landing">
      <div className="bubbles" />
      <div className="bubbles2" />
      <div className="seaweed" />

      {/* LEFT DEV CONTROLS (For Demo) */}
      <div style={{
        position: 'fixed',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 1000
      }}>
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

      {/* HEADER: Merged Social & Profile Buttons */}
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '20px', position: 'absolute', top: 0, right: 0, width: '100%', boxSizing: 'border-box', zIndex: 10 }}>
        
        {/* Profile Button (New) */}
        <button onClick={() => setShowProfile(true)} style={socialBtnStyle}>
          👤 Profile
        </button>

        {/* Social Actions (Existing) */}
        <button onClick={() => openSocial('list')} style={socialBtnStyle}>
          👥 Friends
        </button>
        
        <button onClick={() => openSocial('search')} style={socialBtnStyle}>
          🔍 Add
        </button>

        <button onClick={() => openSocial('notifications')} style={socialBtnStyle}>
          🔔
          {hasUnread && <div style={badgeStyle} />}
        </button>

        {/* User Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', margin: '0 15px' }}>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Logged in as:</span>
          <strong style={{ color: '#646cff', fontSize: '1.1rem' }}>{fallbackUsername}</strong>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="landingContent">
        <h1 className="title">Wellness Hub</h1>

        <div className="octoHub">
          {/* Octopus Segments Layer */}
          <div className={`octoLayer ${debugSegments ? 'octoLayer--debug' : ''}`}>
            <OctopusSegments
              src={octo}
              progress={octoState.progress}
              debug={debugSegments}
              clips={octoClips}
            />
          </div>

          {/* Navigation Buttons (Tentacles) */}
          <button className="tentacle t1" onClick={() => navigate('/yoga')}>🧘 Yoga</button>
          <button className="tentacle t2" onClick={() => navigate('/meditation')}>🧠 Meditation</button>
          <button className="tentacle t3" onClick={() => navigate('/journal')}>📓 Journal</button>
          <button className="tentacle t4" onClick={() => navigate('/diet')}>🥗 Diet</button>
          <button className="tentacle t5" onClick={() => navigate('/sleep')}>😴 Sleep</button>
        </div>
      </div>

      {/* MODALS */}
      {showSocial && (
        <SocialModal
          session={session}
          onClose={() => setShowSocial(false)}
          initialMode={socialMode}
        />
      )}
      
      {/* Note: showProfile is managed, but the ProfileModal code wasn't 
        in the snippet. If you have a <ProfileModal>, render it here:
        {showProfile && <ProfileModal ... onClose={() => setShowProfile(false)} />}
      */}
    </div>
  );
};

export default Landing;