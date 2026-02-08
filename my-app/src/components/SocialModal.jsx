import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SocialModal({ session, onClose, initialMode = 'search' }) {
  const [mode, setMode] = useState(initialMode); // 'search' | 'list' | 'notifications'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const myId = session.user.id;

  // Use a ref to access the current search term inside the realtime callback
  const searchTermRef = useRef(searchTerm);
  useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

  // ---------------------------
  // 1. INITIAL FETCH & REALTIME
  // ---------------------------
  useEffect(() => {
    fetchFriends();
    fetchNotifications();

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('public:relationships')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'relationships' }, 
        (payload) => {
          // Identify the record involved (New for Insert/Update, Old for Delete)
          const record = payload.new || payload.old;

          if (!record) return;

          // Check if this change involves me
          const involvesMe = 
            record.follower_id === myId || 
            record.following_id === myId;

          if (involvesMe) {
            console.log("Realtime update detected, refreshing data...");
            fetchFriends();
            // If a search is currently active, re-run it to update button states (Pending -> Add Friend)
            if (searchTermRef.current.trim()) {
              executeSearch(searchTermRef.current);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce for typing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      executeSearch(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);


  // ---------------------------
  // 2. DATA FETCHING
  // ---------------------------

  const fetchFriends = async () => {
    try {
      const { data: relationships, error } = await supabase
        .from('relationships')
        .select('following_id')
        .eq('follower_id', myId)
        .eq('status', 'accepted');

      if (error) throw error;

      if (relationships && relationships.length > 0) {
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
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id (username, email)
        `)
        .eq('user_id', myId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // ---------------------------
  // 3. SEARCH LOGIC
  // ---------------------------

  const executeSearch = async (term) => {
    setLoading(true);
    try {
      // 1. Find Users matching term
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
        .neq('id', myId) 
        .limit(20);

      if (error) throw error;

      // 2. Check Relationships status for these users
      const userIds = users.map(u => u.id);
      
      // Check requests I sent (Me -> Them)
      const { data: myRequests } = await supabase
        .from('relationships')
        .select('following_id, status')
        .eq('follower_id', myId)
        .in('following_id', userIds);

      // Check requests I received (Them -> Me)
      const { data: theirRequests } = await supabase
        .from('relationships')
        .select('follower_id, status')
        .eq('following_id', myId)
        .in('follower_id', userIds);

      // Map status to users
      const processedUsers = users.map(user => {
        const myReq = myRequests.find(r => r.following_id === user.id);
        const theirReq = theirRequests.find(r => r.follower_id === user.id);

        let status = 'none'; // none, friends, pending_sent, pending_received
        
        // Priority: Friends > Pending Sent > Pending Received
        if (myReq?.status === 'accepted' || theirReq?.status === 'accepted') status = 'friends';
        else if (myReq?.status === 'pending') status = 'pending_sent';
        else if (theirReq?.status === 'pending') status = 'pending_received';

        return { ...user, status };
      });

      setSearchResults(processedUsers);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // 4. ACTIONS
  // ---------------------------

  const sendFriendRequest = async (targetUser) => {
    // Edge Case: If they already sent me a request, just accept it
    if (targetUser.status === 'pending_received') {
      await acceptRequest(targetUser.id, targetUser.username);
      return;
    }

    try {
      // 1. Insert 'pending' relationship (Me -> Them)
      const { error: relError } = await supabase
        .from('relationships')
        .insert([{ follower_id: myId, following_id: targetUser.id, status: 'pending' }]);

      if (relError) throw relError;

      // 2. Create Notification for them
      await supabase.from('notifications').insert([{
        user_id: targetUser.id,
        sender_id: myId,
        type: 'friend_request'
      }]);

      // Optimistic UI Update
      setSearchResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, status: 'pending_sent' } : u));

    } catch (err) {
      console.error('Error sending request:', err);
      alert('Could not send request. You may already be connected.');
    }
  };

  const acceptRequest = async (senderId, senderName) => {
    try {
      // 1. Update their request to 'accepted'
      // NOTE: We update via follower_id (them) -> following_id (me)
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ status: 'accepted' })
        .eq('follower_id', senderId)
        .eq('following_id', myId);

      if (updateError) throw updateError;

      // 2. Insert my reciprocal 'accepted' relationship (Me -> Them)
      const { error: insertError } = await supabase
        .from('relationships')
        .insert([{ follower_id: myId, following_id: senderId, status: 'accepted' }]);

      if (insertError && insertError.code !== '23505') { // Ignore unique constraint violation if already exists
         throw insertError; 
      }

      // 3. Send Notification back to them
      await supabase.from('notifications').insert([{
        user_id: senderId,
        sender_id: myId,
        type: 'request_accepted'
      }]);

      // 4. Delete the "Friend Request" notification I received
      await supabase.from('notifications').delete().match({ user_id: myId, sender_id: senderId, type: 'friend_request' });

      // Refreshing handled by Realtime + Manual Fetch
      fetchNotifications();

    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const declineRequest = async (senderId, senderName) => {
    try {
      // 1. Delete the relationship row completely (This removes the "Pending" status from DB)
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('follower_id', senderId)
        .eq('following_id', myId);

      if (error) throw error;

      // 2. Send Notification back to them (Optional, but nice)
      await supabase.from('notifications').insert([{
        user_id: senderId,
        sender_id: myId,
        type: 'request_declined'
      }]);

      // 3. Delete the "Friend Request" notification I received
      await supabase.from('notifications').delete().match({ user_id: myId, sender_id: senderId, type: 'friend_request' });

      fetchNotifications();
      // Realtime listener will catch the DELETE on 'relationships' and update the search UI

    } catch (err) {
      console.error('Error declining request:', err);
    }
  };

  const clearNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ---------------------------
  // 5. RENDER
  // ---------------------------

  const requestCount = notifications.filter(n => n.type === 'friend_request').length;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>Social</h2>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        {/* TABS */}
        <div style={styles.tabs}>
          <button style={mode === 'search' ? styles.activeTab : styles.tab} onClick={() => setMode('search')}>
            🔍 Search
          </button>
          <button style={mode === 'list' ? styles.activeTab : styles.tab} onClick={() => setMode('list')}>
            👥 Friends
          </button>
          <button style={mode === 'notifications' ? styles.activeTab : styles.tab} onClick={() => setMode('notifications')}>
            🔔 Alerts {requestCount > 0 && <span style={styles.badge}>{requestCount}</span>}
          </button>
        </div>

        <div style={styles.content}>
          {/* --- SEARCH MODE --- */}
          {mode === 'search' && (
            <>
              <input
                type="text"
                placeholder="Type a name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <div style={styles.list}>
                {searchResults.map(user => (
                  <div key={user.id} style={styles.userRow}>
                    <UserInfo user={user} />
                    
                    {user.status === 'friends' && (
                      <span style={styles.statusLabel}>Friends</span>
                    )}
                    {user.status === 'pending_sent' && (
                      <button style={styles.btnDisabled} disabled>Pending...</button>
                    )}
                    {user.status === 'pending_received' && (
                      <button 
                        style={styles.btnAccept} 
                        onClick={() => acceptRequest(user.id, user.username)}
                      >
                        Accept
                      </button>
                    )}
                    {user.status === 'none' && (
                      <button 
                        style={styles.btnAdd} 
                        onClick={() => sendFriendRequest(user)}
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                ))}
                {searchTerm && searchResults.length === 0 && !loading && (
                   <p style={{textAlign:'center', color:'#666', marginTop: 20}}>No users found.</p>
                )}
              </div>
            </>
          )}

          {/* --- FRIENDS LIST MODE --- */}
          {mode === 'list' && (
            <div style={styles.list}>
               {friends.length === 0 && <p style={{textAlign:'center', color:'#666'}}>No friends yet.</p>}
               {friends.map(f => (
                 <div key={f.id} style={styles.userRow}>
                   <UserInfo user={f} />
                   <span style={{color: '#4caf50', fontSize:'0.8rem'}}>Connected</span>
                 </div>
               ))}
            </div>
          )}

          {/* --- NOTIFICATIONS MODE --- */}
          {mode === 'notifications' && (
            <div style={styles.list}>
              {notifications.length === 0 && <p style={{textAlign:'center', color:'#666'}}>No new notifications.</p>}
              
              {notifications.map(notif => (
                <div key={notif.id} style={styles.notifRow}>
                  <div style={{marginBottom: 8}}>
                    {notif.type === 'friend_request' && (
                      <span><strong>{notif.sender?.username || 'Someone'}</strong> sent you a friend request.</span>
                    )}
                    {notif.type === 'request_accepted' && (
                      <span><strong>{notif.sender?.username}</strong> is now your friend!</span>
                    )}
                    {notif.type === 'request_declined' && (
                      <span><strong>{notif.sender?.username}</strong> politely declined your request.</span>
                    )}
                  </div>

                  {/* Actions for Friend Request */}
                  {notif.type === 'friend_request' ? (
                    <div style={{display:'flex', gap: 10}}>
                      <button 
                        style={styles.btnAccept} 
                        onClick={() => acceptRequest(notif.sender_id, notif.sender?.username)}
                      >
                        Accept
                      </button>
                      <button 
                        style={styles.btnDecline} 
                        onClick={() => declineRequest(notif.sender_id, notif.sender?.username)}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <button style={styles.btnSmall} onClick={() => clearNotification(notif.id)}>Dismiss</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Component for Avatar + Name
const UserInfo = ({ user }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={styles.avatar}>
      {(user.username?.[0] || user.email?.[0] || '?').toUpperCase()}
    </div>
    <div>
      <div style={{ fontWeight: 'bold' }}>{user.username || 'User'}</div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</div>
    </div>
  </div>
);

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 2000
  },
  modal: {
    backgroundColor: '#1e1e1e',
    width: '90%', maxWidth: '500px',
    borderRadius: '12px', padding: '24px',
    color: 'white',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    maxHeight: '85vh', overflowY: 'auto'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer'
  },
  tabs: {
    display: 'flex', gap: 15, borderBottom: '1px solid #333', marginBottom: 20
  },
  tab: {
    padding: '10px 5px', background: 'none', border: 'none', 
    color: '#888', cursor: 'pointer', fontSize: '1rem', position: 'relative'
  },
  activeTab: {
    padding: '10px 5px', background: 'none', border: 'none', 
    color: '#646cff', cursor: 'pointer', fontSize: '1rem', 
    borderBottom: '2px solid #646cff', fontWeight: 'bold'
  },
  badge: {
    backgroundColor: 'red', color: 'white', borderRadius: '50%', 
    padding: '2px 6px', fontSize: '0.7rem', verticalAlign: 'top', marginLeft: 4
  },
  input: {
    width: '100%', padding: '12px', borderRadius: '8px', 
    border: '1px solid #444', background: '#2a2a2a', color: 'white',
    fontSize: '1rem', marginBottom: 15
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 10
  },
  userRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '8px'
  },
  notifRow: {
    padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px', 
    borderLeft: '4px solid #646cff'
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    backgroundColor: '#444', display: 'flex', 
    justifyContent: 'center', alignItems: 'center', fontWeight: 'bold'
  },
  btnAdd: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#646cff', color: 'white', cursor: 'pointer', fontWeight: 'bold'
  },
  btnAccept: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#4caf50', color: 'white', cursor: 'pointer', fontWeight: 'bold'
  },
  btnDecline: {
    padding: '6px 14px', borderRadius: '6px', border: '1px solid #555',
    background: 'transparent', color: '#ccc', cursor: 'pointer'
  },
  btnDisabled: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    background: '#333', color: '#777', cursor: 'not-allowed'
  },
  btnSmall: {
     padding: '4px 10px', fontSize: '0.8rem', borderRadius: '4px',
     background: '#333', border: 'none', color: '#aaa', cursor: 'pointer'
  },
  statusLabel: {
    color: '#888', fontSize: '0.9rem', fontStyle: 'italic'
  }
};