// ============================================================
// TIC-TAC-TOE — Game Logic
// Supports: vs-computer (minimax), local multiplayer, online
// ============================================================

let board = Array(9).fill(null);
let currentPlayer = 0; // 0 = X, 1 = O
let players = ['Player 1', 'Player 2'];
let scores = [0, 0, 0]; // [P1 wins, P2 wins, draws]
let mode = 'local';
let gameActive = false;
let roomCode = null;
let socket = null;
let myIndex = 0; // which player am I in online mode

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub.getQueryParams();
  mode = params.mode || 'local';
  roomCode = params.code || null;

  if (mode === 'vs-computer') {
    players = [params.name || 'You', 'Computer'];
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row">
        <span class="player-label" style="color:var(--neon-blue)">✕ X</span>
        <input class="player-name-input" id="p1-name" value="Player 1" placeholder="Your name" maxlength="16"/>
      </div>
    `;
  } else if (mode === 'online') {
    players = [decodeURIComponent(params.name || 'Player 1'), 'Opponent'];
    myIndex = params.host === '1' ? 0 : 1;
    setupOnline(params);
    return;
  } else {
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row">
        <span class="player-label" style="color:var(--neon-blue)">✕ X</span>
        <input class="player-name-input" id="p1-name" value="Player 1" placeholder="Player 1 name" maxlength="16"/>
      </div>
      <div class="player-input-row">
        <span class="player-label" style="color:var(--accent2)">⭕ O</span>
        <input class="player-name-input" id="p2-name" value="Player 2" placeholder="Player 2 name" maxlength="16"/>
      </div>
    `;
  }

  const saved = window.GameHub.loadState('tictactoe_' + mode);
  if (saved) {
    const resume = confirm('Resume previous game?');
    if (resume) {
      players = saved.players;
      scores = saved.scores;
      showGame();
      board = saved.board;
      currentPlayer = saved.currentPlayer;
      renderBoard();
      updateTurnLabel();
      return;
    }
  }
});

function startGame() {
  const p1 = document.getElementById('p1-name')?.value.trim() || 'Player 1';
  const p2 = document.getElementById('p2-name')?.value.trim() || (mode === 'vs-computer' ? 'Computer' : 'Player 2');
  players = [p1, p2];
  scores = [0, 0, 0];
  showGame();
  resetBoard();
}

function showGame() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  gameActive = true;
}

function resetBoard() {
  board = Array(9).fill(null);
  currentPlayer = 0;
  gameActive = true;
  document.getElementById('winner-overlay').style.display = 'none';
  renderBoard();
  updateTurnLabel();
  updateScoreLabel();
  saveGameState();

  // If vs computer and computer goes first? No — X always starts.
}

function resetGame() {
  resetBoard();
  if (mode === 'vs-computer' && currentPlayer === 1) {
    setTimeout(computerMove, 400);
  }
}

function renderBoard() {
  const el = document.getElementById('board');
  el.innerHTML = board.map((cell, i) => `
    <div class="ttt-cell ${cell ? cell.toLowerCase() + ' taken' : ''}" onclick="handleClick(${i})">
      ${cell ? `<span class="cell-mark">${cell === 'X' ? '✕' : '○'}</span>` : ''}
    </div>
  `).join('');
}

function handleClick(i) {
  if (!gameActive || board[i]) return;
  if (mode === 'online' && currentPlayer !== myIndex) {
    window.GameHub.showToast("Wait for your turn!");
    return;
  }

  makeMove(i);

  if (mode === 'online' && socket) {
    socket.emit('game-move', { code: roomCode, move: i, state: { board, currentPlayer, scores } });
  }

  if (mode === 'vs-computer' && gameActive && currentPlayer === 1) {
    setTimeout(computerMove, 500);
  }
}

function makeMove(i) {
  if (board[i] || !gameActive) return;
  board[i] = currentPlayer === 0 ? 'X' : 'O';
  renderBoard();

  const win = checkWin();
  if (win) {
    highlightWin(win);
    setTimeout(() => showWinner(players[currentPlayer]), 400);
    scores[currentPlayer]++;
    gameActive = false;
    saveGameState();
    return;
  }
  if (board.every(c => c)) {
    setTimeout(() => showWinner(null), 300);
    scores[2]++;
    gameActive = false;
    saveGameState();
    return;
  }
  currentPlayer = 1 - currentPlayer;
  updateTurnLabel();
  updateScoreLabel();
  saveGameState();
}

function checkWin() {
  for (const combo of WINS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return combo;
  }
  return null;
}

