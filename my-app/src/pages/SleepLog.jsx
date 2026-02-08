import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './SleepLog.css'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function SleepLog() {
  const navigate = useNavigate()

  const today = new Date()
  const [dateKey, setDateKey] = useState(toDateKey(today))
  const [hours, setHours] = useState('')

  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return toDateKey(d)
    })
  }, [])

  useEffect(() => {
    const fetchLog = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('sleep_logs')
        .select('hours_slept')
        .eq('user_id', user.id)
        .eq('date', dateKey)
        .maybeSingle()

      if (data) {
        setHours(String(data.hours_slept))
      } else {
        setHours('')
      }
    }
    fetchLog()
  }, [dateKey])

  const saveAndBack = async () => {
    if (hours === '') {
      navigate('/sleep')
      return
    }

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('sleep_logs')
        .upsert(
          {
            user_id: user.id,
            date: dateKey,
            hours_slept: Number(hours)
          },
          { onConflict: 'user_id, date' }
        )

      if (error) throw error
    } catch (err) {
      console.error('Error saving sleep log:', err.message)
    }

    navigate('/sleep')
  }

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
    <div className="sleepLogPage">
      <div className="sleepLogBg" />
      <div className="sleepLogRays" />

      {/* Bubbles */}
      <svg className="sleepLogBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeSleepLog" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`sleepLogBubble sleepLogSpeed${b.speed} sleepLogDelay${b.delay}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle
              className="sleepLogBubbleOuter"
              cx={b.x}
              cy="96"
              r={b.r}
              stroke="url(#bubbleStrokeSleepLog)"
            />
            <circle
              className="sleepLogBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="sleepLogSeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="sleepLogSeaweedSway sleepLogSeaweedD1" opacity="0.9">
          <path className="sleepLogSeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="sleepLogSeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="sleepLogSeaweedSway sleepLogSeaweedD2" opacity="0.9">
          <path className="sleepLogSeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="sleepLogSeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      <div className="sleepLogContent">
        <div className="sleepLogWrap">
          <button className="sleepLogBackBtn" onClick={saveAndBack}>
            ← Save &amp; Back
          </button>

          <h1 className="sleepLogTitle">Log sleep</h1>

          <div className="sleepLogForm">
            <label className="sleepLogLabel">Date</label>
            <select className="sleepLogSelect" value={dateKey} onChange={(e) => setDateKey(e.target.value)}>
              {last30Days.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <div className="sleepLogBlock">
              <label className="sleepLogLabel">How many hours of sleep did you get?</label>
              <select className="sleepLogSelect" value={hours} onChange={(e) => setHours(e.target.value)}>
                <option value="">Select…</option>
                {Array.from({ length: 13 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <p className="sleepLogHint">Select a date and hours to save your sleep data.</p>
          </div>
        </div>
      </div>
    </div>
  )
}