import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Yoga from './pages/Yoga'
import PoseSession from './pages/PoseSession'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Route for the "/" path shows the Landing page */}
      <Route path="/" element={<Landing />} />
      
      {/* Route for the "/yoga" path shows the Pose Selection menu */}
      <Route path="/yoga" element={<Yoga />} />
      
      {/* Route for specific poses */}
      <Route path="/yoga/:poseName" element={<PoseSession />} />
    </Routes>
  )
}

export default App