import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Yoga.css'

// Modal to pick a friend to join
const RequestModal = ({ friends, onClose, onRequest }) => (
  <div className="yogaModalOverlay">
    <div className="yogaModal">
      <h3>Request to Join</h3>
      <p className="yogaHint">Select a friend. They will become the Host.</p>
      <div className="yogaFriendList">
        {friends.length === 0 ? <p>No friends found.</p> : friends.map(f => (
          <div key={f.id} className="yogaFriendRow">
            <span>{f.username || f.email}</span>
            <button onClick={() => onRequest(f)}>Request</button>
          </div>
        ))}
      </div>
      <button className="yogaCloseBtn" onClick={onClose}>Cancel</button>
    </div>
  </div>
)

// Notifications Dropdown
const NotificationsDropdown = ({ invites, onAccept, onDecline, onClose }) => (
  <div className="yogaNotifDropdown">
    <div className="yogaNotifHeader">
      <h4>Requests</h4>
      <button onClick={onClose}>✕</button>
    </div>
    {invites.length === 0 ? (
      <div className="yogaNotifEmpty">No pending requests</div>
    ) : (
      invites.map(inv => (
        <div key={inv.id} className="yogaNotifItem">
          <p><strong>{inv.sender?.username || 'User'}</strong> wants to join.</p>
          <div className="yogaNotifActions">
            <button className="yogaAcceptBtn" onClick={() => onAccept(inv)}>Accept</button>
            <button className="yogaDeclineBtn" onClick={() => onDecline(inv)}>Decline</button>
          </div>
        </div>
      ))
    )}
  </div>
)

