import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'

// --- Pages ---
import LoginPage from './pages/LoginPage'
import Landing from './pages/Landing'
import Yoga from './pages/Yoga'
import PoseSession from './pages/PoseSession'
import MeditationPage from './pages/MeditationPage'

// Journal
import Journaling from './pages/Journaling'
import NewEntry from './pages/NewEntry'

// Diet
import DietCalendar from './pages/DietCalendar'
import DietDay from './pages/DietDay'

// Sleep
import SleepDashboard from './pages/SleepDashboard'
import SleepLog from './pages/SleepLog'

import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // State handlers...
  const [entries, setEntries] = useState([])
  const addEntry = (entry) => setEntries((prev) => [entry, ...prev])
  const updateEntry = (updated) => setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))

  const [dietLogs, setDietLogs] = useState({})
  const saveDietForDate = (dateKey, meals) => { setDietLogs((prev) => ({ ...prev, [dateKey]: meals })) }

  const [sleepLogs, setSleepLogs] = useState({})
  const saveSleepForDate = (dateKey, data) => { setSleepLogs((prev) => ({ ...prev, [dateKey]: data })) }

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Landing session={session} /> : <Navigate to="/login" />} />

        {/* Features */}
        <Route path="/yoga" element={session ? <Yoga /> : <Navigate to="/login" />} />
        <Route path="/yoga/:poseName" element={session ? <PoseSession /> : <Navigate to="/login" />} />
        
        {/* Meditation Route */}
        <Route path="/meditation" element={session ? <MeditationPage /> : <Navigate to="/login" />} />

        {/* Journal */}
        <Route path="/journal" element={session ? <Journaling entries={entries} /> : <Navigate to="/login" />} />
        <Route path="/journal/new" element={session ? <NewEntry mode="new" addEntry={addEntry} entries={entries} /> : <Navigate to="/login" />} />
        <Route path="/journal/:id" element={session ? <NewEntry mode="edit" updateEntry={updateEntry} entries={entries} /> : <Navigate to="/login" />} />

        {/* Diet */}
        <Route path="/diet" element={session ? <DietCalendar dietLogs={dietLogs} /> : <Navigate to="/login" />} />
        <Route path="/diet/:date" element={session ? <DietDay dietLogs={dietLogs} saveDietForDate={saveDietForDate} /> : <Navigate to="/login" />} />

        {/* Sleep */}
        <Route path="/sleep" element={session ? <SleepDashboard sleepLogs={sleepLogs} /> : <Navigate to="/login" />} />
        <Route path="/sleep/log" element={session ? <SleepLog sleepLogs={sleepLogs} saveSleepForDate={saveSleepForDate} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}