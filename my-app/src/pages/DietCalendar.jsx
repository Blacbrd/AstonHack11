import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateKey(dateObj) {
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`
}

export default function DietCalendar({ dietLogs }) {
  const navigate = useNavigate()

  const today = new Date()
  const todayKey = toDateKey(today)

  const year = today.getFullYear()
  const month = today.getMonth() // 0–11

  const { days, firstDayOffset, monthName } = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)

    return {
      days: last.getDate(),
      firstDayOffset: (first.getDay() + 6) % 7, // Monday = 0
      monthName: first.toLocaleString(undefined, { month: 'long' })
    }
  }, [year, month])

  return (
    <PageShell
      title="Diet"
      subtitle={`${monthName} ${year}`}
      left={<button className="btn" onClick={() => navigate('/')}>← Back</button>}
      right={null}
    >
      <div className="pageCard section" style={{ maxWidth: 720 }}>
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 10
          }}
        >
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} style={{ fontWeight: 700, opacity: 0.75 }}>
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

            const hasLog =
              Boolean(
                dietLogs[key]?.breakfast ||
                dietLogs[key]?.lunch ||
                dietLogs[key]?.dinner
              )

            return (
              <button
                key={key}
                onClick={() => {
                  if (!isFuture) navigate(`/diet/${key}`)
                }}
                disabled={isFuture}
                style={{
                  height: 56,
                  borderRadius: 14,
                  border: isToday ? '2px solid var(--green)' : '1px solid var(--border)',
                  background: isFuture
                    ? 'rgba(255,255,255,0.03)'
                    : isToday
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(255,255,255,0.03)',
                  color: isFuture ? 'rgba(255,255,255,0.35)' : 'var(--text)',
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  opacity: isFuture ? 0.55 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  fontWeight: 700
                }}
                title={
                  isFuture
                    ? 'Future date'
                    : hasLog
                    ? 'Meals logged'
                    : 'No meals logged yet'
                }
              >
                {dayNum}

                {hasLog && !isFuture && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 10,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--green)'
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <p className="small" style={{ marginTop: 14 }}>
          Click a past day to log meals. Future days are disabled.
        </p>
      </div>
    </PageShell>
  )
}
