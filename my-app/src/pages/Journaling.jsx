// src/pages/Journaling.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'
import './Journaling.css'

export default function Journaling() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJournals()
  }, [])

  const fetchJournals = async () => {
    try {
      setLoading(true)
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from('journals')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setEntries(data)
      }
    } catch (error) {
      console.error('Error fetching journals:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleString()

  // More bubbles with variety (x position, radius, speed class, delay class)
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

      {/* ===== Bubbles ===== */}
      <svg className="journalBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeJournal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`journalBubble journalSpeed${b.speed} journalDelay${b.delay}`}
            style={{ '--bx': `${b.x}px` }}
          >
            <circle
              className="journalBubbleOuter"
              cx={b.x}
              cy="96"
              r={b.r}
              stroke="url(#bubbleStrokeJournal)"
            />
            <circle
              className="journalBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* ===== Seaweed ===== */}
      <svg className="journalSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Left seaweed */}
        <g className="seaweedSway seaweedD1" opacity="0.9">
          <path className="seaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="seaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        {/* Right seaweed */}
        <g className="seaweedSway seaweedD2" opacity="0.9">
          <path className="seaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="seaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      {/* ===== Foreground content ===== */}
      <div className="journalContent">
        <PageShell
          title="My Journal"
          subtitle=""
          left={
            <button className="btn" onClick={() => navigate('/')}>
              ← Back
            </button>
          }
          right={
            <button className="iconBtn" onClick={() => navigate('/journal/new')}>
              +
            </button>
          }
        >
          {loading ? (
            <div className="journalLoading">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="pageCard section">
              <p className="journalEmptyText">No journal entries yet. Click + to add one.</p>
            </div>
          ) : (
            <div className="journalList">
              {entries.map((entry) => (
                <div
                  key={entry.journal_id}
                  className="listItem"
                  onClick={() => navigate(`/journal/${entry.journal_id}`)}
                >
                  <div className="listTitle">{entry.title || 'Untitled Entry'}</div>
                  <div className="listMeta">{formatDate(entry.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </PageShell>
      </div>
    </div>
  )
}
