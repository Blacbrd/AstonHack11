import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const containerStyle = {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#121212',
    color: 'white'
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
      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>Wellness Hub</h1>
      
      <button 
        style={buttonStyle}
        onClick={() => navigate('/yoga')}
      >
        🧘 Yoga & AI Form
      </button>

      <button 
        style={buttonStyle}
        onClick={() => navigate('/journal')}
      >
        📓 Journal
      </button>

      <button 
        style={buttonStyle}
        onClick={() => navigate('/diet')}
      >
        🥗 Diet Calendar
      </button>

      <button 
        style={buttonStyle}
        onClick={() => navigate('/sleep')}
      >
        😴 Sleep Tracker
      </button>
    </div>
  );
};

export default Landing;