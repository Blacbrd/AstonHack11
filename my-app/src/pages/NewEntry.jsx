import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function NewEntry({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams() // Get the ID from the URL if we are editing
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(mode === 'edit')

  // If in "edit" mode, fetch the existing data from Supabase first
  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchEntry = async () => {
        try {
          const { data, error } = await supabase
            .from('journals')
            .select('*')
            .eq('journal_id', id)
            .single()
          
          if (error) throw error
          
          if (data) {
            setTitle(data.title)
            setContent(data.content)
          }
        } catch (error) {
          console.error('Error fetching entry:', error.message)
        } finally {
          setLoading(false)
        }
      }
      fetchEntry()
    }
  }, [mode, id])

  const saveAndGoBack = async () => {
    // Validation: Don't save empty entries (Title OR Content is required)
    // Adjust logic: if BOTH are empty, just return. If one has text, save it.
    if (!title.trim() && !content.trim()) {
      navigate('/journal')
      return
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("No user logged in")
        navigate('/login')
        return
      }

      if (mode === 'new') {
        // INSERT new row
        const { error } = await supabase.from('journals').insert([
          {
            user_id: user.id,
            title: title.trim(),
            content: content.trim()
          }
        ])
        if (error) throw error
      } else {
        // UPDATE existing row
        const { error } = await supabase
          .from('journals')
          .update({ 
            title: title.trim(), 
            content: content.trim() 
          })
          .eq('journal_id', id)
          .eq('user_id', user.id) // Extra safety check

        if (error) throw error
      }
    } catch (error) {
      console.error('Error saving journal:', error.message)
      // Optionally show an alert here if save fails
    }

    // Always navigate back to the list
    navigate('/journal')
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>
        Loading entry...
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={saveAndGoBack}
        style={{
          padding: '8px 16px',
          backgroundColor: '#333',
          color: 'white',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ← Save & Back
      </button>

      <h2 style={{ marginTop: 24, marginBottom: 20, color: 'white' }}>
        {mode === 'edit' ? 'Edit Entry' : 'New Journal Entry'}
      </h2>

      <input
        placeholder="Title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: '10px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: '#2a2a2a',
          color: 'white',
          border: '1px solid #444',
          borderRadius: '8px',
          outline: 'none'
        }}
      />

      <textarea
        placeholder="Write anything you want..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={15}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '12px',
          fontSize: '16px',
          lineHeight: '1.6',
          backgroundColor: '#2a2a2a',
          color: 'white',
          border: '1px solid #444',
          borderRadius: '8px',
          outline: 'none',
          resize: 'vertical'
        }}
      />
    </div>
  )
}