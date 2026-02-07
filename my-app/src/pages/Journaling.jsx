import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'

export default function Journaling({ entries }) {
  const navigate = useNavigate()

  return (
    <PageShell
      title="My Journal"
      subtitle=""
      left={<button className="btn" onClick={() => navigate('/')}>← Back</button>}
      right={<button className="iconBtn" onClick={() => navigate('/journal/new')}>+</button>}
    >
      {entries.length === 0 && (
        <div className="pageCard section">
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No journal entries yet. Click + to add one.
          </p>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'grid', gap: 12, maxWidth: 720 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="listItem"
            onClick={() => navigate(`/journal/${entry.id}`)}
          >
            <div className="listTitle">{entry.title}</div>
            <div className="listMeta">{entry.createdAt}</div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
