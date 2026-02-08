// src/pages/DietCalendar.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'
import './DietCalendar.css'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(dateObj) {
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`
}

export default function DietCalendar() {
  const navigate = useNavigate()
  const [loggedDates, setLoggedDates] = useState({})

  // Ask Gemini modal state (chat)
  const [askOpen, setAskOpen] = useState(false)
  const [geminiText, setGeminiText] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'gemini', text: string }
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchDietLogs()
  }, [])

  // close modal on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAskOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // autoscroll chat
  useEffect(() => {
    if (askOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [askOpen, messages])

  const fetchDietLogs = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('diet_logs')
        .select('date, breakfast, lunch, dinner')
        .eq('user_id', user.id)

      if (error) throw error

      const logsMap = {}
      data.forEach((log) => {
        if (log.breakfast || log.lunch || log.dinner) {
          logsMap[log.date] = true
        }
      })
      setLoggedDates(logsMap)
    } catch (error) {
      console.error('Error fetching diet logs:', error.message)
    }
  }

  // send to backend (diet chat)
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
          mode: 'diet',
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

  const today = new Date()
  const todayKey = toDateKey(today)

  const year = today.getFullYear()
  const month = today.getMonth()

  const { days, firstDayOffset, monthName } = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)

    return {
      days: last.getDate(),
      firstDayOffset: (first.getDay() + 6) % 7,
      monthName: first.toLocaleString(undefined, { month: 'long' })
    }
  }, [year, month])

  // bubbles
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
    <div className="dietPage">
      <div className="dietBg" />
      <div className="dietRays" />

      {/* Bubbles */}
      <svg className="dietBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeDiet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`dietBubble dietSpeed${b.speed} dietDelay${b.delay}`}
            style={{ '--bx': `${b.x}px` }}
          >
            <circle
              className="dietBubbleOuter"
              cx={b.x}
              cy="96"
              r={b.r}
              stroke="url(#bubbleStrokeDiet)"
            />
            <circle
              className="dietBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="dietSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="dietSeaweedSway dietSeaweedD1" opacity="0.9">
          <path className="dietSeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="dietSeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="dietSeaweedSway dietSeaweedD2" opacity="0.9">
          <path className="dietSeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="dietSeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      {/* Foreground */}
      <div className="dietContent">
        <PageShell
          title="Diet"
          subtitle={`${monthName} ${year}`}
          left={
            <button className="btn" onClick={() => navigate('/')}>
              ← Back
            </button>
          }
          right={
            <button className="btnSecondary" onClick={() => setAskOpen(true)}>
              Ask Gemini
            </button>
          }
        >
          <div className="dietCard pageCard section">
            <div className="dietGrid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="dietDow">
                  {d}
                </div>
              ))}

              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: days }).map((_, i) => {
                const dayNum = i + 1
                const dateObj = new Date(year, month, dayNum)
                const key = toDateKey(dateObj)

                const isToday = key === todayKey
                const isFuture = key > todayKey
                const hasLog = Boolean(loggedDates[key])

                const dayClass = [
                  'dietDayBtn',
                  isToday ? 'isToday' : '',
                  isFuture ? 'isFuture' : '',
                  hasLog && !isFuture ? 'hasLog' : ''
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={key}
                    className={dayClass}
                    onClick={() => {
                      if (!isFuture) navigate(`/diet/${key}`)
                    }}
                    disabled={isFuture}
                  >
                    {dayNum}
                    {hasLog && !isFuture && <span className="dietDot" />}
                  </button>
                )
              })}
            </div>

            <p className="dietHint small">
              Click a past day to log meals. Future days are disabled.
            </p>
          </div>
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
