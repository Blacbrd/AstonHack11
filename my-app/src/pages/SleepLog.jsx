import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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

  // Generate last 30 days list
  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return toDateKey(d)
    })
  }, [])

  // Fetch log when date changes
  useEffect(() => {
    const fetchLog = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('sleep_logs')
        .select('hours_slept')
        .eq('user_id', user.id)
        .eq('date', dateKey)
        .maybeSingle()
      
      if (data) {
        setHours(data.hours_slept)
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
      const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <button 
        onClick={saveAndBack}
        style={{
          padding: '8px 16px',
          backgroundColor: '#333',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Save & Back
      </button>

      <h1 style={{ marginTop: 24, color: 'white' }}>Log sleep</h1>

      <div style={{ marginTop: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, color: '#ccc' }}>Date</label>
        <select
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          style={{ 
            padding: 12, 
            fontSize: 16, 
            width: '100%',
            backgroundColor: '#2a2a2a',
            color: 'white',
            border: '1px solid #444',
            borderRadius: 8
          }}
        >
          {last30Days.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#ccc' }}>
            How many hours of sleep did you get?
          </label>

          <select
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            style={{ 
              padding: 12, 
              fontSize: 16, 
              width: '100%',
              backgroundColor: '#2a2a2a',
              color: 'white',
              border: '1px solid #444',
              borderRadius: 8
            }}
          >
            <option value="">Select…</option>
            {Array.from({ length: 13 }).map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <p style={{ marginTop: 20, opacity: 0.7, fontSize: '0.9rem', color: '#888' }}>
          Select a date and hours to save your sleep data.
        </p>
      </div>
    </div>
  )
}