import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'

// --- Pages ---
import Landing from './pages/Landing'
import Home from './pages/Home' // Keeping Home available if needed, or Landing replaces it
import Yoga from './pages/Yoga'
import PoseSession from './pages/PoseSession'

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
  // -------- Journal State --------
  const [entries, setEntries] = useState([])
  const addEntry = (entry) => setEntries((prev) => [entry, ...prev])
  const updateEntry = (updated) =>
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))

  // -------- Diet State (memory only) --------
  const [dietLogs, setDietLogs] = useState({})
  const saveDietForDate = (dateKey, meals) => {
    setDietLogs((prev) => ({ ...prev, [dateKey]: meals }))
  }

  // -------- Sleep State (memory only) --------
  const [sleepLogs, setSleepLogs] = useState({})
  const saveSleepForDate = (dateKey, data) => {
    setSleepLogs((prev) => ({ ...prev, [dateKey]: data }))
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Main Entry Point */}
        <Route path="/" element={<Landing />} />

        {/* Optional: Old Home Dashboard if you still want to access it */}
        <Route path="/home" element={<Home />} />

        {/* -------- Yoga Routes -------- */}
        <Route path="/yoga" element={<Yoga />} />
        <Route path="/yoga/:poseName" element={<PoseSession />} />

        {/* -------- Journal Routes -------- */}
        <Route path="/journal" element={<Journaling entries={entries} />} />
        <Route
          path="/journal/new"
          element={<NewEntry mode="new" addEntry={addEntry} entries={entries} />}
        />
        <Route
          path="/journal/:id"
          element={<NewEntry mode="edit" updateEntry={updateEntry} entries={entries} />}
        />

        {/* -------- Diet Routes -------- */}
        <Route path="/diet" element={<DietCalendar dietLogs={dietLogs} />} />
        <Route
          path="/diet/:date"
          element={<DietDay dietLogs={dietLogs} saveDietForDate={saveDietForDate} />}
        />

        {/* -------- Sleep Routes -------- */}
        <Route path="/sleep" element={<SleepDashboard sleepLogs={sleepLogs} />} />
        <Route
          path="/sleep/log"
          element={<SleepLog sleepLogs={sleepLogs} saveSleepForDate={saveSleepForDate} />}
        />
      </Routes>
    </BrowserRouter>
  )
}