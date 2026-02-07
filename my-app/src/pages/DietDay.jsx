import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function DietDay({ dietLogs, saveDietForDate }) {
  const navigate = useNavigate()
  const { date } = useParams() // format YYYY-MM-DD

  const existing = dietLogs[date] || { breakfast: '', lunch: '', dinner: '' }

  const [breakfast, setBreakfast] = useState(existing.breakfast)
  const [lunch, setLunch] = useState(existing.lunch)
  const [dinner, setDinner] = useState(existing.dinner)

  const save = () => {
    saveDietForDate(date, { breakfast, lunch, dinner })
  }

  const back = () => {
    save()
    navigate('/diet')
  }

  // Auto-save when leaving this page (route change / refresh / close)
  useEffect(() => {
    return () => {
      saveDietForDate(date, { breakfast, lunch, dinner })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, breakfast, lunch, dinner])

  return (
    <div style={{ padding: '40px' }}>
      <button onClick={back}>← Back</button>
      <h1 style={{ marginTop: 16 }}>Diet log</h1>
      <p style={{ opacity: 0.8 }}>{date}</p>

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
    <div style={{ border: '1px solid #666', borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 10 }}>{title}</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`What did you have for ${title.toLowerCase()}?`}
        rows={4}
        style={{ width: '100%', padding: 10, fontSize: 16 }}
      />
    </div>
  )
}
