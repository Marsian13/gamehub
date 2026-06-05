const roomManager = require('./roomManager');

module.exports = function socketHandler(io, roomManager) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a room with a code
    socket.on('join-room', ({ code, playerName }) => {
      const room = roomManager.getRoom(code);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (room.players.length >= room.maxPlayers) return socket.emit('error', { message: 'Room is full' });

      // Update player id
      const existing = room.players.find(p => p.name === playerName && !p.id);
      if (existing) {
        existing.id = socket.id;
      } else {
        roomManager.addPlayer(code, { name: playerName, id: socket.id, ready: false });
      }

      socket.join(code);
      socket.roomCode = code;
      socket.playerName = playerName;

      const updatedRoom = roomManager.getRoom(code);
      io.to(code).emit('room-updated', updatedRoom);

      if (updatedRoom.players.filter(p => p.id).length === updatedRoom.maxPlayers) {
        io.to(code).emit('room-full', updatedRoom);
      }
    });

    // Player ready
    socket.on('player-ready', ({ code }) => {
      const room = roomManager.getRoom(code);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (player) player.ready = true;
      io.to(code).emit('room-updated', room);
      const allReady = room.players.every(p => p.ready);
      if (allReady && room.players.length >= 2) {
        io.to(code).emit('game-start', room);
      }
    });

    // Generic game move
    socket.on('game-move', ({ code, move, state }) => {
      const room = roomManager.getRoom(code);
      if (!room) return;
      room.state = state;
      socket.to(code).emit('opponent-move', { move, state, playerId: socket.id });
    });

    // Chat message
    socket.on('chat-message', ({ code, message, playerName }) => {
      io.to(code).emit('chat-message', { message, playerName, timestamp: Date.now() });
    });

    // Game over
    socket.on('game-over', ({ code, winner, state }) => {
      io.to(code).emit('game-over', { winner, state });
    });

    // Poker specific events
    socket.on('poker-action', ({ code, action, amount, state }) => {
      const room = roomManager.getRoom(code);
      if (!room) return;
      room.state = state;
      io.to(code).emit('poker-state', { action, amount, state, playerId: socket.id });
    });

    // Undo move
    socket.on('undo-move', ({ code }) => {
      socket.to(code).emit('undo-requested', { playerId: socket.id });
    });

    socket.on('undo-accepted', ({ code }) => {
      io.to(code).emit('undo-accepted');
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.roomCode) {
        const room = roomManager.removePlayer(socket.roomCode, socket.id);
        if (room) {
          io.to(socket.roomCode).emit('player-left', { playerName: socket.playerName, room });
          if (room.players.filter(p => p.id).length === 0) {
            roomManager.deleteRoom(socket.roomCode);
          }
        }
      }
    });
  });
};
