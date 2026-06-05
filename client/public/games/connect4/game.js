// CONNECT 4 — Game Logic with AI (minimax)
const ROWS = 6, COLS = 7;
let board, currentPlayer, players, scores, mode, gameActive, socket, roomCode, myIndex;

document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub.getQueryParams();
  mode = params.mode || 'local';
  roomCode = params.code;
  myIndex = 0;

  if (mode === 'vs-computer') {
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row"><span class="player-label" style="color:#ff6b6b">🔴</span>
      <input class="player-name-input" id="p1-name" value="You" maxlength="16"/></div>`;
    players = ['You', 'Computer']; scores = [0,0];
  } else if (mode === 'online') {
    myIndex = params.host === '1' ? 0 : 1;
    setupOnline(params); return;
  } else {
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row"><span class="player-label" style="color:#ff6b6b">🔴 P1</span>
      <input class="player-name-input" id="p1-name" value="Player 1" maxlength="16"/></div>
      <div class="player-input-row"><span class="player-label" style="color:#ffd700">🟡 P2</span>
      <input class="player-name-input" id="p2-name" value="Player 2" maxlength="16"/></div>`;
  }
});

function startGame() {
  const p1 = document.getElementById('p1-name')?.value.trim() || 'Player 1';
  const p2 = document.getElementById('p2-name')?.value.trim() || (mode==='vs-computer'?'Computer':'Player 2');
  players = [p1, p2]; scores = [0, 0];
  showGame(); resetGame();
}

function showGame() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
}

function resetGame() {
  board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  currentPlayer = 0; gameActive = true;
  document.getElementById('winner-overlay').style.display = 'none';
  renderBoard(); renderScores();
}

function renderBoard() {
  const dropRow = document.getElementById('drop-row');
  const boardEl = document.getElementById('board');
  dropRow.innerHTML = Array.from({length: COLS}, (_,c) =>
    `<button class="c4-drop-btn" onclick="dropPiece(${c})">${currentPlayer===0?'🔴':'🟡'}</button>`
  ).join('');
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'c4-cell' + (board[r][c]===1?' p1':board[r][c]===2?' p2':'');
      cell.id = `cell-${r}-${c}`;
      boardEl.appendChild(cell);
    }
  }
}

function renderScores() {
  document.getElementById('score-strip').innerHTML = players.map((p,i) =>
    `<div class="score-chip ${currentPlayer===i?'active':''}">
      ${i===0?'🔴':'🟡'} ${p} <span>${scores[i]}</span>
    </div>`
  ).join('');
}

function dropPiece(col) {
  if (!gameActive) return;
  if (mode === 'online' && currentPlayer !== myIndex) { window.GameHub.showToast("Wait your turn!"); return; }
  const row = getLowestRow(col);
  if (row === -1) return;
  board[row][col] = currentPlayer + 1;
  const cell = document.getElementById(`cell-${row}-${col}`);
  cell.classList.add(currentPlayer===0?'p1':'p2','drop-anim');

  const win = checkWin(row, col);
  if (win) {
    win.forEach(([r,c]) => document.getElementById(`cell-${r}-${c}`).classList.add('win-cell'));
    setTimeout(() => showWinner(players[currentPlayer]), 400);
    scores[currentPlayer]++;
    gameActive = false;
    if (mode==='online'&&socket) socket.emit('game-over', {code:roomCode, winner:players[currentPlayer], state:board});
    return;
  }
  if (board[0].every(v => v !== 0)) {
    setTimeout(() => showWinner(null), 300);
    gameActive = false; return;
  }
  currentPlayer = 1 - currentPlayer;
  renderBoard(); renderScores();

  if (mode==='online'&&socket) socket.emit('game-move', {code:roomCode, move:col, state:{board, currentPlayer, scores}});
  if (mode==='vs-computer'&&currentPlayer===1&&gameActive) setTimeout(aiDrop, 600);
}

function getLowestRow(col) {
  for (let r = ROWS-1; r >= 0; r--) if (board[r][col]===0) return r;
  return -1;
}

function checkWin(row, col) {
  const p = board[row][col];
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    const cells = [[row,col]];
    for (let s of [-1,1]) {
      let r=row+dr*s, c=col+dc*s;
      while (r>=0&&r<ROWS&&c>=0&&c<COLS&&board[r][c]===p) { cells.push([r,c]); r+=dr*s; c+=dc*s; }
    }
    if (cells.length>=4) return cells;
  }
  return null;
}

