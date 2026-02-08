// src/pages/SleepDashboard.jsx
import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'
import './SleepDashboard.css'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function dateKeyFromParts(year, monthIndex0, day) {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

export default function SleepDashboard() {
  const navigate = useNavigate()
  const [sleepLogs, setSleepLogs] = useState({})

  // Ask Gemini modal state (copied from Journaling)
  const [askOpen, setAskOpen] = useState(false)
  const [geminiText, setGeminiText] = useState('')
  const [sending, setSending] = useState(false)

  // chat messages (copied from Journaling)
  const [messages, setMessages] = useState([]) // { role:'user'|'gemini', text:string }
  const chatEndRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('sleep_logs')
          .select('date, hours_slept')
          .eq('user_id', user.id)

        if (error) throw error

        const logsMap = {}
        data.forEach((log) => {
          logsMap[log.date] = { hours: log.hours_slept }
        })
        setSleepLogs(logsMap)
      } catch (err) {
        console.error('Error fetching sleep data:', err.message)
      }
    }
    fetchData()
  }, [])

  // close modal on ESC (copied from Journaling)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAskOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // autoscroll chat to bottom (copied from Journaling)
  useEffect(() => {
    if (askOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [askOpen, messages])

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthName = today.toLocaleString(undefined, { month: 'long' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const points = useMemo(() => {
    const arr = []
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKeyFromParts(year, month, d)
      const log = sleepLogs[key]
      if (!log || typeof log.hours !== 'number') continue
      arr.push({ day: d, hours: log.hours })
    }
    return arr
  }, [sleepLogs, year, month, daysInMonth])

  const weekAverages = useMemo(() => {
    const ranges = [
      { label: 'Week 1', start: 1, end: 7 },
      { label: 'Week 2', start: 8, end: 14 },
      { label: 'Week 3', start: 15, end: 21 },
      { label: 'Week 4', start: 22, end: daysInMonth }
    ]

    return ranges.map((w) => {
      let sum = 0
      let count = 0
      for (let d = w.start; d <= w.end; d++) {
        const key = dateKeyFromParts(year, month, d)
        const log = sleepLogs[key]
        if (log && typeof log.hours === 'number') {
          sum += log.hours
          count++
        }
      }
      const avg = count === 0 ? null : sum / count
      return { ...w, avg, count }
    })
  }, [sleepLogs, year, month, daysInMonth])

  const [wakeTime, setWakeTime] = useState('07:00')

  const bedtimeOptions = useMemo(() => {
    const cycles = [6, 5, 4, 3]
    const [hh, mm] = wakeTime.split(':').map(Number)

    const wake = new Date()
    wake.setHours(hh, mm, 0, 0)

    return cycles.map((c) => {
      const minsSleep = c * 90
      const totalBack = minsSleep + 15
      const bed = new Date(wake.getTime() - totalBack * 60 * 1000)
      return {
        cycles: c,
        time: `${pad2(bed.getHours())}:${pad2(bed.getMinutes())}`,
        sleepHours: (minsSleep / 60).toFixed(1)
      }
    })
  }, [wakeTime])

  const width = 720
  const height = 260
  const pad = 40

  const xForDay = (d) => {
    const t = (d - 1) / Math.max(1, daysInMonth - 1)
    return pad + t * (width - 2 * pad)
  }

  const yForHours = (h) => {
    const t = clamp(h, 0, 12) / 12
    return height - pad - t * (height - 2 * pad)
  }

  // SEND (chat-style) — copied from Journaling, ONLY mode changed to 'sleep'
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
          mode: 'sleep',
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

  // Underwater effects
  const bubbles = [
    { x: 7, r: 0.9, speed: 'A', delay: '1' },
    { x: 13, r: 1.2, speed: 'B', delay: '2' },
    { x: 20, r: 0.8, speed: 'A', delay: '3' },
    { x: 28, r: 1.7, speed: 'B', delay: '1' },
    { x: 36, r: 1.1, speed: 'A', delay: '2' },
    { x: 44, r: 1.9, speed: 'B', delay: '4' },
    { x: 52, r: 1.0, speed: 'A', delay: '5' },
    { x: 60, r: 2.2, speed: 'B', delay: '2' },
    { x: 68, r: 1.3, speed: 'A', delay: '4' },
    { x: 76, r: 1.7, speed: 'B', delay: '3' },
    { x: 84, r: 1.1, speed: 'A', delay: '1' },
    { x: 92, r: 2.0, speed: 'B', delay: '5' }
  ]

  return (
    <div className="sleepPage">
      <div className="sleepBg" />
      <div className="sleepRays" />

      {/* Bubbles */}
      <svg className="sleepBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeSleep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`sleepBubble sleepSpeed${b.speed} sleepDelay${b.delay}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle className="sleepBubbleOuter" cx={b.x} cy="96" r={b.r} stroke="url(#bubbleStrokeSleep)" />
            <circle
              className="sleepBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="sleepSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="sleepSeaweedSway sleepSeaweedD1" opacity="0.9">
          <path className="sleepSeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="sleepSeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="sleepSeaweedSway sleepSeaweedD2" opacity="0.9">
          <path className="sleepSeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="sleepSeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      <div className="sleepContent">
        <PageShell
          title="Sleep"
          subtitle={`${monthName} ${year}`}
          left={
            <button className="btn" onClick={() => navigate('/')}>
              ← Back
            </button>
          }
          right={
            <div className="journalTopRight">
              <button className="btnSecondary" onClick={() => setAskOpen(true)}>
                Ask Gemini
              </button>
              <button className="iconBtn" onClick={() => navigate('/sleep/log')}>
                +
              </button>
            </div>
          }
        >
          {/* Graph */}
          <div className="sleepCard pageCard section">
            <svg className="sleepGraph" width={width} height={height}>
              <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="sleepAxis" />
              <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="sleepAxis" />

              {[0, 3, 6, 9, 12].map((v) => (
                <g key={v}>
                  <line x1={pad} x2={width - pad} y1={yForHours(v)} y2={yForHours(v)} className="sleepGrid" />
                  <text x={10} y={yForHours(v) + 4} className="sleepYLabel">
                    {v}
                  </text>
                </g>
              ))}

              {points.map((p) => {
                const inGreen = p.hours > 6.5 && p.hours < 8.5
                return (
                  <circle
                    key={p.day}
                    cx={xForDay(p.day)}
                    cy={yForHours(p.hours)}
                    r="5"
                    className={inGreen ? 'sleepPointGood' : 'sleepPointBad'}
                  />
                )
              })}
            </svg>

            <p className="sleepHint small">Green = 6.5–8.5 hours. Red = outside that range.</p>
          </div>

          {/* Weekly averages */}
          <div className="sleepCardSm pageCard section">
            <h2 className="sleepH2">Weekly average (this month)</h2>

            <div className="sleepTableHead">
              <div>Week</div>
              <div className="sleepRight">Avg hours</div>
              <div className="sleepRight">Days logged</div>
            </div>

            {weekAverages.map((w) => (
              <div key={w.label} className="sleepRow">
                <div>{w.label}</div>
                <div className="sleepRight">{w.avg === null ? '—' : w.avg.toFixed(1)}</div>
                <div className="sleepRight sleepMuted">{w.count}</div>
              </div>
            ))}
          </div>

          {/* Bedtime helper */}
          <div className="sleepCardSm pageCard section">
            <h2 className="sleepH2">When should you fall asleep?</h2>

            <label className="sleepLabel">When do you want to wake up?</label>

            <select className="sleepSelect" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}>
              {Array.from({ length: 48 }).map((_, i) => {
                const hh = pad2(Math.floor(i / 2))
                const mm = i % 2 === 0 ? '00' : '30'
                const t = `${hh}:${mm}`
                return (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              })}
            </select>

            <div className="sleepBedList">
              {bedtimeOptions.map((b) => (
                <div key={b.cycles} className="sleepBedRow">
                  <div className="sleepMuted">
                    {b.sleepHours}h sleep ({b.cycles} cycles)
                  </div>
                  <div className="sleepBedTime">{b.time}</div>
                </div>
              ))}
            </div>

            <p className="sleepHint2 small">Assumes ~15 minutes to fall asleep.</p>
          </div>
        </PageShell>
      </div>

      {/* ASK GEMINI MODAL (copied from Journaling) */}
      {askOpen && (
        <div className="geminiModalOverlay" onClick={() => setAskOpen(false)}>
          <div className="geminiModal" onClick={(e) => e.stopPropagation()}>
            <div className="geminiModalHeader">
              <div className="geminiModalTitle">Ask Gemini</div>
              <button className="iconBtn" onClick={() => setAskOpen(false)}>
                ✕
              </button>
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