export default function Yoga() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  
  // Room & Role State
  const [room, setRoom] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  
  // UI State
  const [showModal, setShowModal] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [friends, setFriends] = useState([])
  const [invites, setInvites] = useState([])

  const channelRef = useRef(null)

  // 1. Init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        console.log(`[Yoga] Init for user: ${session.user.id}`)
        fetchFriends(session.user.id)
        checkActiveRoom(session.user.id)
        fetchYogaNotifications(session.user.id)
      }
    })
  }, [])

  // 2. Realtime Listener (Safe Version with Timeout)
  useEffect(() => {
    if (!session) return

    const myId = session.user.id
    let isMounted = true

    // Define connection logic
    const connect = () => {
      if (!isMounted) return
      
      const channelId = `yoga-hub:${myId}`
      
      // Cleanup previous channel to prevent duplicates/crashes
      if (channelRef.current) supabase.removeChannel(channelRef.current)

      console.log(`[Yoga] Connecting Realtime...`)

      const channel = supabase
        .channel(channelId)
        
        // A. Listen for Room Updates (Accept/Pose Change/Delete)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'yoga_rooms' }, 
          async (payload) => {
            const rec = payload.new || payload.old
            
            // Filter: only care if I am host or joiner
            if (rec.host_id !== myId && rec.joiner_id !== myId) return

            console.log('[Yoga] Realtime Room Event:', payload.eventType)

            // DELETE = Room Closed
            if (payload.eventType === 'DELETE') {
              setRoom(null)
              setPartnerName('')
              alert("Session ended.")
              return
            }

            // INSERT/UPDATE = Refresh State
            // We force a full fetch to ensure we get partner names and fresh status
            await checkActiveRoom(myId)

            // Auto-Navigate if Pose Selected (and room is active)
            if (payload.new && payload.new.current_pose && payload.new.status === 'active') {
              const r = payload.new
              const iamHost = r.host_id === myId
              const partnerId = iamHost ? r.joiner_id : r.host_id
              console.log(`[Yoga] Auto-navigating to ${r.current_pose}`)
              navigate(`/yoga/${r.current_pose}?coop_user=${partnerId}`)
            }
          }
        )
        
        // B. Listen for Invites (Insert into yoga_notifications)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'yoga_notifications', filter: `user_id=eq.${myId}` },
          (payload) => {
            console.log("🔔 [Yoga] Invite Received!", payload)
            // Immediately fetch the new notification to update the Bell count
            fetchYogaNotifications(myId)
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    // Safety Timer: Wait 100ms before connecting. 
    // If React Strict Mode unmounts the component during this time, 'connect()' never runs.
    const timer = setTimeout(() => connect(), 100)

    return () => { 
      isMounted = false
      clearTimeout(timer)
      if (channelRef.current) supabase.removeChannel(channelRef.current) 
    }
  }, [session, navigate])

  // --- Data Fetching ---

  const checkActiveRoom = async (userId) => {
    const { data } = await supabase.from('yoga_rooms')
      .select('*')
      .or(`host_id.eq.${userId},joiner_id.eq.${userId}`)
      .maybeSingle()
    
    if (data) {
      console.log("[Yoga] Syncing room state:", data.status)
      setRoom(data)
      const iamHost = data.host_id === userId
      setIsHost(iamHost)
      
      // Fetch Partner Name
      const pid = iamHost ? data.joiner_id : data.host_id
      const { data: p } = await supabase.from('profiles').select('username').eq('id', pid).single()
      if (p) setPartnerName(p.username)
    } else {
      setRoom(null)
    }
  }

  const fetchFriends = async (userId) => {
    const { data } = await supabase.from('relationships')
      .select('following_id').eq('follower_id', userId).eq('status', 'accepted')
    if (data && data.length > 0) {
      const ids = data.map(r => r.following_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      setFriends(profiles || [])
    }
  }

  const fetchYogaNotifications = async (userId) => {
    // This join relies on the SQL FK to profiles
    const { data, error } = await supabase
      .from('yoga_notifications')
      .select(`*, sender:profiles!sender_id(username)`)
      .eq('user_id', userId)
    
    if (!error) setInvites(data || [])
    else console.error("[Yoga] Fetch Notifs Error:", error)
  }

  // --- Actions ---

  const handleRequestJoin = async (friend) => {
    try {
      const myId = session.user.id
      console.log(`[Yoga] Sending request to ${friend.username}...`)
      
      // 1. Create Pending Room
      const { error: rErr } = await supabase.from('yoga_rooms').insert([{
        joiner_id: myId,
        host_id: friend.id, 
        status: 'pending'
      }])
      if (rErr) throw rErr

      // 2. Send Notification
      const { error: nErr } = await supabase.from('yoga_notifications').insert([{
        user_id: friend.id,
        sender_id: myId,
        type: 'invite'
      }])
      if (nErr) throw nErr

      setShowModal(false)
      
      // FORCE UPDATE: Immediately show "Waiting for..." without waiting for Realtime
      await checkActiveRoom(myId)
      
    } catch (e) {
      console.error("[Yoga] Request Failed:", e)
      alert("Could not send request.")
    }
  }

  const acceptRequest = async (invite) => {
    const myId = session.user.id
    console.log("[Yoga] Accepting invite...")

    // 1. Find the pending room
    const { data: pendingRoom } = await supabase
      .from('yoga_rooms')
      .select('room_id')
      .eq('host_id', myId)
      .eq('joiner_id', invite.sender_id)
      .eq('status', 'pending')
      .single()

    if (pendingRoom) {
      // 2. Activate Room (This triggers Realtime update for BOTH users)
      await supabase.from('yoga_rooms').update({ status: 'active' }).eq('room_id', pendingRoom.room_id)
    }

    // 3. Cleanup Notification
    await supabase.from('yoga_notifications').delete().eq('id', invite.id)
    
    // 4. Instant UI Update
    setInvites(prev => prev.filter(i => i.id !== invite.id))
    setShowNotifs(false)
    await checkActiveRoom(myId)
  }

  const declineRequest = async (invite) => {
    const myId = session.user.id
    console.log("[Yoga] Declining invite...")

    // 1. Delete the room
    await supabase.from('yoga_rooms').delete().eq('host_id', myId).eq('joiner_id', invite.sender_id)
    
    // 2. Clear Notification
    await supabase.from('yoga_notifications').delete().eq('id', invite.id)
    
    // 3. Instant UI Update
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }

  const selectPose = async (pose) => {
    if (!room) return
    console.log(`[Yoga] Host selected pose: ${pose}`)
    await supabase.from('yoga_rooms').update({ current_pose: pose }).eq('room_id', room.room_id)
  }

  const leaveRoom = async () => {
    if (!room) return
    console.log("[Yoga] Leaving room...")
    await supabase.from('yoga_rooms').delete().eq('room_id', room.room_id)
    setRoom(null)
  }

  const bubbles = [
    { x: 7, r: 0.9, speed: 'A', delay: '1' }, { x: 13, r: 1.2, speed: 'B', delay: '2' },
    { x: 28, r: 1.7, speed: 'B', delay: '1' }, { x: 44, r: 1.9, speed: 'B', delay: '4' },
    { x: 60, r: 2.2, speed: 'B', delay: '2' }, { x: 84, r: 1.1, speed: 'A', delay: '1' }
  ]

  // --- Render Logic ---
  
  const isRoomActive = room && room.status === 'active'
  const isRoomPending = room && room.status === 'pending'

  return (
    <div className="yogaPage">
      <div className="yogaBg" />
      <div className="yogaRays" />

      <svg className="yogaBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs><linearGradient id="bubbleStrokeYoga" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.45)" /><stop offset="100%" stopColor="rgba(255,255,255,0.15)" /></linearGradient></defs>
        {bubbles.map((b, i) => (
          <g key={i} className={`yogaBubble yogaSpeed${b.speed} yogaDelay${b.delay}`} style={{ '--bx': `${b.x}` }}>
            <circle className="yogaBubbleOuter" cx={b.x} cy="96" r={b.r} stroke="url(#bubbleStrokeYoga)" />
          </g>
        ))}
      </svg>

      <div className="yogaContent">
        {/* === HEADER === */}
        <div className="yogaHeader">
          <button className="yogaBackBtn" onClick={() => navigate('/')}>← Home</button>
          
          <div className="yogaActionsRight">
            {/* LOBBY STATUS: CONNECTED */}
            {isRoomActive && (
              <div className="yogaStatus active">
                <span style={{color: '#4ade80'}}>● Connected: {partnerName}</span>
                <button className="yogaMiniBtn" onClick={leaveRoom}>End</button>
              </div>
            )}

            {/* LOBBY STATUS: PENDING (JOINER VIEW) */}
            {isRoomPending && !isHost && (
              <div className="yogaStatus">
                <span style={{color: '#fbbf24'}}>⏳ Waiting for {partnerName}...</span>
                <button className="yogaMiniBtn" onClick={leaveRoom}>Cancel</button>
              </div>
            )}

            {/* SHOW INVITE BUTTON (If no room exists) */}
            {!room && (
              <button className="yogaActionBtn" onClick={() => setShowModal(true)}>
                Request to Join Friend
              </button>
            )}

            {/* NOTIFICATION BELL (Only show if we aren't the one waiting) */}
            {(!room || isHost) && (
              <div style={{position: 'relative'}}>
                <button className="yogaBellBtn" onClick={() => setShowNotifs(!showNotifs)}>
                  🔔
                  {invites.length > 0 && <span className="yogaBadge">{invites.length}</span>}
                </button>
                {showNotifs && (
                  <NotificationsDropdown 
                    invites={invites} 
                    onAccept={acceptRequest} 
                    onDecline={declineRequest}
                    onClose={() => setShowNotifs(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="yogaCard">
          <h1 className="yogaTitle">
            {isRoomActive 
              ? (isHost ? "Host: Select a Pose" : `Waiting for ${partnerName} to select...`) 
              : "Select Your Pose"}
          </h1>

          <div className="yogaButtons">
            {['tree', 'warrior', 'sphinx'].map(pose => (
              <button 
                key={pose} 
                className="yogaBtn" 
                // DISABLE if:
                // 1. Room is pending
                // 2. Room is active BUT I am not the host (Joiner must wait)
                disabled={isRoomPending || (isRoomActive && !isHost)}
                onClick={() => isRoomActive ? selectPose(pose) : navigate(`/yoga/${pose}`)}
                style={{ opacity: (isRoomPending || (isRoomActive && !isHost)) ? 0.5 : 1 }}
              >
                {pose.charAt(0).toUpperCase() + pose.slice(1)} Pose
              </button>
            ))}
          </div>
          
          {isRoomActive && !isHost && (
            <p className="yogaHint" style={{marginTop: 20}}>
              You are the Joiner. The Host ({partnerName}) controls the session.
            </p>
          )}
          
          {/* Explicit message for Pending Joiner */}
          {isRoomPending && !isHost && (
             <p className="yogaHint" style={{marginTop: 20}}>
              You are the Joiner. The Host ({partnerName}) controls the session.
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <RequestModal 
          friends={friends} 
          onClose={() => setShowModal(false)}
          onRequest={handleRequestJoin}
        />
      )}
    </div>
  )
}