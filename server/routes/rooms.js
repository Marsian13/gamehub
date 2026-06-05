const express = require('express');
const router = express.Router();
const roomManager = require('../utils/roomManager');

router.get('/', (req, res) => {
  res.json(roomManager.getAllRooms().map(r => ({
    code: r.code,
    game: r.game,
    players: r.players.length,
    maxPlayers: r.maxPlayers,
    started: r.started
  })));
});

router.get('/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

module.exports = router;
