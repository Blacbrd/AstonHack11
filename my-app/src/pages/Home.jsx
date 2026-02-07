import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '40px' }}>
      <h1>Home</h1>
      <button onClick={() => navigate('/journal')}>
        Go to My Journal
      </button>
    </div>
  )
}


