// In-memory room storage (rooms auto-expire after 24 hours)
const rooms = new Map();
const ROOM_TTL = 24 * 60 * 60 * 1000; // 24 hours

function createRoom(code, game, hostName, maxPlayers) {
  const room = {
    code,
    game,
    hostName,
    maxPlayers,
    players: [{ name: hostName, id: null, ready: false }],
    state: null,
    createdAt: Date.now(),
    started: false
  };
  rooms.set(code, room);
  scheduleCleanup(code);
  return room;
}

function getRoom(code) {
  const room = rooms.get(code);
  if (!room) return null;
  if (Date.now() - room.createdAt > ROOM_TTL) {
    rooms.delete(code);
    return null;
  }
  return room;
}

function updateRoom(code, updates) {
  const room = rooms.get(code);
  if (!room) return null;
  Object.assign(room, updates);
  return room;
}

function deleteRoom(code) {
  rooms.delete(code);
}

function addPlayer(code, player) {
  const room = rooms.get(code);
  if (!room) return null;
  room.players.push(player);
  return room;
}

function removePlayer(code, socketId) {
  const room = rooms.get(code);
  if (!room) return null;
  room.players = room.players.filter(p => p.id !== socketId);
  return room;
}

function scheduleCleanup(code) {
  setTimeout(() => {
    rooms.delete(code);
  }, ROOM_TTL);
}

function getAllRooms() {
  return Array.from(rooms.values());
}

module.exports = { createRoom, getRoom, updateRoom, deleteRoom, addPlayer, removePlayer, getAllRooms };
