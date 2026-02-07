import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageShell from '../components/PageShell'

export default function Journaling() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJournals()
  }, [])

  const fetchJournals = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('journals')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setEntries(data)
      }
    } catch (error) {
      console.error('Error fetching journals:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <PageShell
      title="My Journal"
      subtitle=""
      left={<button className="btn" onClick={() => navigate('/')}>← Back</button>}
      right={<button className="iconBtn" onClick={() => navigate('/journal/new')}>+</button>}
    >
      {loading ? (
        <div style={{ padding: 20, color: '#888' }}>Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="pageCard section">
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No journal entries yet. Click + to add one.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 18, display: 'grid', gap: 12, maxWidth: 720 }}>
          {entries.map((entry) => (
            <div
              key={entry.journal_id}
              className="listItem"
              onClick={() => navigate(`/journal/${entry.journal_id}`)}
            >
              <div className="listTitle">{entry.title || 'Untitled Entry'}</div>
              <div className="listMeta">{formatDate(entry.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}