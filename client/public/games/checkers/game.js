// CHECKERS — Full logic with AI (minimax depth 4)
// Board: 8x8, indices 0-63. Red=1, Black=2. King=10,20.
let board, selected, possibleMoves, currentPlayer, players, scores, mode, gameActive, socket, roomCode, myColor;

const RED=1, BLACK=2, RED_K=10, BLACK_K=20;

function initBoard() {
  const b = Array(64).fill(0);
  for (let r=0;r<3;r++) for (let c=0;c<8;c++) if ((r+c)%2===1) b[r*8+c]=BLACK;
  for (let r=5;r<8;r++) for (let c=0;c<8;c++) if ((r+c)%2===1) b[r*8+c]=RED;
  return b;
}

document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub.getQueryParams();
  mode = params.mode || 'local';
  roomCode = params.code;

  if (mode === 'vs-computer') {
    myColor = RED;
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row"><span class="player-label" style="color:#ff6b6b">🔴 Red</span>
      <input class="player-name-input" id="p1-name" value="You" maxlength="16"/></div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:8px">You play Red. Computer plays Black.</p>`;
  } else if (mode === 'online') {
    myColor = params.host === '1' ? RED : BLACK;
    setupOnline(params); return;
  } else {
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row"><span class="player-label" style="color:#ff6b6b">🔴 Red</span>
      <input class="player-name-input" id="p1-name" value="Red" maxlength="16"/></div>
      <div class="player-input-row"><span class="player-label" style="color:#aaa">⚫ Black</span>
      <input class="player-name-input" id="p2-name" value="Black" maxlength="16"/></div>`;
  }
});

function startGame() {
  const p1 = document.getElementById('p1-name')?.value.trim()||'Red';
  const p2 = document.getElementById('p2-name')?.value.trim()||(mode==='vs-computer'?'Computer':'Black');
  players=[p1,p2]; scores=[0,0];
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  newGame();
}

function newGame() {
  board=initBoard(); selected=null; possibleMoves=[]; currentPlayer=RED; gameActive=true;
  document.getElementById('winner-overlay').style.display='none';
  renderBoard(); updateLabels();
}

function renderBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const sq=r*8+c, piece=board[sq];
    const isLight=(r+c)%2===0;
    const isHighlighted = selected===sq;
    const isPossible = possibleMoves.some(m=>m.from===selected&&m.to===sq);
    const div = document.createElement('div');
    div.className=`chk-square ${isLight?'light':'dark'}${isHighlighted?' highlight':''}${isPossible?' possible':''}`;
    div.onclick=()=>handleClick(sq);
    if (piece) {
      const p=document.createElement('div');
      const color = (piece===RED||piece===RED_K)?'red':'black';
      p.className=`chk-piece ${color}${(piece===RED_K||piece===BLACK_K)?' king':''}${selected===sq?' selected':''}`;
      div.appendChild(p);
    }
    el.appendChild(div);
  }
}

function handleClick(sq) {
  if (!gameActive) return;
  if (mode==='vs-computer'&&currentPlayer!==myColor) return;
  if (mode==='online'&&currentPlayer!==myColor) { window.GameHub.showToast("Not your turn"); return; }

  const piece=board[sq];
  const allMoves=getAllMoves(board,currentPlayer);

  // clicking own piece
  if (piece && (currentPlayer===RED?(piece===RED||piece===RED_K):(piece===BLACK||piece===BLACK_K))) {
    selected=sq;
    possibleMoves=allMoves.filter(m=>m.from===sq);
    renderBoard(); return;
  }

  // clicking destination
  if (selected!==null) {
    const move=possibleMoves.find(m=>m.from===selected&&m.to===sq);
    if (move) { executeMove(move); return; }
  }
  selected=null; possibleMoves=[]; renderBoard();
}

function executeMove(move) {
  board=applyMove(board,move);
  selected=null; possibleMoves=[];

  // Check multi-jump
  if (move.captured!==undefined) {
    const furtherJumps=getJumps(board,move.to,currentPlayer);
    if (furtherJumps.length>0) {
      selected=move.to; possibleMoves=furtherJumps;
      renderBoard(); return;
    }
  }

  if (mode==='online'&&socket) socket.emit('game-move',{code:roomCode,move,state:{board,currentPlayer}});

  currentPlayer = currentPlayer===RED?BLACK:RED;
  const opponentMoves=getAllMoves(board,currentPlayer);
  if (!opponentMoves.length) { endGame(); return; }

  updateLabels(); renderBoard();
  if (mode==='vs-computer'&&currentPlayer===BLACK&&gameActive) setTimeout(aiMove,600);
}

function applyMove(b, move) {
  const nb=[...b];
  const piece=nb[move.from];
  nb[move.to]=piece; nb[move.from]=0;
  if (move.cap) nb[move.cap]=0;
  // King promotion
  const toRow=Math.floor(move.to/8);
  if (nb[move.to]===RED&&toRow===0) nb[move.to]=RED_K;
  if (nb[move.to]===BLACK&&toRow===7) nb[move.to]=BLACK_K;
  return nb;
}

function getAllMoves(b, color) {
  const jumps=[];
  const steps=[];
  for (let i=0;i<64;i++) {
    const p=b[i];
    if (!p) continue;
    if (color===RED&&p!==RED&&p!==RED_K) continue;
    if (color===BLACK&&p!==BLACK&&p!==BLACK_K) continue;
    jumps.push(...getJumps(b,i,color));
    steps.push(...getSteps(b,i,color));
  }
  return jumps.length?jumps:steps;
}

function getJumps(b, from, color) {
  const p=b[from]; const moves=[];
  const r=Math.floor(from/8), c=from%8;
  const dirs=[];
  if (p===RED||p===RED_K||p===BLACK_K) dirs.push([-1,-1],[-1,1]); // up
  if (p===BLACK||p===BLACK_K||p===RED_K) dirs.push([1,-1],[1,1]); // down
  for (const [dr,dc] of dirs) {
    const mr=r+dr, mc=c+dc, jr=r+2*dr, jc=c+2*dc;
    if (mr<0||mr>7||mc<0||mc>7||jr<0||jr>7||jc<0||jc>7) continue;
    const mid=mr*8+mc, dest=jr*8+jc;
    const midPiece=b[mid];
    if (!midPiece||!b[dest]===false) continue;
    const isOpp=(color===RED&&(midPiece===BLACK||midPiece===BLACK_K))||
                (color===BLACK&&(midPiece===RED||midPiece===RED_K));
    if (isOpp&&b[dest]===0) moves.push({from,to:dest,cap:mid,captured:midPiece});
  }
  return moves;
}

function getSteps(b, from, color) {
  const p=b[from]; const moves=[];
  const r=Math.floor(from/8), c=from%8;
  const dirs=[];
  if (p===RED||p===RED_K||p===BLACK_K) dirs.push([-1,-1],[-1,1]);
  if (p===BLACK||p===BLACK_K||p===RED_K) dirs.push([1,-1],[1,1]);
  for (const [dr,dc] of dirs) {
    const nr=r+dr, nc=c+dc;
    if (nr<0||nr>7||nc<0||nc>7) continue;
    const dest=nr*8+nc;
    if (b[dest]===0) moves.push({from,to:dest});
  }
  return moves;
}

function endGame() {
  gameActive=false;
  const winner=currentPlayer===RED?players[1]:players[0];
  scores[currentPlayer===RED?1:0]++;
  document.getElementById('winner-title').textContent=`${winner} Wins! 👑`;
  document.getElementById('winner-overlay').style.display='flex';
}

function updateLabels() {
  const name=currentPlayer===RED?players[0]:players[1];
  const color=currentPlayer===RED?'🔴':'⚫';
  document.getElementById('turn-label').textContent=`${color} ${name}'s Turn`;
  document.getElementById('score-label').textContent=`${players[0]} ${scores[0]} — ${players[1]} ${scores[1]}`;
}

