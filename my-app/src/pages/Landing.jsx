// 1) React import
import React from 'react';
// 2) Router navigation hook
import { useNavigate } from 'react-router-dom';
// 3) Supabase client
import { supabase } from '../lib/supabaseClient';
// 4) Page CSS (ocean + bubbles + seaweed + octo layout)
import './Landing.css';
// 5) Import your octopus image from src/images
import octo from '../images/octo.png';

const Landing = ({ session }) => {
  // 6) Create navigate function
  const navigate = useNavigate();

  // 7) Pick username from metadata, else email prefix, else fallback
  const username =
    session?.user?.user_metadata?.username ||
    session?.user?.email?.split('@')[0] ||
    'User';

  // 8) Sign out handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    // 9) Full-page background container
    <div className="landing">
      
      <div className="bubbles"></div>
      <div className="bubbles2"></div>
      <div className="seaweed"></div>

      {/* 10) Top-right header */}
      <div className="header">
        {/* 11) Label */}
        <span style={{ color: '#aaa' }}>Logged in as:</span>
        {/* 12) Username */}
        <strong style={{ color: '#646cff', fontSize: '1.1rem' }}>
          {username}
        </strong>
        {/* 13) Sign out button */}
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

      {/* 14) Content sits above bubbles/seaweed layers */}
      <div className="landingContent">
        {/* 15) Title */}
        <h1 className="title">Wellness Hub</h1>

        {/* 16) Octopus + tentacle buttons hub */}
        <div className="octoHub">
          {/* 17) Centered big octopus */}
          <img className="octo" src={octo} alt="Octopus mascot" />

          {/* 18) Button near left tentacle tip */}
          <button className="tentacle t1" onClick={() => navigate('/yoga')}>
            🧘 Yoga & AI Form
          </button>

          {/* 19) Button near upper-left tentacle tip */}
          <button className="tentacle t2" onClick={() => navigate('/meditation')}>
            🧠 Meditation (AI)
          </button>

          {/* 20) Button near bottom-middle tentacle tip */}
          <button className="tentacle t3" onClick={() => navigate('/journal')}>
            📓 Journal
          </button>

          {/* 21) Button near upper-right tentacle tip */}
          <button className="tentacle t4" onClick={() => navigate('/diet')}>
            🥗 Diet Calendar
          </button>

          {/* 22) Button near right tentacle tip */}
          <button className="tentacle t5" onClick={() => navigate('/sleep')}>
            😴 Sleep Tracker
          </button>
          <button className="tentacle t6 disabled" disabled>
          🔒 Coming Soon
            </button>

        </div>
      </div>
    </div>
  );
};

export default Landing;
