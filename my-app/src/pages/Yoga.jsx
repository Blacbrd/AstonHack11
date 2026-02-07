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
      gap: '20px',
      backgroundColor: '#f0f0f0'
    },
    button: {
      padding: '15px 30px',
      fontSize: '18px',
      cursor: 'pointer',
      backgroundColor: '#646cff',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      width: '200px'
    },
    backButton: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '10px 20px',
      fontSize: '14px',
      cursor: 'pointer',
      backgroundColor: '#333',
      color: 'white',
      border: 'none',
      borderRadius: '6px'
    }
  };

  return (
    <div style={styles.container}>
      <button 
        style={styles.backButton} 
        onClick={() => navigate('/')}  // change this if Landing route is different
      >
        ← Back
      </button>

      <h1 style={{color: '#333'}}>Select Your Pose</h1>

      <button style={styles.button} onClick={() => navigate('/yoga/tree')}>
        Tree Pose
      </button>

      <button style={styles.button} onClick={() => navigate('/yoga/warrior')}>
        Warrior Pose
      </button>

      <button style={styles.button} onClick={() => navigate('/yoga/sphinx')}>
        Sphinx Pose
      </button>
    </div>
  );
};

export default Yoga;
