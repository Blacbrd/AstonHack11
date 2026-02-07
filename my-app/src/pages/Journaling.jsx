import { useNavigate } from 'react-router-dom'

export default function Journaling({ entries }) {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '40px', position: 'relative' }}>
      <h1>My Journal</h1>

      {/* + button */}
      <button
        onClick={() => navigate('/journal/new')}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '2px solid #22c55e', // green
          color: '#22c55e',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          lineHeight: 1,
          cursor: 'pointer'
        }}
        aria-label="New journal entry"
      >
        +
      </button>

      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => navigate(`/journal/${entry.id}`)}
          style={{
            border: '1px solid #ccc',
            padding: '16px 18px',
            marginTop: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '40px', // bigger gap between title and date
            cursor: 'pointer'
          }}
        >
          <strong
            style={{
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {entry.title}
          </strong>

          <span style={{ minWidth: 220, textAlign: 'right' }}>
            {entry.createdAt}
          </span>
        </div>
      ))}
    </div>
  )
}   