function showWinner(name) {
  document.getElementById('winner-title').textContent = name ? `${name} Wins! 🎉` : "It's a Draw!";
  document.getElementById('winner-trophy').textContent = name ? (currentPlayer===0?'🔴':'🟡') : '🤝';
  document.getElementById('winner-overlay').style.display = 'flex';
}

// AI — minimax depth 5
function aiDrop() {
  if (!gameActive) return;
  let best = -Infinity, col = 0;
  for (let c = 0; c < COLS; c++) {
    if (getLowestRow(c) === -1) continue;
    const nb = board.map(r=>[...r]);
    const r = getLowestRowOn(nb, c); nb[r][c] = 2;
    const score = minimaxC4(nb, 4, -Infinity, Infinity, false);
    if (score > best) { best = score; col = c; }
  }
  dropPiece(col);
}

function minimaxC4(b, depth, alpha, beta, isMax) {
  const winner = checkWinBoard(b);
  if (winner===2) return 1000+depth;
  if (winner===1) return -(1000+depth);
  if (b[0].every(v=>v!==0)||depth===0) return scoreBoard(b);
  if (isMax) {
    let best=-Infinity;
    for(let c=0;c<COLS;c++){
      const r=getLowestRowOn(b,c); if(r===-1)continue;
      const nb=b.map(row=>[...row]); nb[r][c]=2;
      best=Math.max(best,minimaxC4(nb,depth-1,alpha,beta,false));
      alpha=Math.max(alpha,best); if(beta<=alpha)break;
    }
    return best;
  } else {
    let best=Infinity;
    for(let c=0;c<COLS;c++){
      const r=getLowestRowOn(b,c); if(r===-1)continue;
      const nb=b.map(row=>[...row]); nb[r][c]=1;
      best=Math.min(best,minimaxC4(nb,depth-1,alpha,beta,true));
      beta=Math.min(beta,best); if(beta<=alpha)break;
    }
    return best;
  }
}

function getLowestRowOn(b, col) {
  for(let r=ROWS-1;r>=0;r--) if(b[r][col]===0) return r;
  return -1;
}

function checkWinBoard(b) {
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if(!b[r][c]) continue;
    const p=b[r][c];
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(const [dr,dc] of dirs) {
      let cnt=1,nr=r+dr,nc=c+dc;
      while(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&b[nr][nc]===p){cnt++;nr+=dr;nc+=dc;}
      if(cnt>=4) return p;
    }
  }
  return 0;
}

function scoreBoard(b) {
  let score=0;
  const center=Math.floor(COLS/2);
  for(let r=0;r<ROWS;r++) if(b[r][center]===2) score+=3;
  return score;
}

function setupOnline(params) {
  socket = io();
  const name = decodeURIComponent(params.name||'Player');
  players = ['',''];
  players[myIndex] = name;

  showGame();
  document.getElementById('online-info').innerHTML = `
    <div class="room-code-display" style="margin-bottom:20px">
      <div class="room-code-label">ROOM CODE</div>
      <div class="room-code-value">${params.code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${params.code}').then(()=>window.GameHub.showToast('Copied!'))">Copy</button>
    </div>
    <p style="text-align:center;color:var(--text-secondary)">Waiting for opponent…</p>
  `;

  socket.emit('join-room', {code:params.code, playerName:name});
  socket.on('room-updated', room => {
    if(room.players.filter(p=>p.id).length>=2){
      const opp=room.players.find(p=>p.name!==name);
      if(opp) players[myIndex===0?1:0]=opp.name;
      document.getElementById('online-info').style.display='none';
      scores=[0,0]; resetGame();
    }
  });
  socket.on('opponent-move', ({move, state}) => {
    board=state.board; currentPlayer=state.currentPlayer;
    renderBoard(); renderScores();
    const row=getLowestRowOn(board,move)+1;
    const cell=document.getElementById(`cell-${row<ROWS?row:ROWS-1}-${move}`);
    if(cell) { cell.classList.add(myIndex===0?'p2':'p1'); }
  });
  socket.on('game-over', ({winner}) => { scores[myIndex===0?1:0]++; showWinner(winner); });
  socket.on('player-left', () => window.GameHub.showToast('Opponent left'));
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
