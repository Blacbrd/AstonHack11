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
      backgroundColor: '#f0f0f0' // added a light bg for better contrast
    },
    button: {
      padding: '15px 30px',
      fontSize: '18px',
      cursor: 'pointer',
      backgroundColor: '#646cff',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      width: '200px', // Fixed width for consistency
      transition: 'background-color 0.3s'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={{color: '#333'}}>Select Your Pose</h1>
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
      <button 
        style={styles.button} 
        onClick={() => navigate('/yoga/sphinx')}
      >
        Sphinx Pose
      </button>
    </div>
  );
};

export default Yoga;