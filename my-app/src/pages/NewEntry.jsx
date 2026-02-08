import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './NewEntry.css'

// Helper for debouncing
const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export default function NewEntry({ mode, isCoop = false }) {
  const navigate = useNavigate()
  const { id } = useParams()

  // State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(mode === 'edit' || isCoop)
  const [isSaving, setIsSaving] = useState(false)
  const [entryData, setEntryData] = useState(null)
  
  // Debug UI
  const [connectionStatus, setConnectionStatus] = useState('WAITING')

  // Refs
  const titleRef = useRef(title)
  const contentRef = useRef(content)
  const channelRef = useRef(null)

  const tableName = isCoop ? 'coop_journals' : 'journals'
  const idColumn = 'journal_id'

  useEffect(() => {
    titleRef.current = title
    contentRef.current = content
  }, [title, content])

  // 1. INITIAL FETCH
  useEffect(() => {
    if ((mode === 'edit' || isCoop) && id) {
      const fetchEntry = async () => {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq(idColumn, id)
            .single()

          if (error) throw error

          if (data) {
            setTitle(data.title || '')
            setContent(data.content || '')
            setEntryData(data)
          }
        } catch (error) {
          console.error('Error fetching entry:', error.message)
        } finally {
          setLoading(false)
        }
      }
      fetchEntry()
    }
  }, [mode, id, tableName, isCoop, idColumn])

  // ----------------------------------------------------
  // 2. REAL-TIME LISTENER (Safety Delay Version)
  // ----------------------------------------------------
  useEffect(() => {
    if (!isCoop || !id) return

    let isMounted = true
    const channelId = `entry:${id}`

    // Clean up any stray channels immediately
    const existing = supabase.getChannels().find(x => x.topic === `realtime:${channelId}`)
    if (existing) supabase.removeChannel(existing)

    // A. Define the subscription function
    const connectToSupabase = () => {
      if (!isMounted) return 

      console.log(`🔌 [Editor] Connecting to: ${channelId}`)
      setConnectionStatus('CONNECTING')

      const channel = supabase.channel(channelId)
        .on('postgres_changes', 
          { 
            event: 'UPDATE',        // Listen for Updates
            schema: 'public', 
            table: 'coop_journals'  // NO FILTER STRING (Important!)
          }, 
          (payload) => {
            // Client-Side Filter
            if (payload.new && payload.new.journal_id !== id) return

            const newData = payload.new
            // Update State (only if different)
            if (newData.title !== titleRef.current) {
              setTitle(newData.title)
            }
            if (newData.content !== contentRef.current) {
              setContent(newData.content)
            }
          }
        )
        .subscribe((status) => {
           if (!isMounted) return
           console.log(`📡 Status: ${status}`)
           
           if (status === 'SUBSCRIBED') setConnectionStatus('LIVE')
           else if (status === 'TIMED_OUT') setConnectionStatus('RETRYING (RLS)')
           else setConnectionStatus(status)
        })
      
      channelRef.current = channel
    }

    // B. The Safety Timer
    // Wait 100ms. If the component unmounts (Strict Mode) before this runs,
    // we never open the connection, preventing the crash.
    const timer = setTimeout(() => {
       connectToSupabase()
    }, 100)

    // C. Cleanup
    return () => {
      isMounted = false
      clearTimeout(timer) // Cancel the connection attempt if we leave quickly
      
      if (channelRef.current) {
        console.log(`🔌 [Editor] Disconnecting`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isCoop, id]) 

  // ---------------------------------------------
  // 3. AUTO-SAVE
  // ---------------------------------------------
  const debouncedSave = useCallback(
    debounce(async (newTitle, newContent) => {
      if (!id) return
      
      setIsSaving(true)
      try {
        await supabase
          .from('coop_journals')
          .update({
            title: newTitle,
            content: newContent,
            updated_at: new Date().toISOString()
          })
          .eq('journal_id', id)
      } catch (err) {
        console.error("Auto-save error:", err)
      } finally {
        setIsSaving(false)
      }
    }, 500),
    [id]
  )

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    if (isCoop) debouncedSave(val, content)
  }

  const handleContentChange = (e) => {
    const val = e.target.value
    setContent(val)
    if (isCoop) debouncedSave(title, val)
  }

  // ---------------------------------------------
  // 4. NAV / RENDER
  // ---------------------------------------------
  const handleBack = async () => {
    let currentUserId = null
    const { data: { user } } = await supabase.auth.getUser()
    if (user) currentUserId = user.id

    const isEmpty = !title.trim() && !content.trim()

    if (isEmpty) {
      if (mode === 'edit' || isCoop) {
        try {
          await supabase.from(tableName).delete().eq(idColumn, id)
        } catch (e) { /* ignore */ }
      }
    } else if (!isCoop) {
      const payload = { title: title.trim(), content: content.trim() }
      if (mode === 'new') {
        await supabase.from('journals').insert([{ ...payload, user_id: currentUserId }])
      } else {
        await supabase.from('journals').update(payload).eq(idColumn, id)
      }
    }

    if (isCoop && entryData && currentUserId) {
      const partnerId = entryData.user1_id === currentUserId 
        ? entryData.user2_id 
        : entryData.user1_id
      navigate(`/journal?coop_user=${partnerId}`)
    } else {
      navigate('/journal')
    }
  }

  const bubbles = [
    { x: 6, r: 0.85, speed: 'A', delayClass: 'n1' },
    { x: 18, r: 1.60, speed: 'B', delayClass: 'n4' },
    { x: 36, r: 2.10, speed: 'B', delayClass: 'n8' },
    { x: 57, r: 2.30, speed: 'B', delayClass: 'n12' },
    { x: 80, r: 2.05, speed: 'B', delayClass: 'n16' },
    { x: 92, r: 2.20, speed: 'B', delayClass: 'n18' }
  ]

  if (loading) {
    return (
      <div className="newEntryPage">
        <div className="newEntryBg" />
        <div className="newEntryContent">
          <div className="newEntryLoading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="newEntryPage">
      <div className="newEntryBg" />
      <div className="newEntryRays" />

      <svg className="newEntryBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeNewEntry" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>
        {bubbles.map((b, i) => (
          <g key={i} className={`neBubble neSpeed${b.speed} neDelay${b.delayClass}`} style={{ '--bx': `${b.x}` }}>
            <circle className="neBubbleOuter" cx={b.x} cy="98" r={b.r} stroke="url(#bubbleStrokeNewEntry)" />
          </g>
        ))}
      </svg>

      <div className="newEntryContent">
        <div className="newEntryWrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="newEntryBackBtn" onClick={handleBack}>
              {isCoop ? '← Back' : '← Save & Back'}
            </button>
            
            {isCoop && (
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                <span style={{ fontSize: '0.8rem', color: isSaving ? '#646cff' : '#888' }}>
                  {isSaving ? 'Saving...' : 'Saved'}
                </span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: connectionStatus === 'LIVE' ? '#4ade80' : 
                         connectionStatus === 'WAITING' ? '#888' : '#f87171' 
                }}>
                  {connectionStatus === 'LIVE' ? '● Live' : `○ ${connectionStatus}`}
                </span>
              </div>
            )}
          </div>

          <h2 className="newEntryTitle">
            {isCoop ? 'Shared Journal' : (mode === 'edit' ? 'Edit Entry' : 'New Entry')}
          </h2>

          <input
            className="newEntryInput"
            placeholder="Title..."
            value={title}
            onChange={handleTitleChange}
          />

          <textarea
            className="newEntryTextarea"
            placeholder="Write here..."
            value={content}
            onChange={handleContentChange}
            rows={15}
          />
        </div>
      </div>
    </div>
  )
}