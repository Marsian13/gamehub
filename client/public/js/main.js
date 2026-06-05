// ============================================================
// GameHub - Main JavaScript
// Handles: navigation, game cards, room management, music
// ============================================================

const GAMES = [
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    icon: '⭕',
    desc: 'Classic 3×3 grid. Get three in a row to win.',
    players: '2',
    type: 'Strategy',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 2
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: '♟',
    desc: 'The ultimate strategy game. Checkmate your opponent.',
    players: '2',
    type: 'Strategy',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 2
  },
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '⚫',
    desc: 'Jump over pieces to dominate the board.',
    players: '2',
    type: 'Strategy',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 2
  },
  {
    id: 'connect4',
    name: 'Connect 4',
    icon: '🔴',
    desc: 'Drop discs and connect four in a row.',
    players: '2',
    type: 'Strategy',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 2
  },
  {
    id: 'ludo',
    name: 'Ludo',
    icon: '🎲',
    desc: 'Race your tokens home. Roll the dice!',
    players: '2–4',
    type: 'Board',
    modes: ['local', 'online'],
    maxPlayers: 4,
    minPlayers: 2
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢',
    desc: 'Fill the 9×9 grid with digits 1–9.',
    players: '1',
    type: 'Puzzle',
    modes: ['solo'],
    maxPlayers: 1
  },
  {
    id: 'crossword',
    name: 'Crossword',
    icon: '📝',
    desc: 'Solve clues and fill in the grid.',
    players: '1',
    type: 'Puzzle',
    modes: ['solo'],
    maxPlayers: 1
  },
  {
    id: 'battleship',
    name: 'Battleship',
    icon: '🚢',
    desc: 'Place ships, guess coordinates, sink the fleet.',
    players: '2',
    type: 'Strategy',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 2
  },
  {
    id: 'memory',
    name: 'Memory Match',
    icon: '🃏',
    desc: 'Flip cards, find matching pairs, win!',
    players: '1–4',
    type: 'Puzzle',
    modes: ['solo', 'local'],
    maxPlayers: 4
  },
  {
    id: 'wordle',
    name: 'Wordle',
    icon: '💬',
    desc: 'Guess the 5-letter word in 6 tries.',
    players: '1',
    type: 'Word',
    modes: ['solo'],
    maxPlayers: 1
  },
  {
    id: 'poker',
    name: 'Poker',
    icon: '♠',
    desc: "Texas Hold'em. Bluff, bet, and win the chips.",
    players: '2–10',
    type: 'Cards',
    modes: ['vs-computer', 'local', 'online'],
    maxPlayers: 10
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    desc: 'Eat apples, grow longer, avoid yourself.',
    players: '1',
    type: 'Arcade',
    modes: ['solo'],
    maxPlayers: 1
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    desc: 'Reveal tiles without hitting a mine.',
    players: '1',
    type: 'Puzzle',
    modes: ['solo'],
    maxPlayers: 1
  },
  {
    id: '2048',
    name: '2048',
    icon: '🎯',
    desc: 'Slide tiles and reach the 2048 tile.',
    players: '1',
    type: 'Puzzle',
    modes: ['solo'],
    maxPlayers: 1
  }
];

let currentGame = null;
let musicEnabled = false;
let audioCtx = null;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  renderGames();
  createParticles();
  initBgMusic();
  checkUrlHash();
});

function renderGames() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = GAMES.map(game => `
    <div class="game-card" onclick="openGameMenu('${game.id}')">
      <span class="game-card-icon">${game.icon}</span>
      <div class="game-card-name">${game.name}</div>
      <div class="game-card-desc">${game.desc}</div>
      <div class="game-card-meta">
        <span class="tag tag-players">👥 ${game.players} player${game.players === '1' ? '' : 's'}</span>
        <span class="tag tag-type">${game.type}</span>
      </div>
      <button class="game-card-btn">Play Now →</button>
    </div>
  `).join('');
}

function scrollToGames() {
  document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
}

// ---- GAME MENU ----
function openGameMenu(gameId) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;
  currentGame = game;

  // If solo only, go straight
  if (game.modes.length === 1 && game.modes[0] === 'solo') {
    window.location.href = `games/${gameId}/index.html`;
    return;
  }

  const modal = document.getElementById('mode-modal');
  const title = document.getElementById('mode-modal-title');
  const options = document.getElementById('mode-options');

  title.textContent = game.name;

  const modeHtml = [];

  if (game.modes.includes('vs-computer')) {
    modeHtml.push(`
      <div class="mode-option" onclick="startGame('${gameId}','vs-computer')">
        <div class="mode-option-icon">🤖</div>
        <div class="mode-option-title">VS COMPUTER</div>
        <div class="mode-option-desc">Play against AI. Medium difficulty.</div>
      </div>
    `);
  }
  if (game.modes.includes('local')) {
    modeHtml.push(`
      <div class="mode-option" onclick="startLocalGame('${gameId}')">
        <div class="mode-option-icon">👥</div>
        <div class="mode-option-title">LOCAL MULTIPLAYER</div>
        <div class="mode-option-desc">Play on this device with friends. Pass & play.</div>
      </div>
    `);
  }
  if (game.modes.includes('online')) {
    modeHtml.push(`
      <div class="mode-option" onclick="startOnlineGame('${gameId}','host')">
        <div class="mode-option-icon">🌐</div>
        <div class="mode-option-title">PLAY ONLINE — HOST</div>
        <div class="mode-option-desc">Create a room and share code with friends.</div>
      </div>
    `);
    modeHtml.push(`
      <div class="mode-option" onclick="showJoinModal()">
        <div class="mode-option-icon">🔗</div>
        <div class="mode-option-title">PLAY ONLINE — JOIN</div>
        <div class="mode-option-desc">Enter a room code to join a friend's game.</div>
      </div>
    `);
  }

  options.innerHTML = modeHtml.join('');
  modal.style.display = 'flex';
}

