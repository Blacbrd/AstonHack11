// src/pages/Journaling.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'
import './Journaling.css'

export default function Journaling() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  // Ask Gemini modal state
  const [askOpen, setAskOpen] = useState(false)
  const [geminiText, setGeminiText] = useState('')
  const [sending, setSending] = useState(false)

  // chat messages
  const [messages, setMessages] = useState([]) // { role:'user'|'gemini', text:string }
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchJournals()
  }, [])

  // close modal on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAskOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // autoscroll chat to bottom
  useEffect(() => {
    if (askOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [askOpen, messages])

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

  // SEND (chat-style)
  const handleSendGemini = async () => {
    const text = geminiText.trim()
    if (!text || sending) return

    const nextMessages = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setGeminiText('')
    setSending(true)

    try {
      const res = await fetch('http://localhost:5000/ask_gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'journal',
          tone: 'calm',
          max_words: 80,
          messages: nextMessages
        })
      })

      const data = await res.json().catch(async () => {
        const raw = await res.text()
        throw new Error(raw || 'Non-JSON response from backend')
      })

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      setMessages((prev) => [...prev, { role: 'gemini', text: data.reply || '' }])
    } catch (e) {
      console.error('Ask Gemini error:', e)
      setMessages((prev) => [
        ...prev,
        { role: 'gemini', text: `⚠️ Error: ${String(e?.message || e)}` }
      ])
    } finally {
      setSending(false)
    }
  }

  // Same vibe as your other pages: many bubbles, varied sizes/speeds/delays
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

      {/* bubbles */}
      <svg className="journalBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeJournal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g key={i} className={`journalBubble journalSpeed${b.speed} journalDelay${b.delay}`}>
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

      {/* foreground */}
      <div className="journalContent">
        <PageShell
          title="My Journal"
          left={<button className="btn" onClick={() => navigate('/')}>← Back</button>}
          right={
            <div className="journalTopRight">
              <button className="btnSecondary" onClick={() => setAskOpen(true)}>
                Ask Gemini
              </button>
              <button className="iconBtn" onClick={() => navigate('/journal/new')}>
                +
              </button>
            </div>
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

      {/* ASK GEMINI MODAL */}
      {askOpen && (
        <div className="geminiModalOverlay" onClick={() => setAskOpen(false)}>
          <div className="geminiModal" onClick={(e) => e.stopPropagation()}>
            <div className="geminiModalHeader">
              <div className="geminiModalTitle">Ask Gemini</div>
              <button className="iconBtn" onClick={() => setAskOpen(false)}>✕</button>
            </div>

            {/* Chat window */}
            <div
              style={{
                maxHeight: 280,
                overflowY: 'auto',
                padding: 10,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.06)',
                marginBottom: 10,
                whiteSpace: 'pre-wrap'
              }}
            >
              {messages.length === 0 ? (
                <div style={{ opacity: 0.75 }}>Ask something to start…</div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 10,
                      textAlign: m.role === 'user' ? 'right' : 'left'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.8 }}>
                      {m.role === 'user' ? 'You' : 'Gemini'}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '10px 12px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        maxWidth: '85%'
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <textarea
              className="geminiTextarea"
              rows={4}
              placeholder="Type your message…"
              value={geminiText}
              onChange={(e) => setGeminiText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendGemini()
                }
              }}
            />

            <div className="geminiModalActions">
              <button className="btnGhost" onClick={() => setMessages([])} disabled={sending}>
                Clear chat
              </button>

              <button className="btnGhost" onClick={() => setAskOpen(false)}>
                Close
              </button>

              <button className="btnPrimary" onClick={handleSendGemini} disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

