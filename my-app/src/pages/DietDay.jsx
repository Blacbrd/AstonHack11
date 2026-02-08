import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { logTodayAndSave } from '../components/octopusProgress'

export default function DietDay() {
  const navigate = useNavigate()
  const { date } = useParams() // YYYY-MM-DD
  const didLogRef = useRef(false)

  const todayKey = (() => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })()

  const [breakfast, setBreakfast] = useState('')
  const [lunch, setLunch] = useState('')
  const [dinner, setDinner] = useState('')
  const [loading, setLoading] = useState(true)

  // 1) Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('diet_logs')
          .select('breakfast, lunch, dinner')
          .eq('user_id', user.id)
          .eq('date', date)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setBreakfast(data.breakfast || '')
          setLunch(data.lunch || '')
          setDinner(data.dinner || '')
        }
      } catch (err) {
        console.error('Error loading diet day:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [date])

  // 2) Save
  const saveToDb = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('diet_logs')
        .upsert(
          {
            user_id: user.id,
            date,
            breakfast,
            lunch,
            dinner
          },
          { onConflict: 'user_id, date' }
        )

      if (error) throw error

      // ✅ Count as DONE only if:
      // - logging TODAY
      // - at least one meal entered
      // - not already logged today
      const hasFood =
        breakfast.trim() || lunch.trim() || dinner.trim()

      if (date === todayKey && hasFood && !didLogRef.current) {
        logTodayAndSave('diet')
        didLogRef.current = true
      }
    } catch (err) {
      console.error('Error saving diet log:', err.message)
    }
  }

  const handleBack = async () => {
    await saveToDb()
    navigate('/diet')
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'white' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={handleBack}
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

      <h1 style={{ marginTop: 24, color: 'white' }}>Diet log</h1>
      <p style={{ opacity: 0.8, color: '#aaa' }}>{date}</p>

      <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
        <MealBox title="Breakfast" value={breakfast} onChange={setBreakfast} />
        <MealBox title="Lunch" value={lunch} onChange={setLunch} />
        <MealBox title="Dinner" value={dinner} onChange={setDinner} />
      </div>
    </div>
  )
}

function MealBox({ title, value, onChange }) {
  return (
    <div
      style={{
        border: '1px solid #444',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#1e1e1e'
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 10, color: '#eee', fontSize: '1.2rem' }}>
        {title}
      </h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`What did you have for ${title.toLowerCase()}?`}
        rows={4}
        style={{
          width: '100%',
          padding: 12,
          fontSize: 16,
          backgroundColor: '#2a2a2a',
          color: 'white',
          border: '1px solid #555',
          borderRadius: 8,
          outline: 'none',
          resize: 'vertical'
        }}
      />
    </div>
  )
}
