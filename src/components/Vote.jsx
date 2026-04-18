import { useEffect, useMemo, useState } from 'react'
import { castVote, advanceToRevealIfReady, advanceToReveal } from '../game'

export default function Vote({ room, players, captions, votes, me }) {
  const roundCaptions = useMemo(
    () => captions.filter(c => c.round === room.round),
    [captions, room.round],
  )
  const shuffled = useMemo(() => {
    const copy = [...roundCaptions]
    // deterministic shuffle per room+round so everyone sees same order
    const seed = hashStr(room.id + ':' + room.round)
    let rng = seed
    for (let i = copy.length - 1; i > 0; i--) {
      rng = (rng * 1664525 + 1013904223) >>> 0
      const j = rng % (i + 1)
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }, [roundCaptions, room.id, room.round])

  const myVote = votes.find(v => v.round === room.round && v.voter_id === me.id)

  const [remaining, setRemaining] = useState(() => secsLeft(room.round_ends_at))
  useEffect(() => {
    const id = setInterval(() => setRemaining(secsLeft(room.round_ends_at)), 250)
    return () => clearInterval(id)
  }, [room.round_ends_at])

  useEffect(() => {
    advanceToRevealIfReady(room.id, room.round, votes, players)
  }, [votes, players, room.id, room.round])

  useEffect(() => {
    if (remaining === 0 && room.round_ends_at) {
      advanceToReveal(room.id, room.round).catch(() => {})
    }
  }, [remaining, room.id, room.round, room.round_ends_at])

  const vote = async (captionId) => {
    if (myVote) return
    await castVote(room.id, room.round, me.id, captionId)
  }

  const voted = votes.filter(v => v.round === room.round).length
  return (
    <div className="container">
      <div className="timer">{remaining}s</div>
      <img className="photo" src={room.photo_url} alt="" />
      <h3>Pick your favorite caption</h3>
      <p className="muted">{voted}/{players.length} voted</p>
      <ul className="captions">
        {shuffled.map(c => {
          const selected = myVote?.caption_id === c.id
          const disabled = !!myVote || c.player_id === me.id
          return (
            <li key={c.id}>
              <button
                className={'caption' + (selected ? ' selected' : '') + (disabled && !selected ? ' disabled' : '')}
                onClick={() => vote(c.id)}
                disabled={disabled}
              >
                {c.text}
                {c.player_id === me.id && <span className="tag">yours</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function secsLeft(iso) {
  if (!iso) return 0
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 1000))
}

function hashStr(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
