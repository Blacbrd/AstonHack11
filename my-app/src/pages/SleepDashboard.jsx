import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'

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
  const [sleepLogs, setSleepLogs] = useState({}) // { '2026-02-07': { hours: 8 } }

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('sleep_logs')
          .select('date, hours_slept')
          .eq('user_id', user.id)

        if (error) throw error

        // Convert array to object map for easy lookup in graph logic
        const logsMap = {}
        data.forEach(log => {
          logsMap[log.date] = { hours: log.hours_slept }
        })
        setSleepLogs(logsMap)
      } catch (err) {
        console.error('Error fetching sleep data:', err.message)
      }
    }
    fetchData()
  }, [])

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() // 0-11
  const monthName = today.toLocaleString(undefined, { month: 'long' })

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // ---------- Build points for this month ----------
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

  // ---------- Week averages table (Week 1–4) ----------
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

  // ---------- Bedtime calculator (Local Logic) ----------
  const [wakeTime, setWakeTime] = useState('07:00')

  const bedtimeOptions = useMemo(() => {
    // cycles: 6,5,4,3 (9h,7.5h,6h,4.5h) + 15 mins to fall asleep
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

  // ---------- Simple SVG graph ----------
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

  return (
    <PageShell
      title="Sleep"
      subtitle={`${monthName} ${year}`}
      left={<button className="btn" onClick={() => navigate('/')}>← Back</button>}
      right={<button className="iconBtn" onClick={() => navigate('/sleep/log')}>+</button>}
    >
      {/* Graph */}
      <div className="pageCard section" style={{ maxWidth: 860 }}>
        <svg width={width} height={height} style={{ maxWidth: '100%' }}>
          {/* axes */}
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="white" opacity="0.45" />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="white" opacity="0.45" />

          {/* y grid + labels */}
          {[0, 3, 6, 9, 12].map((v) => (
            <g key={v}>
              <line
                x1={pad}
                x2={width - pad}
                y1={yForHours(v)}
                y2={yForHours(v)}
                stroke="white"
                opacity="0.08"
              />
              <text x={10} y={yForHours(v) + 4} fill="white" opacity="0.7" fontSize="12">
                {v}
              </text>
            </g>
          ))}

          {/* points */}
          {points.map((p) => {
            const inGreen = p.hours > 6.5 && p.hours < 8.5
            return (
              <circle
                key={p.day}
                cx={xForDay(p.day)}
                cy={yForHours(p.hours)}
                r="5"
                fill={inGreen ? 'var(--green)' : 'var(--red)'}
                opacity="0.95"
              />
            )
          })}
        </svg>

        <p className="small" style={{ margin: '10px 0 0' }}>
          Green = 6.5–8.5 hours. Red = outside that range.
        </p>
      </div>

      {/* Weekly averages table */}
      <div className="pageCard section" style={{ maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>Weekly average (this month)</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            fontWeight: 700,
            opacity: 0.85,
            marginTop: 10
          }}
        >
          <div>Week</div>
          <div style={{ textAlign: 'right' }}>Avg hours</div>
          <div style={{ textAlign: 'right' }}>Days logged</div>
        </div>

        {weekAverages.map((w) => (
          <div
            key={w.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              marginTop: 12
            }}
          >
            <div>{w.label}</div>
            <div style={{ textAlign: 'right' }}>
              {w.avg === null ? '—' : w.avg.toFixed(1)}
            </div>
            <div style={{ textAlign: 'right', color: 'var(--muted)' }}>{w.count}</div>
          </div>
        ))}
      </div>

      {/* Bedtime helper */}
      <div className="pageCard section" style={{ maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>When should you fall asleep?</h2>

        <label style={{ display: 'block', marginBottom: 8, color: 'var(--muted)' }}>
          When do you want to wake up?
        </label>

        <select
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
          style={{
            padding: 10,
            fontSize: 16,
            width: '100%',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text)'
          }}
        >
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

        <div style={{ marginTop: 14 }}>
          {bedtimeOptions.map((b) => (
            <div
              key={b.cycles}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div style={{ color: 'var(--muted)' }}>
                {b.sleepHours}h sleep ({b.cycles} cycles)
              </div>
              <div style={{ fontWeight: 800 }}>{b.time}</div>
            </div>
          ))}
        </div>

        <p className="small" style={{ marginTop: 10 }}>
          Assumes ~15 minutes to fall asleep.
        </p>
      </div>
    </PageShell>
  )
}