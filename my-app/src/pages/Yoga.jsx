import React from 'react';
import { useNavigate } from 'react-router-dom';

const Yoga = () => {
  const navigate = useNavigate();

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '20px'
    },
    button: {
      padding: '15px 30px',
      fontSize: '18px',
      cursor: 'pointer',
      backgroundColor: '#646cff',
      color: 'white',
      border: 'none',
      borderRadius: '8px'
    }
  };

  return (
    <div style={styles.container}>
      <h1>Select Your Pose</h1>
      <button 
        style={styles.button} 
        onClick={() => navigate('/yoga/tree')}
      >
        Tree Pose
      </button>
      <button 
        style={styles.button} 
        onClick={() => navigate('/yoga/warrior')}
      >
        Warrior Pose
      </button>
    </div>
  );
};

export default Yoga;