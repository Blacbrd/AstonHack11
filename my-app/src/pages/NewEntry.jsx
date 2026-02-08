import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './NewEntry.css'
import { logTodayAndSave } from '../components/octopusProgress'

export default function NewEntry({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(mode === 'edit')

  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchEntry = async () => {
        try {
          const { data, error } = await supabase
            .from('journals')
            .select('*')
            .eq('journal_id', id)
            .single()

          if (error) throw error

          if (data) {
            setTitle(data.title || '')
            setContent(data.content || '')
          }
        } catch (error) {
          console.error('Error fetching entry:', error.message)
        } finally {
          setLoading(false)
        }
      }
      fetchEntry()
    }
  }, [mode, id])

  const saveAndGoBack = async () => {
    // If they didn't write anything, don't count it as "done"
    if (!title.trim() && !content.trim()) {
      navigate('/journal')
      return
    }

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('No user logged in')
        navigate('/login')
        return
      }

      if (mode === 'new') {
        const { error } = await supabase.from('journals').insert([
          {
            user_id: user.id,
            title: title.trim(),
            content: content.trim()
          }
        ])
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('journals')
          .update({
            title: title.trim(),
            content: content.trim()
          })
          .eq('journal_id', id)
          .eq('user_id', user.id)

        if (error) throw error
      }

      // ✅ Count journal as "done" for today (one segment, once per day)
      // Your progress system prevents double logging automatically.
      logTodayAndSave('journal')
    } catch (error) {
      console.error('Error saving journal:', error.message)
    }

    navigate('/journal')
  }

  // More bubbles, staggered with NEGATIVE delays so animation is already “in progress” at load.
  const bubbles = [
    { x: 6, r: 0.85, speed: 'A', delayClass: 'n1' },
    { x: 10, r: 1.10, speed: 'B', delayClass: 'n2' },
    { x: 14, r: 0.75, speed: 'A', delayClass: 'n3' },
    { x: 18, r: 1.60, speed: 'B', delayClass: 'n4' },
    { x: 22, r: 0.95, speed: 'A', delayClass: 'n5' },
    { x: 27, r: 1.90, speed: 'B', delayClass: 'n6' },
    { x: 31, r: 1.05, speed: 'A', delayClass: 'n7' },
    { x: 36, r: 2.10, speed: 'B', delayClass: 'n8' },
    { x: 41, r: 1.25, speed: 'A', delayClass: 'n9' },
    { x: 46, r: 1.70, speed: 'B', delayClass: 'n10' },
    { x: 52, r: 0.90, speed: 'A', delayClass: 'n11' },
    { x: 57, r: 2.30, speed: 'B', delayClass: 'n12' },
    { x: 62, r: 1.15, speed: 'A', delayClass: 'n13' },
    { x: 68, r: 1.85, speed: 'B', delayClass: 'n14' },
    { x: 74, r: 1.05, speed: 'A', delayClass: 'n15' },
    { x: 80, r: 2.05, speed: 'B', delayClass: 'n16' },
    { x: 86, r: 1.10, speed: 'A', delayClass: 'n17' },
    { x: 92, r: 2.20, speed: 'B', delayClass: 'n18' }
  ]

  if (loading) {
    return (
      <div className="newEntryPage">
        <div className="newEntryBg" />
        <div className="newEntryRays" />
        <div className="newEntryContent">
          <div className="newEntryLoading">Loading entry...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="newEntryPage">
      <div className="newEntryBg" />
      <div className="newEntryRays" />

      {/* Bubbles */}
      <svg className="newEntryBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeNewEntry" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`neBubble neSpeed${b.speed} neDelay${b.delayClass}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle
              className="neBubbleOuter"
              cx={b.x}
              cy="98"
              r={b.r}
              stroke="url(#bubbleStrokeNewEntry)"
            />
            <circle
              className="neBubbleHighlight"
              cx={b.x - 0.35}
              cy="97.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="newEntrySeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="neSeaweedSway neSeaweedD1" opacity="0.9">
          <path className="neSeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="neSeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="neSeaweedSway neSeaweedD2" opacity="0.9">
          <path className="neSeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="neSeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      <div className="newEntryContent">
        <div className="newEntryWrap">
          <button className="newEntryBackBtn" onClick={saveAndGoBack}>
            ← Save &amp; Back
          </button>

          <h2 className="newEntryTitle">{mode === 'edit' ? 'Edit Entry' : 'New Journal Entry'}</h2>

          <input
            className="newEntryInput"
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="newEntryTextarea"
            placeholder="Write anything you want..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
          />
        </div>
      </div>
    </div>
  )
}
