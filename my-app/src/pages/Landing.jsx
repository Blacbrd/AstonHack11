import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SocialModal from '../components/SocialModal';

const Landing = ({ session }) => {
  const navigate = useNavigate();
  const [showSocial, setShowSocial] = useState(false);
  const [socialMode, setSocialMode] = useState('search'); 
  const [hasUnread, setHasUnread] = useState(false);

  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    checkNotifications();
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, 
      () => {
        setHasUnread(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [session.user.id]);

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
    if (mode === 'notifications') setHasUnread(false); // Clear badge locally
  };

  const containerStyle = {
    height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', gap: '20px', backgroundColor: '#121212', color: 'white', position: 'relative' 
  };

  const headerStyle = {
    position: 'absolute', top: '20px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px'
  };

  const buttonStyle = {
    padding: '15px 30px', fontSize: '18px', cursor: 'pointer', width: '250px',
    border: 'none', borderRadius: '8px', backgroundColor: '#646cff', color: 'white',
    fontWeight: 'bold', transition: 'transform 0.2s'
  };

  const socialBtnStyle = {
    padding: '8px 12px', backgroundColor: '#2a2a2a', color: '#eee',
    border: '1px solid #444', borderRadius: '6px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', position: 'relative'
  };

  const badgeStyle = {
    position: 'absolute', top: -5, right: -5, width: 10, height: 10,
    backgroundColor: 'red', borderRadius: '50%', border: '2px solid #121212'
  };

  return (
    <div style={containerStyle}>
      {/* --- Header Section --- */}
      <div style={headerStyle}>
        
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Logged in as:</span>
          <strong style={{ color: '#646cff', fontSize: '1rem' }}>{username}</strong>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px', backgroundColor: '#333', color: 'white',
            border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px'
          }}
        >
          Sign Out
        </button>
      </div>

      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>Wellness Hub</h1>
      
      <button style={buttonStyle} onClick={() => navigate('/yoga')}>🧘 Yoga & AI Form</button>
      <button style={buttonStyle} onClick={() => navigate('/meditation')}>🧠 Meditation (AI)</button>
      <button style={buttonStyle} onClick={() => navigate('/journal')}>📓 Journal</button>
      <button style={buttonStyle} onClick={() => navigate('/diet')}>🥗 Diet Calendar</button>
      <button style={buttonStyle} onClick={() => navigate('/sleep')}>😴 Sleep Tracker</button>

      {/* --- Social Modal --- */}
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