import { useState } from 'react'

export default function Home({ onCreate, onJoin, error }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const trimmed = name.trim()
  return (
    <div className="container">
      <h1>Caption Party</h1>
      <p className="muted">4 players. Take turns posting photos. Best caption wins.</p>
      <label>
        Your name
        <input value={name} onChange={e => setName(e.target.value)} maxLength={16} placeholder="alex" />
      </label>
      <div className="row">
        <button disabled={!trimmed} onClick={() => onCreate(trimmed)}>Create room</button>
      </div>
      <div className="divider">or</div>
      <label>
        Room code
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={4} placeholder="ABCD" />
      </label>
      <div className="row">
        <button disabled={!trimmed || code.length !== 4} onClick={() => onJoin(code, trimmed)}>Join</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
