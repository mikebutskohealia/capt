import { nextRound } from '../game'

export default function Reveal({ room, players, captions, votes, me }) {
  const roundCaptions = captions.filter(c => c.round === room.round)
  const roundVotes = votes.filter(v => v.round === room.round)
  const isHost = players[0]?.id === me.id
  const lastRound = room.round >= room.total_rounds

  const votesFor = (captionId) => roundVotes.filter(v => v.caption_id === captionId).length
  const playerById = Object.fromEntries(players.map(p => [p.id, p]))

  return (
    <div className="container">
      <img className="photo" src={room.photo_url} alt="" />
      <h3>Round {room.round} results</h3>
      <ul className="captions">
        {[...roundCaptions].sort((a, b) => votesFor(b.id) - votesFor(a.id)).map(c => (
          <li key={c.id}>
            <div className="caption reveal">
              <div>{c.text}</div>
              <div className="muted">
                — {playerById[c.player_id]?.name} · {votesFor(c.id)} vote{votesFor(c.id) === 1 ? '' : 's'}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <h4>Scoreboard</h4>
      <ul className="scores">
        {[...players].sort((a, b) => b.score - a.score).map(p => (
          <li key={p.id}><span>{p.name}</span><span>{p.score}</span></li>
        ))}
      </ul>
      {isHost ? (
        <button onClick={() => nextRound(room.id, room, players)}>
          {lastRound ? 'Finish game' : 'Next round'}
        </button>
      ) : (
        <p className="muted">Waiting for host to continue…</p>
      )}
    </div>
  )
}