function closeModeModal() {
  document.getElementById('mode-modal').style.display = 'none';
}

function startGame(gameId, mode) {
  closeModeModal();
  const url = `games/${gameId}/index.html?mode=${mode}`;
  window.location.href = url;
}

function startLocalGame(gameId) {
  closeModeModal();
  window.location.href = `games/${gameId}/index.html?mode=local`;
}

async function startOnlineGame(gameId, role) {
  closeModeModal();
  if (role === 'host') {
    const game = GAMES.find(g => g.id === gameId);
    const hostName = prompt('Enter your name:') || 'Player 1';
    let maxPlayers = game.maxPlayers;
    if (game.maxPlayers > 2) {
      const num = parseInt(prompt(`How many players? (${game.minPlayers || 2}–${game.maxPlayers})`)) || 2;
      maxPlayers = Math.min(Math.max(num, game.minPlayers || 2), game.maxPlayers);
    }
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: gameId, hostName, maxPlayers })
      });
      const data = await res.json();
      window.location.href = `games/${gameId}/index.html?mode=online&code=${data.code}&name=${encodeURIComponent(hostName)}&host=1`;
    } catch(e) {
      alert('Could not create room. Is the server running?');
    }
  }
}

function showJoinModal() {
  closeModeModal();
  document.getElementById('join-modal').style.display = 'flex';
}

function closeJoinModal() {
  document.getElementById('join-modal').style.display = 'none';
}

async function joinRoomFromModal() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  const name = document.getElementById('join-name-input').value.trim();
  if (!code || !name) return showToast('Enter code and name');

  try {
    const res = await fetch(`/api/join-room/${code}`);
    if (!res.ok) {
      const err = await res.json();
      return showToast(err.error || 'Room not found');
    }
    const data = await res.json();
    closeJoinModal();
    window.location.href = `games/${data.room.game}/index.html?mode=online&code=${code}&name=${encodeURIComponent(name)}`;
  } catch(e) {
    showToast('Server error. Is it running?');
  }
}

function checkUrlHash() {
  // Handle direct game links
}

// ---- PARTICLES ----
function createParticles() {
  const container = document.getElementById('particles');
  const colors = ['#e8b84b', '#ff6b35', '#00d4ff', '#8b5cf6', '#00ff88'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 15}s;
      animation-duration: ${Math.random() * 10 + 10}s;
    `;
    container.appendChild(p);
  }
}

// ---- AMBIENT MUSIC (Web Audio API - no file needed) ----
function initBgMusic() {
  // Will be lazily initialized on user interaction
}

function toggleMusic() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startAmbientMusic();
    musicEnabled = true;
  } else if (musicEnabled) {
    audioCtx.suspend();
    musicEnabled = false;
    document.getElementById('music-btn').textContent = '🔇';
  } else {
    audioCtx.resume();
    musicEnabled = true;
    document.getElementById('music-btn').textContent = '🔊';
  }
}

function startAmbientMusic() {
  if (!audioCtx) return;
  document.getElementById('music-btn').textContent = '🔊';
  playAmbientLoop();
}

function playAmbientLoop() {
  if (!audioCtx || !musicEnabled) return;

  // Pentatonic ambient notes
  const notes = [220, 261.63, 293.66, 349.23, 392, 440, 523.25];
  let time = audioCtx.currentTime;

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.08, time);
  masterGain.connect(audioCtx.destination);

  // Reverb (convolver)
  const convolver = audioCtx.createConvolver();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  convolver.buffer = buffer;
  convolver.connect(masterGain);

  // Low drone
  const drone = audioCtx.createOscillator();
  const droneGain = audioCtx.createGain();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(55, time);
  droneGain.gain.setValueAtTime(0.3, time);
  drone.connect(droneGain);
  droneGain.connect(convolver);
  drone.start(time);

  // Random arpeggio
  function scheduleNote() {
    if (!musicEnabled) return;
    const note = notes[Math.floor(Math.random() * notes.length)] * (Math.random() > 0.7 ? 2 : 1);
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
    osc.connect(g);
    g.connect(convolver);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.5);
    const delay = Math.random() * 800 + 400;
    setTimeout(scheduleNote, delay);
  }
  scheduleNote();
}

// ---- TOAST ----
let toastTimer = null;
function showToast(message, duration = 2500) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ---- UTILS (shared across games) ----
window.GameHub = {
  showToast,
  GAMES,
  getQueryParams() {
    const p = {};
    new URLSearchParams(window.location.search).forEach((v, k) => p[k] = v);
    return p;
  },
  saveState(key, data) {
    try {
      localStorage.setItem(`gamehub_${key}`, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) {}
  },
  loadState(key) {
    try {
      const raw = localStorage.getItem(`gamehub_${key}`);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`gamehub_${key}`);
        return null;
      }
      return obj.data;
    } catch(e) { return null; }
  },
  clearState(key) {
    localStorage.removeItem(`gamehub_${key}`);
  }
};
