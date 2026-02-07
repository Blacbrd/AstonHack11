import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '40px' }}>
      <h1>Home</h1>

      <button onClick={() => navigate('/journal')}>My Journal</button>

      <button onClick={() => navigate('/diet')} style={{ marginLeft: 12 }}>
        Diet
      </button>

      <button onClick={() => navigate('/sleep')} style={{ marginLeft: 12 }}>
        Sleep
      </button>
    </div>
  )
}
