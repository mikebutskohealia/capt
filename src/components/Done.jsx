export default function Done({ players, leave }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]
  return (
    <div className="container">
      <h2>Game over</h2>
      <p>🏆 <strong>{winner.name}</strong> wins with {winner.score} points.</p>
      <ul className="scores">
        {sorted.map(p => (
          <li key={p.id}><span>{p.name}</span><span>{p.score}</span></li>
        ))}
      </ul>
      <button onClick={leave}>New game</button>
    </div>
  )
}
