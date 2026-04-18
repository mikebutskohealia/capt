import { startGame, PLAYERS_REQUIRED } from '../game'

export default function Lobby({ room, players, me, leave }) {
  const isHost = players[0]?.id === me.id
  const ready = players.length === PLAYERS_REQUIRED
  return (
    <div className="container">
      <h2>Room <code>{room.id}</code></h2>
      <p className="muted">Share this code with friends. {players.length}/{PLAYERS_REQUIRED} joined.</p>
      <ul className="players">
        {players.map(p => (
          <li key={p.id}>
            {p.name} {p.id === me.id && <span className="muted">(you)</span>}
            {p.id === players[0]?.id && <span className="tag">host</span>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button disabled={!ready} onClick={() => startGame(room.id, players)}>
          {ready ? 'Start game' : `Waiting for ${PLAYERS_REQUIRED - players.length} more…`}
        </button>
      ) : (
        <p className="muted">Waiting for host to start…</p>
      )}
      <button className="ghost" onClick={leave}>Leave</button>
    </div>
  )
}
