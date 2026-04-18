import { supabase } from './supabase'

export const PLAYERS_REQUIRED = 4
export const CAPTION_SECONDS = 60
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return s
}

export async function createRoom(name) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomRoomCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ id, state: 'lobby' })
      .select()
      .single()
    if (!error) {
      const player = await joinRoom(id, name)
      return { room: data, player }
    }
    if (error.code !== '23505') throw error
  }
  throw new Error('Could not allocate room code')
}

export async function joinRoom(roomId, name) {
  const { data: existing, error: fetchErr } = await supabase
    .from('players')
    .select('seat')
    .eq('room_id', roomId)
    .order('seat', { ascending: true })
  if (fetchErr) throw fetchErr
  if (existing.length >= PLAYERS_REQUIRED) throw new Error('Room is full')

  const seat = existing.length
  const { data, error } = await supabase
    .from('players')
    .insert({ room_id: roomId, name, seat })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRoomState(roomId) {
  const [{ data: room }, { data: players }, { data: captions }, { data: votes }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('players').select('*').eq('room_id', roomId).order('seat'),
    supabase.from('captions').select('*').eq('room_id', roomId),
    supabase.from('votes').select('*').eq('room_id', roomId),
  ])
  return { room, players: players || [], captions: captions || [], votes: votes || [] }
}

export function subscribeRoom(roomId, onChange) {
  const ch = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms',    filter: `id=eq.${roomId}` },      onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players',  filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'captions', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes',    filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe()
  return () => supabase.removeChannel(ch)
}

export async function startGame(roomId, players) {
  const photographer = players[0]
  const { error } = await supabase
    .from('rooms')
    .update({ state: 'photo', round: 1, photographer_id: photographer.id, photo_url: null })
    .eq('id', roomId)
  if (error) throw error
}

export async function uploadPhoto(roomId, round, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${roomId}/${round}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  const roundEndsAt = new Date(Date.now() + CAPTION_SECONDS * 1000).toISOString()
  const { error } = await supabase
    .from('rooms')
    .update({ photo_url: data.publicUrl, state: 'caption', round_ends_at: roundEndsAt })
    .eq('id', roomId)
  if (error) throw error
}

export async function submitCaption(roomId, round, playerId, text) {
  const { error } = await supabase
    .from('captions')
    .upsert(
      { room_id: roomId, round, player_id: playerId, text: text.trim() },
      { onConflict: 'room_id,round,player_id' },
    )
  if (error) throw error
}

export async function advanceToVoteIfReady(roomId, round, captions, players, photographerId) {
  const expected = players.filter(p => p.id !== photographerId).length
  const have = captions.filter(c => c.round === round).length
  if (have >= expected) {
    await supabase.from('rooms').update({ state: 'vote', round_ends_at: null }).eq('id', roomId)
  }
}

export async function castVote(roomId, round, voterId, captionId) {
  const { error } = await supabase
    .from('votes')
    .upsert(
      { room_id: roomId, round, voter_id: voterId, caption_id: captionId },
      { onConflict: 'room_id,round,voter_id' },
    )
  if (error) throw error
}

export async function advanceToRevealIfReady(roomId, round, votes, players) {
  const have = votes.filter(v => v.round === round).length
  if (have >= players.length) {
    await tallyAndReveal(roomId, round)
  }
}

async function tallyAndReveal(roomId, round) {
  const [{ data: captions }, { data: votes }, { data: players }] = await Promise.all([
    supabase.from('captions').select('*').eq('room_id', roomId).eq('round', round),
    supabase.from('votes').select('*').eq('room_id', roomId).eq('round', round),
    supabase.from('players').select('*').eq('room_id', roomId),
  ])
  const pointsByPlayer = new Map(players.map(p => [p.id, p.score]))
  for (const v of votes) {
    const c = captions.find(x => x.id === v.caption_id)
    if (!c) continue
    pointsByPlayer.set(c.player_id, (pointsByPlayer.get(c.player_id) || 0) + 1)
  }
  for (const [id, score] of pointsByPlayer) {
    await supabase.from('players').update({ score }).eq('id', id)
  }
  await supabase.from('rooms').update({ state: 'reveal' }).eq('id', roomId)
}

export async function nextRound(roomId, room, players) {
  if (room.round >= room.total_rounds) {
    await supabase.from('rooms').update({ state: 'done' }).eq('id', roomId)
    return
  }
  const nextRoundNum = room.round + 1
  const sorted = [...players].sort((a, b) => a.seat - b.seat)
  const photographer = sorted[(nextRoundNum - 1) % sorted.length]
  await supabase.from('rooms').update({
    state: 'photo',
    round: nextRoundNum,
    photographer_id: photographer.id,
    photo_url: null,
    round_ends_at: null,
  }).eq('id', roomId)
}
