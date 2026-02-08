import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'
import CoopModal from '../components/CoopModal'
import './Journaling.css'

export default function Journaling() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Co-op State
  const [showCoopModal, setShowCoopModal] = useState(false)
  const [coopMode, setCoopMode] = useState(false) 
  const [partner, setPartner] = useState(null)
  const [coopEntries, setCoopEntries] = useState([])
  
  // Ref to track if we are already subscribed to avoid double-subscriptions
  const activeChannelRef = useRef(null)

  // 1. Initial Load & Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Only fetch personal journals if we aren't trying to load a coop room
        if (!searchParams.get('coop_user')) {
          fetchPersonalJournals()
        }
      }
    })
  }, [])

  // 2. Auto-Rejoin Room via URL
  // FIX: Added checks to prevent infinite loop
  useEffect(() => {
    if (!session) return

    const coopUserId = searchParams.get('coop_user')
    
    // If we have a URL param, BUT we aren't in coop mode yet, or we are looking at the wrong partner
    if (coopUserId && (!coopMode || partner?.id !== coopUserId)) {
      const restoreSession = async () => {
        setLoading(true)
        const { data: friendProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', coopUserId)
          .single()
        
        if (friendProfile) {
          // Manually set state here instead of calling handleJoinRoom to avoid triggering searchParams update loop
          setPartner(friendProfile)
          setCoopMode(true)
          
          const myId = session.user.id
          await fetchCoopEntries(myId, friendProfile.id)
        } else {
          navigate('/journal') 
        }
        setLoading(false)
      }
      restoreSession()
    }
  }, [session, searchParams, coopMode, partner]) 

  // --- 3. ROBUST REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!coopMode || !partner || !session) return

    const myId = session.user.id
    const friendId = partner.id
    const channelId = `room:${[myId, friendId].sort().join('-')}`

    // Avoid re-subscribing if we are already on this channel
    if (activeChannelRef.current && activeChannelRef.current.topic === `realtime:${channelId}`) {
      return
    }

    // Clean up previous channel if it exists (e.g. switching rooms)
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current)
    }
    
    console.log(`🔌 Joining Realtime Channel: ${channelId}`)

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'coop_journals'
        }, 
        (payload) => {
          console.log("⚡ Realtime Update Received")
          
          const rec = payload.new || payload.old
          const isOurRoom = 
            (rec.user1_id === myId && rec.user2_id === friendId) ||
            (rec.user1_id === friendId && rec.user2_id === myId)
          
          if (isOurRoom) {
            // Fetch updates without triggering a full page loading state
            fetchCoopEntries(myId, friendId) 
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Connected to ${channelId}`)
        }
      })

    activeChannelRef.current = channel

    // Cleanup function
    return () => {
      // Only remove if we are actually unmounting or changing rooms
      // We check if the refs have changed to prevent unnecessary disconnects
      if (activeChannelRef.current) {
        console.log(`🔌 Leaving Channel: ${channelId}`)
        supabase.removeChannel(activeChannelRef.current)
        activeChannelRef.current = null
      }
    }
  // FIX: Depend on primitive IDs, not objects, to prevent re-renders on object reference changes
  }, [coopMode, partner?.id, session?.user?.id]) 

  // --- FETCHING ---

  const fetchPersonalJournals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data)
    } catch (error) {
      console.error('Error fetching journals:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCoopEntries = async (myId, friendId) => {
    const { data } = await supabase
      .from('coop_journals')
      .select('*')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${myId})`)
      .order('created_at', { ascending: false })
    
    if (data) setCoopEntries(data)
  }

  // --- ACTIONS ---
  
  const handleJoinRoom = async (friend) => {
    setShowCoopModal(false)
    setLoading(true)
    
    // Set URL (triggers the useEffect #2, but we added guards there)
    setSearchParams({ coop_user: friend.id })
    
    setPartner(friend)
    setCoopMode(true)

    const myId = session.user.id
    const friendId = friend.id

    try {
      await fetchCoopEntries(myId, friendId)
    } catch (err) {
      console.error("Error joining room:", err)
    } finally {
      setLoading(false)
    }
  }

  const createCoopEntry = async () => {
    if (!partner) return
    const myId = session.user.id
    const friendId = partner.id

    try {
      const { data, error } = await supabase
        .from('coop_journals')
        .insert([{ 
          user1_id: myId, 
          user2_id: friendId,
          title: '', 
          content: '' 
        }])
        .select()
        .single()

      if (error) throw error
      navigate(`/journal/coop/${data.journal_id}`)
    } catch (err) {
      console.error("Error creating coop entry:", err)
    }
  }

  const exitCoop = () => {
    // Cleanup Subscription
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current)
      activeChannelRef.current = null
    }
    
    setCoopMode(false)
    setPartner(null)
    setSearchParams({}) 
    fetchPersonalJournals()
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString()

  const bubbles = [
    { x: 8, r: 0.9, speed: 'A', delay: '1' },
    { x: 14, r: 1.3, speed: 'B', delay: '2' },
    { x: 20, r: 1.0, speed: 'A', delay: '3' },
    { x: 28, r: 1.7, speed: 'B', delay: '1' },
    { x: 34, r: 1.1, speed: 'A', delay: '2' },
    { x: 40, r: 0.8, speed: 'B', delay: '3' },
    { x: 46, r: 1.5, speed: 'A', delay: '4' },
    { x: 52, r: 2.0, speed: 'B', delay: '2' },
    { x: 58, r: 1.2, speed: 'A', delay: '5' },
    { x: 64, r: 1.6, speed: 'B', delay: '4' },
    { x: 70, r: 1.0, speed: 'A', delay: '1' },
    { x: 76, r: 2.2, speed: 'B', delay: '5' },
    { x: 82, r: 1.3, speed: 'A', delay: '3' },
    { x: 90, r: 1.0, speed: 'B', delay: '2' },
    { x: 95, r: 0.85, speed: 'A', delay: '4' }
  ]

  return (
    <div className="journalPage">
      <div className="journalBg" />
      <div className="journalRays" />

      <svg className="journalBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeJournal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>
        {bubbles.map((b, i) => (
          <g key={i} className={`journalBubble journalSpeed${b.speed} journalDelay${b.delay}`} style={{ '--bx': `${b.x}px` }}>
            <circle className="journalBubbleOuter" cx={b.x} cy="96" r={b.r} stroke="url(#bubbleStrokeJournal)" />
            <circle className="journalBubbleHighlight" cx={b.x - 0.35} cy="95.6" r={Math.max(0.22, b.r * 0.28)} />
          </g>
        ))}
      </svg>

      <svg className="journalSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="seaweedSway seaweedD1" opacity="0.9">
          <path className="seaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="seaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>
        <g className="seaweedSway seaweedD2" opacity="0.9">
          <path className="seaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="seaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      <div className="journalContent">
        <PageShell
          title={coopMode ? `Joint Journal with ${partner?.username}` : "My Journal"}
          subtitle={coopMode ? "Real-time Shared Space" : ""}
          left={
            <div style={{display:'flex', gap:10}}>
              <button className="btn" onClick={() => navigate('/')}>← Home</button>
              {coopMode && (
                <button className="btn" style={{background:'#444'}} onClick={exitCoop}>
                  Exit Room
                </button>
              )}
            </div>
          }
          right={
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              {!coopMode && (
                <button className="btn" style={{background:'#646cff'}} onClick={() => setShowCoopModal(true)}>
                  👥 Co-op
                </button>
              )}
              <button 
                className="iconBtn" 
                onClick={() => coopMode ? createCoopEntry() : navigate('/journal/new')}
              >
                +
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="journalLoading">Loading...</div>
          ) : (coopMode ? coopEntries : entries).length === 0 ? (
            <div className="pageCard section">
              <p className="journalEmptyText">
                {coopMode ? "No shared entries yet. Click + to start writing together." : "No journal entries yet. Click + to add one."}
              </p>
            </div>
          ) : (
            <div className="journalList">
              {(coopMode ? coopEntries : entries).map((entry) => (
                <div
                  key={entry.journal_id}
                  className="listItem"
                  onClick={() => navigate(coopMode ? `/journal/coop/${entry.journal_id}` : `/journal/${entry.journal_id}`)}
                >
                  <div className="listTitle">{entry.title || 'Untitled Entry'}</div>
                  <div className="listMeta">{formatDate(entry.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </PageShell>
      </div>

      {showCoopModal && session && (
        <CoopModal 
          session={session} 
          onClose={() => setShowCoopModal(false)}
          onJoinRoom={handleJoinRoom}
        />
      )}
    </div>
  )
}