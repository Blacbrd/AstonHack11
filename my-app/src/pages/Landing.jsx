import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column'
    }}>
      <h1>Landing page</h1>
      <button 
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
        onClick={() => navigate('/yoga')}
      >
        Go to Yoga Page
      </button>
    </div>
  );
};

export default Landing;