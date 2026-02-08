import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function DietDay() {
  const navigate = useNavigate()
  const { date } = useParams() // format YYYY-MM-DD

  const [breakfast, setBreakfast] = useState('')
  const [lunch, setLunch] = useState('')
  const [dinner, setDinner] = useState('')
  const [loading, setLoading] = useState(true)

  // 1. Fetch existing data for this date
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('diet_logs')
            .select('breakfast, lunch, dinner')
            .eq('user_id', user.id)
            .eq('date', date)
            .maybeSingle() // Use maybeSingle to avoid error if no row exists yet

          if (error) throw error
          
          if (data) {
            setBreakfast(data.breakfast || '')
            setLunch(data.lunch || '')
            setDinner(data.dinner || '')
          }
        }
      } catch (err) {
        console.error('Error loading diet day:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [date])

  // 2. Save to DB
  const saveToDb = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upsert: Updates if (user_id, date) exists, inserts otherwise
      const { error } = await supabase
        .from('diet_logs')
        .upsert(
          { 
            user_id: user.id, 
            date: date, 
            breakfast, 
            lunch, 
            dinner 
          }, 
          { onConflict: 'user_id, date' }
        )

      if (error) throw error
    } catch (err) {
      console.error('Error saving diet log:', err.message)
    }
  }

  const handleBack = async () => {
    await saveToDb() // Wait for save to finish
    navigate('/diet')
  }

  if (loading) return <div style={{padding: 40, color:'white'}}>Loading...</div>

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
    <div style={{ border: '1px solid #444', borderRadius: 12, padding: 16, backgroundColor: '#1e1e1e' }}>
      <h2 style={{ margin: 0, marginBottom: 10, color: '#eee', fontSize: '1.2rem' }}>{title}</h2>
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