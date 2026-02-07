import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Home from './pages/Home'
import Journaling from './pages/Journaling'
import NewEntry from './pages/NewEntry'

export default function App() {
  const [entries, setEntries] = useState([])

  // NEWEST FIRST
  const addEntry = (entry) => {
    setEntries((prev) => [entry, ...prev])
  }

  const updateEntry = (updated) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/journal" element={<Journaling entries={entries} />} />

        <Route
          path="/journal/new"
          element={<NewEntry mode="new" addEntry={addEntry} entries={entries} />}
        />

        <Route
          path="/journal/:id"
          element={<NewEntry mode="edit" updateEntry={updateEntry} entries={entries} />}
        />
      </Routes>
    </BrowserRouter>
  )
}
