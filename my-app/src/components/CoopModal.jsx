import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CoopModal({ session, onClose, onJoinRoom }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const myId = session.user.id;

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const { data: relationships, error } = await supabase
        .from('relationships')
        .select('following_id')
        .eq('follower_id', myId)
        .eq('status', 'accepted');

      if (error) throw error;

      if (relationships.length > 0) {
        const friendIds = relationships.map(r => r.following_id);
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);
        setFriends(friendProfiles || []);
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(f => 
    (f.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>Start Co-op Session</h2>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        <input 
          type="text" 
          placeholder="Search friends..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.input}
        />

        <div style={styles.list}>
          {loading && <p style={{color:'#888'}}>Loading friends...</p>}
          {!loading && filteredFriends.length === 0 && <p style={{color:'#888'}}>No friends found.</p>}
          
          {filteredFriends.map(friend => (
            <div key={friend.id} style={styles.row}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={styles.avatar}>
                  {(friend.username?.[0] || friend.email?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:'bold'}}>{friend.username || 'User'}</div>
                  <div style={{fontSize:'0.8rem', opacity:0.7}}>{friend.email}</div>
                </div>
              </div>
              <button 
                style={styles.joinBtn}
                onClick={() => onJoinRoom(friend)}
              >
                Enter Room
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 3000
  },
  modal: {
    backgroundColor: '#1e1e1e', width: '90%', maxWidth: '450px',
    borderRadius: '12px', padding: '24px', color: 'white',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)', maxHeight: '80vh', overflowY: 'auto'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer'
  },
  input: {
    width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '20px',
    border: '1px solid #444', background: '#2a2a2a', color: 'white'
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '8px'
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    backgroundColor: '#444', display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  joinBtn: {
    padding: '8px 16px', borderRadius: '6px', border: 'none',
    background: '#646cff', color: 'white', cursor: 'pointer', fontWeight: 'bold'
  }
};