import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function NewEntry({ mode, addEntry, updateEntry, entries }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (mode !== 'edit') return

    const entry = entries.find((e) => String(e.id) === String(id))
    if (!entry) return

    setTitle(entry.title)
    setContent(entry.content)
  }, [mode, id, entries])

  const saveAndGoBack = () => {
    // If either field is empty: just go back, DON'T save anything
    if (!title.trim() || !content.trim()) {
      navigate('/journal')
      return
    }

    if (mode === 'new') {
      const now = new Date()
      addEntry({
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        createdAt: now.toLocaleString()
      })
    } else {
      const existing = entries.find((e) => String(e.id) === String(id))
      if (!existing) {
        navigate('/journal')
        return
      }

      updateEntry({
        ...existing,
        title: title.trim(),
        content: content.trim()
      })
    }

    navigate('/journal')
  }

  return (
    <div style={{ padding: '40px' }}>
      <button onClick={saveAndGoBack}>← Back</button>

      <h2 style={{ marginTop: 16 }}>
        {mode === 'edit' ? 'Edit Entry' : 'New Journal Entry'}
      </h2>

      <input
        placeholder="Title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginTop: '20px',
          fontSize: '16px'
        }}
      />

      <textarea
        placeholder="Write anything you want..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '10px',
          fontSize: '16px'
        }}
      />
    </div>
  )
}
