import { useState } from 'react'
import { uploadPhoto } from '../game'

export default function Photo({ room, players, me }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const photographer = players.find(p => p.id === room.photographer_id)
  const isPhotographer = me.id === room.photographer_id

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr(null)
    try { await uploadPhoto(room.id, room.round, file) }
    catch (ex) { setErr(ex.message); setBusy(false) }
  }

  return (
    <div className="container">
      <h2>Round {room.round} / {room.total_rounds}</h2>
      {isPhotographer ? (
        <>
          <p>You're up. Post a photo for the others to caption.</p>
          <label className="file-btn">
            {busy ? 'Uploading…' : 'Choose photo'}
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={busy} />
          </label>
          {err && <p className="error">{err}</p>}
        </>
      ) : (
        <p className="muted">Waiting for <strong>{photographer?.name}</strong> to post a photo…</p>
      )}
      <Scoreboard players={players} />
    </div>
  )
}

function Scoreboard({ players }) {
  return (
    <ul className="scores">
      {[...players].sort((a, b) => b.score - a.score).map(p => (
        <li key={p.id}><span>{p.name}</span><span>{p.score}</span></li>
      ))}
    </ul>
  )
}
