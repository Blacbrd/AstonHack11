import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SocialModal from '../components/SocialModal';
import './Landing.css';
import octo from '../images/octo.png';

const Landing = ({ session }) => {
  const navigate = useNavigate();
  
  // --- Social & Notification State ---
  const [showSocial, setShowSocial] = useState(false);
  const [socialMode, setSocialMode] = useState('search'); 
  const [hasUnread, setHasUnread] = useState(false);

  // Ref to track channel for cleanup
  const channelRef = useRef(null);

  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'User';

  // --- Realtime Notifications Logic (Fixed) ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const myId = session.user.id;
    let isMounted = true;

    // 1. Initial Check
    checkNotifications();

    // 2. Define Subscription Logic
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

    // 3. Safety Timer (Prevents WebSocket crash in Strict Mode)
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
        .select('id', { count: 'exact', head: true }) // head:true is faster, just gets count
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error("[Landing] Error checking notifications:", error);
        return;
      }

      console.log(`[Landing] Found ${count} unread notifications.`);
      if (count > 0) setHasUnread(true);
      else setHasUnread(false);
    } catch (err) {
      console.error("[Landing] Check failed:", err);
    }
  };

  const handleLogout = async () => {
    // Cleanup before logout
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    await supabase.auth.signOut();
  };

  const openSocial = (mode) => {
    setSocialMode(mode);
    setShowSocial(true);
    // Note: We don't clear 'hasUnread' instantly here; 
    // usually you clear it after the user views/dismisses them in the modal.
    // But if you want to clear the red dot immediately upon opening:
    // setHasUnread(false); 
  };

  // --- Styles for Header Buttons (Social) ---
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
    // 1) Full-page background container (Ocean Theme)
    <div className="landing">
      
      <div className="bubbles"></div>
      <div className="bubbles2"></div>
      <div className="seaweed"></div>

      {/* 2) Header with Social Buttons & User Info */}
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '20px', position: 'absolute', top: 0, right: 0, width: '100%', boxSizing: 'border-box', zIndex: 10 }}>
        
        {/* Social Actions */}
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
          <strong style={{ color: '#646cff', fontSize: '1.1rem' }}>{username}</strong>
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

      {/* 3) Main Octopus Content */}
      <div className="landingContent">
        <h1 className="title">Wellness Hub</h1>

        <div className="octoHub">
          {/* Centered big octopus */}
          <img className="octo" src={octo} alt="Octopus mascot" />

          {/* Button near left tentacle tip */}
          <button className="tentacle t1" onClick={() => navigate('/yoga')}>
            🧘 Yoga & AI Form
          </button>

          {/* Button near upper-left tentacle tip */}
          <button className="tentacle t2" onClick={() => navigate('/meditation')}>
            🧠 Meditation (AI)
          </button>

          {/* Button near bottom-middle tentacle tip */}
          <button className="tentacle t3" onClick={() => navigate('/journal')}>
            📓 Journal
          </button>

          {/* Button near upper-right tentacle tip */}
          <button className="tentacle t4" onClick={() => navigate('/diet')}>
            🥗 Diet Calendar
          </button>

          {/* Button near right tentacle tip */}
          <button className="tentacle t5" onClick={() => navigate('/sleep')}>
            😴 Sleep Tracker
          </button>
          
          <button className="tentacle t6 disabled" disabled>
            🔒 Coming Soon
          </button>

        </div>
      </div>

      {/* 4) Social Modal Overlay */}
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