// AI minimax depth 4
function aiMove() {
  if (!gameActive) return;
  const result=minimaxC(board,4,-Infinity,Infinity,true);
  if (result.move) executeMove(result.move);
}

function minimaxC(b, depth, alpha, beta, isMax) {
  const color=isMax?BLACK:RED;
  const moves=getAllMoves(b,color);
  if (!moves.length||depth===0) return {score:evalBoard(b)};
  let best=isMax?{score:-Infinity}:{score:Infinity};
  for (const m of moves) {
    const nb=applyMove(b,m);
    const {score}=minimaxC(nb,depth-1,alpha,beta,!isMax);
    if (isMax&&score>best.score) {best={score,move:m}; alpha=Math.max(alpha,score);}
    if (!isMax&&score<best.score) {best={score,move:m}; beta=Math.min(beta,score);}
    if (beta<=alpha) break;
  }
  return best;
}

function evalBoard(b) {
  let score=0;
  for (let i=0;i<64;i++) {
    const p=b[i];
    if (p===BLACK) score+=5;
    else if (p===BLACK_K) score+=8;
    else if (p===RED) score-=5;
    else if (p===RED_K) score-=8;
  }
  return score;
}

function setupOnline(params) {
  socket=io();
  const name=decodeURIComponent(params.name||'Player');
  players=['','']; players[myColor===RED?0:1]=name;
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  document.getElementById('online-info').innerHTML=`
    <div class="room-code-display" style="margin-bottom:20px">
      <div class="room-code-label">ROOM CODE</div>
      <div class="room-code-value">${params.code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${params.code}').then(()=>window.GameHub.showToast('Copied!'))">Copy</button>
    </div><p style="text-align:center;color:var(--text-secondary)">Waiting for opponent…</p>`;
  socket.emit('join-room',{code:params.code,playerName:name});
  socket.on('room-updated',room=>{
    if(room.players.filter(p=>p.id).length>=2){
      const opp=room.players.find(p=>p.name!==name);
      if(opp) players[myColor===RED?1:0]=opp.name;
      document.getElementById('online-info').style.display='none';
      scores=[0,0]; newGame();
    }
  });
  socket.on('opponent-move',({state})=>{board=state.board;currentPlayer=state.currentPlayer;renderBoard();updateLabels();});
  socket.on('player-left',()=>window.GameHub.showToast('Opponent left'));
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