function highlightWin(combo) {
  const cells = document.querySelectorAll('.ttt-cell');
  combo.forEach(i => cells[i].classList.add('winning'));
}

function showWinner(name) {
  const overlay = document.getElementById('winner-overlay');
  const title = document.getElementById('winner-title');
  const sub = document.getElementById('winner-sub');
  const trophy = document.getElementById('winner-trophy');
  if (name) {
    title.textContent = `${name} Wins! 🎉`;
    sub.textContent = `Score: ${players[0]} ${scores[0]} — ${players[1]} ${scores[1]}`;
    trophy.textContent = '🏆';
  } else {
    title.textContent = "It's a Draw!";
    sub.textContent = `Draws: ${scores[2]}`;
    trophy.textContent = '🤝';
  }
  overlay.style.display = 'flex';
}

function updateTurnLabel() {
  const mark = currentPlayer === 0 ? '✕' : '○';
  document.getElementById('turn-label').textContent = `${mark} ${players[currentPlayer]}'s Turn`;
}

function updateScoreLabel() {
  document.getElementById('score-label').textContent =
    `${players[0]} ${scores[0]} — ${scores[2]} Draws — ${scores[1]} ${players[1]}`;
}

function saveGameState() {
  window.GameHub.saveState('tictactoe_' + mode, { board, currentPlayer, players, scores });
}

// ---- MINIMAX AI ----
function computerMove() {
  if (!gameActive) return;
  const best = minimax(board, 1, true);
  makeMove(best.index);
}

function minimax(b, depth, isMax) {
  const win = checkWinOnBoard(b);
  if (win === 'X') return { score: -10 + depth };
  if (win === 'O') return { score: 10 - depth };
  const empty = b.reduce((a, v, i) => v === null ? [...a, i] : a, []);
  if (!empty.length) return { score: 0 };

  const moves = empty.map(i => {
    const nb = [...b];
    nb[i] = isMax ? 'O' : 'X';
    return { index: i, score: minimax(nb, depth + 1, !isMax).score };
  });

  return moves.reduce((best, m) =>
    isMax ? (m.score > best.score ? m : best) : (m.score < best.score ? m : best)
  );
}

function checkWinOnBoard(b) {
  for (const [a, bi, c] of WINS) {
    if (b[a] && b[a] === b[bi] && b[a] === b[c]) return b[a];
  }
  return null;
}

// ---- ONLINE ----
function setupOnline(params) {
  socket = io();
  const code = params.code;
  const name = decodeURIComponent(params.name || 'Player 1');
  players[myIndex] = name;

  const infoEl = document.getElementById('online-info');
  infoEl.style.display = 'block';
  infoEl.innerHTML = `
    <div class="room-code-display" style="margin-bottom:20px">
      <div class="room-code-label">ROOM CODE</div>
      <div class="room-code-value">${code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${code}').then(()=>window.GameHub.showToast('Copied!'))">Copy Code</button>
    </div>
    <p style="text-align:center;color:var(--text-secondary);margin-bottom:20px">Waiting for opponent…</p>
  `;

  socket.emit('join-room', { code, playerName: name });

  socket.on('room-updated', (room) => {
    if (room.players.filter(p => p.id).length === 2) {
      // Both connected
      if (myIndex === 1) players[0] = room.players[0].name;
      else players[1] = room.players[1]?.name || 'Opponent';
      infoEl.style.display = 'none';
      showGame();
      resetBoard();
    }
  });

  socket.on('opponent-move', ({ move, state }) => {
    board = state.board;
    currentPlayer = state.currentPlayer === myIndex ? myIndex : 1 - myIndex;
    // Replay opponent's move
    const prevBoard = [...board];
    prevBoard[move] = null;
    board[move] = currentPlayer === 0 ? 'X' : 'O'; // just re-render
    board = state.board;
    currentPlayer = state.currentPlayer;
    renderBoard();
    const win = checkWin();
    if (win) {
      highlightWin(win);
      const winner = players[1 - myIndex];
      setTimeout(() => showWinner(winner), 400);
      gameActive = false;
      return;
    }
    if (board.every(c => c)) { showWinner(null); gameActive = false; return; }
    updateTurnLabel();
    updateScoreLabel();
  });

  socket.on('player-left', () => {
    window.GameHub.showToast('Opponent left the game');
    gameActive = false;
  });
}

// ---- INFO ----
function showInfo() { document.getElementById('info-panel').style.display = 'flex'; }
function hideInfo() { document.getElementById('info-panel').style.display = 'none'; }
