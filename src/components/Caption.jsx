import { useEffect, useState } from 'react'
import { submitCaption, advanceToVoteIfReady, advanceToVote } from '../game'

export default function Caption({ room, players, captions, me }) {
  const myCaption = captions.find(c => c.round === room.round && c.player_id === me.id)
  const [text, setText] = useState(myCaption?.text || '')
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(() => secsLeft(room.round_ends_at))

  useEffect(() => {
    const id = setInterval(() => setRemaining(secsLeft(room.round_ends_at)), 250)
    return () => clearInterval(id)
  }, [room.round_ends_at])

  useEffect(() => {
    advanceToVoteIfReady(room.id, room.round, captions, players)
  }, [captions, players, room.id, room.round])

  useEffect(() => {
    if (remaining === 0) {
      advanceToVote(room.id).catch(() => {})
    }
  }, [remaining, room.id])

  const submit = async () => {
    if (!text.trim()) return
    setBusy(true)
    try { await submitCaption(room.id, room.round, me.id, text) }
    finally { setBusy(false) }
  }

  const submittedCount = captions.filter(c => c.round === room.round).length
  const photographer = players.find(p => p.id === room.photographer_id)

  return (
    <div className="container">
      <div className="timer">{remaining}s</div>
      <img className="photo" src={room.photo_url} alt="" />
      <p className="muted">Photo by {photographer?.name}{me.id === room.photographer_id ? ' (you)' : ''}</p>
      {myCaption ? (
        <>
          <p className="muted">Caption submitted. Waiting for others… ({submittedCount}/{players.length})</p>
          <blockquote>{myCaption.text}</blockquote>
        </>
      ) : (
        <>
          <textarea
            placeholder="Type a caption…"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={140}
            rows={3}
            autoFocus
          />
          <button disabled={busy || !text.trim()} onClick={submit}>Submit</button>
        </>
      )}
    </div>
  )
}

function secsLeft(iso) {
  if (!iso) return 0
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 1000))
}
