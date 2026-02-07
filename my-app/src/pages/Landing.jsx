import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Landing = ({ session }) => {
  const navigate = useNavigate();

  // Extract username from metadata (fallback to email if username missing)
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // App.jsx listener will automatically redirect to /login
  };

  const containerStyle = {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#121212',
    color: 'white',
    position: 'relative' // needed for absolute positioning of header
  };

  const headerStyle = {
    position: 'absolute',
    top: '20px',
    right: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  const buttonStyle = {
    padding: '15px 30px',
    fontSize: '18px',
    cursor: 'pointer',
    width: '250px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#646cff',
    color: 'white',
    fontWeight: 'bold',
    transition: 'transform 0.2s'
  };

  return (
    <div style={containerStyle}>
      {/* Top Right Header */}
      <div style={headerStyle}>
        <span style={{ color: '#aaa' }}>Logged in as:</span>
        <strong style={{ color: '#646cff', fontSize: '1.1rem' }}>{username}</strong>
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

      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>Wellness Hub</h1>
      
      <button style={buttonStyle} onClick={() => navigate('/yoga')}>
        🧘 Yoga & AI Form
      </button>

      <button style={buttonStyle} onClick={() => navigate('/journal')}>
        📓 Journal
      </button>

      <button style={buttonStyle} onClick={() => navigate('/diet')}>
        🥗 Diet Calendar
      </button>

      <button style={buttonStyle} onClick={() => navigate('/sleep')}>
        😴 Sleep Tracker
      </button>
    </div>
  );
};

export default Landing;