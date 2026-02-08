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
  const [profileOctopusCount, setProfileOctopusCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  const fallbackUsername =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // --- Progress (saved locally) ---
  const [octoState, setOctoState] = useState(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    return loaded;
  });

  const [debugSegments, setDebugSegments] = useState(false);
  const [octoClips] = useState(DEFAULT_CLIPS);

  useEffect(() => {
    const loaded = loadOctoState();
    if (typeof loaded.awardedTotal !== 'number') loaded.awardedTotal = 0;
    if (typeof loaded.fullAwardedWeekId !== 'string') loaded.fullAwardedWeekId = '';
    setOctoState(loaded);
  }, [location.key]);

  useEffect(() => {
    saveOctoState(octoState);
  }, [octoState]);

  // --- Helpers ---
  const countCompletedSegments = (progress) =>
    Object.values(progress || {}).flat().filter(Boolean).length;

  const countTotalSegments = (progress) =>
    Object.values(progress || {}).reduce((a, b) => a + b.length, 0);

  const isFullyGlown = (progress) =>
    countTotalSegments(progress) > 0 &&
    countCompletedSegments(progress) === countTotalSegments(progress);

  // --- Fetch profile ---
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

  useEffect(() => {
    if (!session?.user?.id) return;
    const completed = countCompletedSegments(octoState.progress);
    const delta = completed - (octoState.awardedTotal ?? 0);

    if (delta > 0) {
      awardPointsForNewSegments(delta);
      setOctoState((p) => ({ ...p, awardedTotal: completed }));
    }
  }, [octoState.progress, session?.user?.id]);

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
  }, [octoState.progress, session?.user?.id]);

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

  return (
    <div className="landing">
      <div className="bubbles" />
      <div className="bubbles2" />
      <div className="seaweed" />

      {/* ✅ LEFT DEV CONTROLS */}
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

      {/* Header */}
      <div className="header">
        <button onClick={() => setShowProfile(true)}>👤 Profile</button>
        <button onClick={() => setShowSocial(true)}>👥 Friends</button>
        <div className="userInfo">
          <span>Logged in as</span>
          <strong>{fallbackUsername}</strong>
        </div>
      </div>

      {/* Main Content */}
      <div className="landingContent">
        <h1 className="title">Wellness Hub</h1>

        <div className="octoHub">
          <div className={`octoLayer ${debugSegments ? 'octoLayer--debug' : ''}`}>
            <OctopusSegments
              src={octo}
              progress={octoState.progress}
              debug={debugSegments}
              clips={octoClips}
            />
          </div>

          <button className="tentacle t1" onClick={() => navigate('/yoga')}>🧘 Yoga</button>
          <button className="tentacle t2" onClick={() => navigate('/meditation')}>🧠 Meditation</button>
          <button className="tentacle t3" onClick={() => navigate('/journal')}>📓 Journal</button>
          <button className="tentacle t4" onClick={() => navigate('/diet')}>🥗 Diet</button>
          <button className="tentacle t5" onClick={() => navigate('/sleep')}>😴 Sleep</button>
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
