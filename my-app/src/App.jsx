import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Home from './pages/Home'

// Journal
import Journaling from './pages/Journaling'
import NewEntry from './pages/NewEntry'

// Diet
import DietCalendar from './pages/DietCalendar'
import DietDay from './pages/DietDay'

// Sleep
import SleepDashboard from './pages/SleepDashboard'
import SleepLog from './pages/SleepLog'

export default function App() {
  // -------- Journal --------
  const [entries, setEntries] = useState([])
  const addEntry = (entry) => setEntries((prev) => [entry, ...prev])
  const updateEntry = (updated) =>
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))

  // -------- Diet (memory only) --------
  const [dietLogs, setDietLogs] = useState({})
  const saveDietForDate = (dateKey, meals) => {
    setDietLogs((prev) => ({ ...prev, [dateKey]: meals }))
  }

  // -------- Sleep (memory only) --------
  // sleepLogs[YYYY-MM-DD] = { hours: number, wakeTime: "HH:MM" }
  const [sleepLogs, setSleepLogs] = useState({})

  const saveSleepForDate = (dateKey, data) => {
    setSleepLogs((prev) => ({ ...prev, [dateKey]: data }))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Journal */}
        <Route path="/journal" element={<Journaling entries={entries} />} />
        <Route
          path="/journal/new"
          element={<NewEntry mode="new" addEntry={addEntry} entries={entries} />}
        />
        <Route
          path="/journal/:id"
          element={<NewEntry mode="edit" updateEntry={updateEntry} entries={entries} />}
        />

        {/* Diet */}
        <Route path="/diet" element={<DietCalendar dietLogs={dietLogs} />} />
        <Route
          path="/diet/:date"
          element={<DietDay dietLogs={dietLogs} saveDietForDate={saveDietForDate} />}
        />

        {/* Sleep */}
        <Route path="/sleep" element={<SleepDashboard sleepLogs={sleepLogs} />} />
        <Route
          path="/sleep/log"
          element={<SleepLog sleepLogs={sleepLogs} saveSleepForDate={saveSleepForDate} />}
        />
      </Routes>
    </BrowserRouter>
  )
}
