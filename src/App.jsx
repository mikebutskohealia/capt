import { useEffect, useState, useCallback } from 'react'
import { createRoom, joinRoom, getRoomState, subscribeRoom, endGame } from './game'
import Home from './components/Home.jsx'
import Lobby from './components/Lobby.jsx'
import Photo from './components/Photo.jsx'
import Caption from './components/Caption.jsx'
import Vote from './components/Vote.jsx'
import Reveal from './components/Reveal.jsx'
import Done from './components/Done.jsx'

const STORE_KEY = 'caption-party-session'

function saveSession(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)) }
function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null') } catch { return null }
}

export default function App() {
  const [session, setSession] = useState(() => loadSession())
  const [state, setState] = useState({ room: null, players: [], captions: [], votes: [] })
  const [error, setError] = useState(null)

  const refresh = useCallback(async (roomId) => {
    try {
      const next = await getRoomState(roomId)
      setState(next)
    } catch (e) { setError(e.message) }
  }, [])

  useEffect(() => {
    if (!session?.roomId) return
    refresh(session.roomId)
    const unsub = subscribeRoom(session.roomId, () => refresh(session.roomId))
    return unsub
  }, [session?.roomId, refresh])

  const onCreate = async (name) => {
    try {
      const { room, player } = await createRoom(name)
      const s = { roomId: room.id, playerId: player.id }
      saveSession(s); setSession(s)
    } catch (e) { setError(e.message) }
  }

  const onJoin = async (roomId, name) => {
    try {
      const player = await joinRoom(roomId.toUpperCase(), name)
      const s = { roomId: roomId.toUpperCase(), playerId: player.id }
      saveSession(s); setSession(s)
    } catch (e) { setError(e.message) }
  }

  const leave = () => {
    localStorage.removeItem(STORE_KEY)
    setSession(null)
    setState({ room: null, players: [], captions: [], votes: [] })
  }

  if (!session) return <Home onCreate={onCreate} onJoin={onJoin} error={error} />

  const { room, players, captions, votes } = state
  if (!room) return <div className="container"><p>Loading room {session.roomId}…</p></div>

  const me = players.find(p => p.id === session.playerId)
  if (!me) return (
    <div className="container">
      <p>You're not in this room anymore.</p>
      <button onClick={leave}>Back</button>
    </div>
  )

  const shared = { room, players, captions, votes, me, leave }
  const isHost = players[0]?.id === me.id
  const inGame = ['photo', 'caption', 'vote', 'reveal'].includes(room.state)

  const handleEndGame = () => {
    if (confirm('End the game now? Current scores will be shown.')) {
      endGame(room.id)
    }
  }

  let screen
  switch (room.state) {
    case 'lobby':   screen = <Lobby {...shared} />; break
    case 'photo':   screen = <Photo {...shared} />; break
    case 'caption': screen = <Caption {...shared} />; break
    case 'vote':    screen = <Vote {...shared} />; break
    case 'reveal':  screen = <Reveal {...shared} />; break
    case 'done':    screen = <Done {...shared} />; break
    default:        screen = <div className="container">Unknown state: {room.state}</div>
  }

  return (
    <>
      {screen}
      {isHost && inGame && (
        <div className="container host-bar">
          <button className="ghost" onClick={handleEndGame}>End game</button>
        </div>
      )}
    </>
  )
}
