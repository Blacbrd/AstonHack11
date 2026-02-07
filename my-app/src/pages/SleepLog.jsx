import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function SleepLog({ sleepLogs, saveSleepForDate }) {
  const navigate = useNavigate()

  const today = new Date()
  const [dateKey, setDateKey] = useState(toDateKey(today))

  const existing = sleepLogs[dateKey]
  const [hours, setHours] = useState(existing?.hours ?? '')

  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return toDateKey(d)
    })
  }, [])

  const saveAndBack = () => {
    // If no hours chosen, just go back without saving
    if (hours === '') {
      navigate('/sleep')
      return
    }

    saveSleepForDate(dateKey, {
      hours: Number(hours)
    })

    navigate('/sleep')
  }

  return (
    <div style={{ padding: '40px' }}>
      <button onClick={saveAndBack}>← Back</button>

      <h1 style={{ marginTop: 16 }}>Log sleep</h1>

      <div style={{ marginTop: 18, maxWidth: 520 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Date</label>
        <select
          value={dateKey}
          onChange={(e) => {
            const newKey = e.target.value
            setDateKey(newKey)
            const ex = sleepLogs[newKey]
            setHours(ex?.hours ?? '')
          }}
          style={{ padding: 10, fontSize: 16, width: '100%' }}
        >
          {last30Days.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 18 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            How many hours of sleep did you get?
          </label>

          <select
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            style={{ padding: 10, fontSize: 16, width: '100%' }}
          >
            <option value="">Select…</option>
            {Array.from({ length: 13 }).map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <p style={{ marginTop: 12, opacity: 0.7 }}>
          (This will reset if you refresh — database comes later.)
        </p>
      </div>
    </div>
  )
}
