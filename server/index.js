const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const roomManager = require('./utils/roomManager');
const socketHandler = require('./utils/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/public')));

// API Routes
app.use('/api/rooms', require('./routes/rooms'));

// Generate room code endpoint
app.post('/api/create-room', (req, res) => {
  const { game, hostName, maxPlayers } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = roomManager.createRoom(code, game, hostName, maxPlayers || 2);
  res.json({ code, room });
});

app.get('/api/join-room/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });
  res.json({ room });
});

// Serve all game pages
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

socketHandler(io, roomManager);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 GameHub running at http://localhost:${PORT}\n`);
});
