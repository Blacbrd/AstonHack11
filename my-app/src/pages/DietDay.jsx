import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './DietDay.css'

export default function DietDay() {
  const navigate = useNavigate()
  const { date } = useParams()

  const [breakfast, setBreakfast] = useState('')
  const [lunch, setLunch] = useState('')
  const [dinner, setDinner] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (user) {
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
        }
      } catch (err) {
        console.error('Error loading diet day:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [date])

  const saveToDb = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('diet_logs')
        .upsert(
          { user_id: user.id, date, breakfast, lunch, dinner },
          { onConflict: 'user_id, date' }
        )

      if (error) throw error
    } catch (err) {
      console.error('Error saving diet log:', err.message)
    }
  }

  const handleBack = async () => {
    await saveToDb()
    navigate('/diet')
  }

  const bubbles = [
    { x: 6, r: 0.9, speed: 'A', delay: '1' },
    { x: 11, r: 1.2, speed: 'B', delay: '2' },
    { x: 18, r: 0.8, speed: 'A', delay: '3' },
    { x: 26, r: 1.6, speed: 'B', delay: '1' },
    { x: 33, r: 1.1, speed: 'A', delay: '2' },
    { x: 41, r: 1.9, speed: 'B', delay: '4' },
    { x: 49, r: 1.0, speed: 'A', delay: '5' },
    { x: 56, r: 2.2, speed: 'B', delay: '2' },
    { x: 63, r: 1.3, speed: 'A', delay: '4' },
    { x: 71, r: 1.7, speed: 'B', delay: '3' },
    { x: 79, r: 1.1, speed: 'A', delay: '1' },
    { x: 87, r: 2.0, speed: 'B', delay: '5' },
    { x: 94, r: 0.85, speed: 'A', delay: '3' }
  ]

  return (
    <div className="dietDayPage">
      {/* Background layers */}
      <div className="dietDayBg" />
      <div className="dietDayRays" />

      {/* Bubbles */}
      <svg className="dietDayBubbles" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bubbleStrokeDietDay" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
        </defs>

        {bubbles.map((b, i) => (
          <g
            key={i}
            className={`dietDayBubble dietDaySpeed${b.speed} dietDayDelay${b.delay}`}
            style={{ '--bx': `${b.x}` }}
          >
            <circle
              className="dietDayBubbleOuter"
              cx={b.x}
              cy="96"
              r={b.r}
              stroke="url(#bubbleStrokeDietDay)"
            />
            <circle
              className="dietDayBubbleHighlight"
              cx={b.x - 0.35}
              cy="95.6"
              r={Math.max(0.22, b.r * 0.28)}
            />
          </g>
        ))}
      </svg>

      {/* Seaweed */}
      <svg className="dietDaySeaweed" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="dietDaySeaweedSway dietDaySeaweedD1" opacity="0.9">
          <path className="dietDaySeaweedThick" d="M8 100 C10 88, 6 78, 10 66 C14 54, 8 46, 12 36" />
          <path className="dietDaySeaweedThin" d="M14 100 C16 90, 12 80, 16 70 C20 60, 15 50, 19 40" />
        </g>

        <g className="dietDaySeaweedSway dietDaySeaweedD2" opacity="0.9">
          <path className="dietDaySeaweedThick" d="M92 100 C90 88, 94 78, 90 66 C86 54, 92 46, 88 36" />
          <path className="dietDaySeaweedThin" d="M86 100 C84 90, 88 80, 84 70 C80 60, 85 50, 81 40" />
        </g>
      </svg>

      {/* Foreground */}
      <div className="dietDayContent">
        {loading ? (
          <div className="dietDayLoading">Loading...</div>
        ) : (
          <div className="dietDayWrap">
            <button className="dietDayBackBtn" onClick={handleBack}>
              ← Save &amp; Back
            </button>

            <h1 className="dietDayTitle">Diet log</h1>
            <p className="dietDayDate">{date}</p>

            <div className="dietDayGrid">
              <MealBox title="Breakfast" value={breakfast} onChange={setBreakfast} />
              <MealBox title="Lunch" value={lunch} onChange={setLunch} />
              <MealBox title="Dinner" value={dinner} onChange={setDinner} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MealBox({ title, value, onChange }) {
  return (
    <div className="mealBox">
      <h2 className="mealTitle">{title}</h2>
      <textarea
        className="mealTextarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`What did you have for ${title.toLowerCase()}?`}
        rows={4}
      />
    </div>
  )
}
