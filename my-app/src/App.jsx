import { Routes, Route, Navigate } from 'react-router-dom'
import Yoga from './pages/Yoga'
import PoseSession from './pages/PoseSession'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/yoga" />} />
      <Route path="/yoga" element={<Yoga />} />
      <Route path="/yoga/:poseName" element={<PoseSession />} />
    </Routes>
  )
}

export default App