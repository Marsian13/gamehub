// CHESS — Fixed AI (no page freeze), correct piece colors, turn indicator
// AI: Minimax + Alpha-Beta depth 2 with move ordering (fast & responsive)

const W_PIECES = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙' };
const B_PIECES = { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟' };
function getPieceChar(p) { return p ? (p[0]==='w' ? W_PIECES[p[1]] : B_PIECES[p[1]]) : ''; }

const PIECE_VALUES = { K:20000, Q:900, R:500, B:330, N:320, P:100 };
const PST = {
  P:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  N:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  Q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

let gameState, players, mode, myColor, socket, roomCode, aiThinking;

// ---- Fast board copy (no JSON.parse/stringify) ----
function copyState(s) {
  return {
    board: s.board.slice(),
    turn: s.turn,
    selected: null,
    possibleMoves: [],
    moveHistory: s.moveHistory.slice(),
    boardHistory: [], // not needed in search
    castling: {...s.castling},
    enPassant: s.enPassant,
    status: s.status,
    captures: { w: s.captures.w.slice(), b: s.captures.b.slice() },
    lastMove: s.lastMove
  };
}

function initBoard() {
  const b = Array(64).fill(null);
  const order = ['R','N','B','Q','K','B','N','R'];
  for (let i=0;i<8;i++) {
    b[i]='b'+order[i]; b[56+i]='w'+order[i];
    b[8+i]='bP'; b[48+i]='wP';
  }
  return b;
}

document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub ? window.GameHub.getQueryParams() : {};
  mode = params.mode || 'vs-computer';
  roomCode = params.code;

  if (mode === 'vs-computer') {
    myColor = 'w';
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row">
        <span class="player-label" style="color:#ddd">♔ You (White)</span>
        <input class="player-name-input" id="p1-name" value="You" maxlength="16"/>
      </div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:8px;text-align:center">Computer plays Black</p>`;
  } else if (mode === 'online') {
    myColor = params.host === '1' ? 'w' : 'b';
    setupOnline(params); return;
  } else {
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row">
        <span class="player-label" style="color:#ddd">♔ White</span>
        <input class="player-name-input" id="p1-name" value="White" maxlength="16"/>
      </div>
      <div class="player-input-row">
        <span class="player-label" style="color:#888">♚ Black</span>
        <input class="player-name-input" id="p2-name" value="Black" maxlength="16"/>
      </div>`;
  }
});

function startGame() {
  const p1 = document.getElementById('p1-name')?.value.trim() || 'White';
  const p2 = document.getElementById('p2-name')?.value.trim() || (mode==='vs-computer'?'Computer':'Black');
  players = [p1, p2];
  document.getElementById('white-name').textContent = '♔ ' + p1;
  document.getElementById('black-name').textContent = '♚ ' + p2;
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  newGame();
}

function newGame() {
  gameState = {
    board: initBoard(), turn: 'w',
    selected: null, possibleMoves: [],
    moveHistory: [], boardHistory: [],
    castling: {wK:true,wQR:true,wKR:true,bK:true,bQR:true,bKR:true},
    enPassant: null, status: 'playing',
    captures: {w:[],b:[]}, lastMove: null
  };
  aiThinking = false;
  document.getElementById('move-history').innerHTML = '';
  document.getElementById('winner-overlay').style.display = 'none';
  document.getElementById('status-msg').textContent = '';
  renderBoard();
  updateTurnBar();
}

function resetGame() { newGame(); }

// ---- RENDER ----
function renderBoard() {
  const el = document.getElementById('chess-board');
  let html = '';
  for (let rank=0; rank<8; rank++) {
    for (let file=0; file<8; file++) {
      const sq = rank*8+file;
      const piece = gameState.board[sq];
      const isLight = (rank+file)%2===0;
      const sel = gameState.selected===sq;
      const isPoss = gameState.possibleMoves.some(m=>m.to===sq);
      const isCap = isPoss && piece && piece[0]!==gameState.turn;
      const isLF = gameState.lastMove && gameState.lastMove.from===sq;
      const isLT = gameState.lastMove && gameState.lastMove.to===sq;
      const inChk = gameState.status==='check' && piece && piece[1]==='K' && piece[0]===gameState.turn;

      let cls = `chess-square ${isLight?'light':'dark'}`;
      if (sel) cls += ' selected';
      else { if (isLF) cls += ' last-move-from'; if (isLT) cls += ' last-move-to'; }
      if (isCap) cls += ' possible-capture';
      else if (isPoss) cls += ' possible-move';
      if (inChk) cls += ' in-check';

      const rankLbl = file===7 ? `<span class="coord-label coord-rank">${8-rank}</span>` : '';
      const fileLbl = rank===7 ? `<span class="coord-label coord-file">${String.fromCharCode(97+file)}</span>` : '';
      const pcHtml = piece ? `<span class="chess-piece piece-${piece[0]}">${getPieceChar(piece)}</span>` : '';

      html += `<div class="${cls}" onclick="handleSquareClick(${sq})">${pcHtml}${rankLbl}${fileLbl}</div>`;
    }
  }
  el.innerHTML = html;
  document.getElementById('white-captures').textContent = gameState.captures.b.map(p=>B_PIECES[p]||'').join('');
  document.getElementById('black-captures').textContent = gameState.captures.w.map(p=>W_PIECES[p]||'').join('');
  document.getElementById('white-info').className = 'player-info'+(gameState.turn==='w'?' active-player':'');
  document.getElementById('black-info').className = 'player-info'+(gameState.turn==='b'?' active-player':'');
}

function updateTurnBar() {
  const dot = document.getElementById('turn-dot');
  const text = document.getElementById('turn-text');
  const bar = document.getElementById('turn-bar');
  if (!dot||!text) return;
  const isW = gameState.turn==='w';
  dot.style.cssText = isW
    ? 'background:#fff;border:2px solid #888'
    : 'background:#222;border:2px solid rgba(255,255,255,0.5)';
  const name = players ? (isW?players[0]:players[1]) : (isW?'White':'Black');
  const chk = gameState.status==='check' ? ' ⚠ CHECK!' : '';
  if (aiThinking) { text.textContent = 'Computer is thinking…'; bar.style.color='var(--text-secondary)'; bar.style.borderColor='var(--border)'; return; }
  text.textContent = `${name}'s Turn${chk}`;
  bar.style.color = chk ? '#ff4444' : 'var(--accent)';
  bar.style.borderColor = chk ? '#ff4444' : 'var(--accent)';
}

// ---- INTERACTION ----
function handleSquareClick(sq) {
  if (gameState.status==='checkmate'||gameState.status==='draw') return;
  if (aiThinking) return;
  if (mode==='vs-computer'&&gameState.turn!==myColor) return;
  if (mode==='online'&&gameState.turn!==myColor) { window.GameHub?.showToast("Not your turn"); return; }

  const piece = gameState.board[sq];
  if (gameState.selected===sq) { gameState.selected=null; gameState.possibleMoves=[]; renderBoard(); return; }

  if (gameState.selected!==null) {
    const move = gameState.possibleMoves.find(m=>m.to===sq);
    if (move) {
      // Check pawn promotion
      if (gameState.board[gameState.selected]?.[1]==='P') {
        const tr=Math.floor(sq/8);
        if ((gameState.turn==='w'&&tr===0)||(gameState.turn==='b'&&tr===7)) {
          if (!move.promotion) { showPromotionModal(move); return; }
        }
      }
      executeMove(move); return;
    }
  }
  if (piece&&piece[0]===gameState.turn) {
    gameState.selected=sq;
    gameState.possibleMoves=getLegalMoves(gameState,sq);
    renderBoard();
  }
}

function showPromotionModal(move) {
  const modal=document.getElementById('promotion-modal');
  const pieces=['Q','R','B','N'];
  const ps=gameState.turn==='w'?W_PIECES:B_PIECES;
  modal.innerHTML=pieces.map(p=>`<div class="promo-piece piece-${gameState.turn}" onclick="selectPromotion('${p}',${JSON.stringify(move).replace(/"/g,"'")})">${ps[p]}</div>`).join('');
  modal.style.display='flex';
}
function selectPromotion(p,move) { document.getElementById('promotion-modal').style.display='none'; move.promotion=p; executeMove(move); }

function executeMove(move) {
  gameState.boardHistory.push(copyState(gameState));
  const ns = applyMove(gameState, move);
  Object.assign(gameState, ns);
  gameState.selected=null; gameState.possibleMoves=[];
  addMoveToHistory(move);
  checkGameStatus();
  renderBoard();
  updateTurnBar();
  if (mode==='online'&&socket) socket.emit('game-move',{code:roomCode,move,state:gameState});
  if (mode==='vs-computer'&&gameState.turn==='b'&&gameState.status==='playing') {
    aiThinking=true;
    updateTurnBar();
    // Use setTimeout to let browser render first, then run AI
    setTimeout(doAiMove, 50);
  }
}

// ---- MOVE APPLICATION (fast, no JSON) ----
function applyMove(state, move) {
  const s = copyState(state);
  const {from,to,type,promotion} = move;
  const piece = s.board[from];
  const color = piece[0], ptype = piece[1];

  if (s.board[to]) s.captures[color].push(s.board[to][1]);
  if (type==='enpassant') { const ep=to+(color==='w'?8:-8); s.captures[color].push('P'); s.board[ep]=null; }

  s.board[to] = promotion ? color+promotion : piece;
  s.board[from] = null;
  s.lastMove = {from,to};

  if (type==='castle-k') { s.board[to-1]=color+'R'; s.board[to+1]=null; }
  if (type==='castle-q') { s.board[to+1]=color+'R'; s.board[to-4]=null; }

  if (ptype==='K') { s.castling[color+'K']=false; s.castling[color+'QR']=false; s.castling[color+'KR']=false; }
  if (ptype==='R') {
    if (from===(color==='w'?63:7)) s.castling[color+'KR']=false;
    if (from===(color==='w'?56:0)) s.castling[color+'QR']=false;
  }
  s.enPassant = (ptype==='P'&&Math.abs(from-to)===16) ? (from+to)/2 : null;
  s.turn = color==='w'?'b':'w';
  return s;
}

// ---- MOVE GENERATION ----
function getLegalMoves(state, sq) {
  const pseudo = getPseudoMoves(state, sq);
  const color = state.board[sq][0];
  return pseudo.filter(m => {
    const ns = applyMove(state, m);
    return !isInCheck(ns, color);
  });
}

function getAllLegalMoves(state, color) {
  const moves = [];
  for (let i=0;i<64;i++) {
    if (state.board[i]&&state.board[i][0]===color) {
      moves.push(...getLegalMoves(state,i));
    }
  }
  return moves;
}

function isInCheck(state, color) {
  const kp = state.board.indexOf(color+'K');
  if (kp===-1) return true;
  const opp = color==='w'?'b':'w';
  for (let i=0;i<64;i++) {
    if (state.board[i]&&state.board[i][0]===opp) {
      if (getPseudoMoves(state,i).some(m=>m.to===kp)) return true;
    }
  }
  return false;
}

function isSquareAttacked(state,sq,byColor) {
  for (let i=0;i<64;i++) {
    if (state.board[i]&&state.board[i][0]===byColor&&getPseudoMoves(state,i).some(m=>m.to===sq)) return true;
  }
  return false;
}

function getPseudoMoves(state, sq) {
  const piece=state.board[sq]; if (!piece) return [];
  const [color,type]=[piece[0],piece[1]], opp=color==='w'?'b':'w';
  const r=Math.floor(sq/8), f=sq%8, moves=[];

  const slide=(dr,df)=>{
    let nr=r+dr,nf=f+df;
    while(nr>=0&&nr<8&&nf>=0&&nf<8){
      const t=nr*8+nf;
      if(state.board[t]){if(state.board[t][0]===opp)moves.push({from:sq,to:t});break;}
      moves.push({from:sq,to:t}); nr+=dr; nf+=df;
    }
  };
  const step=(dr,df)=>{
    const nr=r+dr,nf=f+df;
    if(nr<0||nr>7||nf<0||nf>7)return;
    const t=nr*8+nf;
    if(!state.board[t]||state.board[t][0]===opp)moves.push({from:sq,to:t});
  };

  if(type==='P'){
    const dir=color==='w'?-1:1,start=color==='w'?6:1,prom=color==='w'?0:7;
    const fwd=(r+dir)*8+f;
    if(r+dir>=0&&r+dir<8&&!state.board[fwd]){
      if(r+dir===prom){for(const p of['Q','R','B','N'])moves.push({from:sq,to:fwd,promotion:p});}
      else{moves.push({from:sq,to:fwd});if(r===start&&!state.board[(r+dir*2)*8+f])moves.push({from:sq,to:(r+dir*2)*8+f});}
    }
    for(const df of[-1,1]){
      if(f+df<0||f+df>7)continue;
      const cap=(r+dir)*8+(f+df);
      if(state.board[cap]&&state.board[cap][0]===opp){
        if(r+dir===prom){for(const p of['Q','R','B','N'])moves.push({from:sq,to:cap,promotion:p});}
        else moves.push({from:sq,to:cap});
      }
      if(state.enPassant===cap)moves.push({from:sq,to:cap,type:'enpassant'});
    }
  }
  else if(type==='N'){for(const[dr,df]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])step(dr,df);}
  else if(type==='B'){for(const[dr,df]of[[-1,-1],[-1,1],[1,-1],[1,1]])slide(dr,df);}
  else if(type==='R'){for(const[dr,df]of[[-1,0],[1,0],[0,-1],[0,1]])slide(dr,df);}
  else if(type==='Q'){for(const[dr,df]of[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])slide(dr,df);}
  else if(type==='K'){
    for(const[dr,df]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])step(dr,df);
    const row=color==='w'?7:0,ks=row*8+4;
    if(sq===ks&&state.castling[color+'K']){
      if(state.castling[color+'KR']&&!state.board[ks+1]&&!state.board[ks+2]&&
         !isSquareAttacked(state,ks,opp)&&!isSquareAttacked(state,ks+1,opp)&&!isSquareAttacked(state,ks+2,opp))
        moves.push({from:sq,to:ks+2,type:'castle-k'});
      if(state.castling[color+'QR']&&!state.board[ks-1]&&!state.board[ks-2]&&!state.board[ks-3]&&
         !isSquareAttacked(state,ks,opp)&&!isSquareAttacked(state,ks-1,opp)&&!isSquareAttacked(state,ks-2,opp))
        moves.push({from:sq,to:ks-2,type:'castle-q'});
    }
  }
  return moves;
}

// ---- GAME STATUS ----
function checkGameStatus() {
  const lm=getAllLegalMoves(gameState,gameState.turn);
  const inChk=isInCheck(gameState,gameState.turn);
  if(!lm.length){
    if(inChk){gameState.status='checkmate';const w=gameState.turn==='w'?(players?players[1]:'Black'):(players?players[0]:'White');setTimeout(()=>showWinner(`${w} wins by Checkmate!`),300);}
    else{gameState.status='draw';setTimeout(()=>showWinner(null,'Stalemate — Draw!'),300);}
  }else if(inChk){gameState.status='check';}
  else{gameState.status='playing';}
}

function showWinner(msg,sub){
  document.getElementById('winner-trophy').textContent=msg?'♛':'🤝';
  document.getElementById('winner-title').textContent=msg||sub||'Game Over';
  document.getElementById('winner-sub').textContent='';
  document.getElementById('winner-overlay').style.display='flex';
}

// ---- MOVE HISTORY ----
function addMoveToHistory(move){
  const files='abcdefgh',ranks='87654321';
  const piece=gameState.board[move.to];
  const ptype=piece?piece[1]:'';
  const pfx=ptype&&ptype!=='P'?ptype:'';
  const notation=pfx+files[move.to%8]+ranks[Math.floor(move.to/8)]+(move.promotion?'='+move.promotion:'');
  gameState.moveHistory.push(notation);
  const histEl=document.getElementById('move-history');
  const total=gameState.moveHistory.length;
  if(total%2===1){
    const row=document.createElement('div');row.className='move-row';row.id=`mr-${total}`;
    row.innerHTML=`<span class="move-num">${Math.ceil(total/2)}.</span><span class="move-white">${notation}</span><span class="move-black" id="mb-${total}"></span>`;
    histEl.appendChild(row);
  }else{const el=document.getElementById(`mb-${total-1}`);if(el)el.textContent=notation;}
  histEl.scrollTop=histEl.scrollHeight;
}

// ---- UNDO ----
function undoMove(){
  if(!gameState.boardHistory.length)return;
  const steps=(mode==='vs-computer'&&gameState.boardHistory.length>=2)?2:1;
  for(let i=0;i<steps;i++){if(gameState.boardHistory.length){const p=gameState.boardHistory.pop();Object.assign(gameState,p);}}
  aiThinking=false;
  gameState.status='playing';gameState.selected=null;gameState.possibleMoves=[];
  document.getElementById('winner-overlay').style.display='none';
  document.getElementById('move-history').innerHTML='';
  gameState.moveHistory=[];
  renderBoard();updateTurnBar();
}

function offerDraw(){if(confirm('Offer a draw?')){showWinner(null,'Draw by Agreement');gameState.status='draw';}}
function resign(){
  if(!confirm('Resign?'))return;
  const w=gameState.turn==='w'?(players?players[1]:'Black'):(players?players[0]:'White');
  showWinner(`${w} wins — opponent resigned`);gameState.status='checkmate';
}

// ---- AI: Minimax + Alpha-Beta, depth 2 (fast, no freeze) ----
// Move ordering: captures first (MVV-LVA), then positional moves
function orderMoves(moves, state) {
  return moves.sort((a,b) => {
    const va = state.board[a.to] ? (PIECE_VALUES[state.board[a.to][1]]||0) : 0;
    const vb = state.board[b.to] ? (PIECE_VALUES[state.board[b.to][1]]||0) : 0;
    return vb - va;
  });
}

let aiWorker = null;

function doAiMove() {
  if (!aiThinking||gameState.status!=='playing'){aiThinking=false;return;}
  // Kill previous worker if still running
  if (aiWorker) { aiWorker.terminate(); aiWorker=null; }
  try {
    aiWorker = new Worker('ai-worker.js');
    aiWorker.onmessage = function(e) {
      aiWorker=null; aiThinking=false;
      if (e.data.move && gameState.status==='playing') executeMove(e.data.move);
      else updateTurnBar();
    };
    aiWorker.onerror = function(err) {
      console.warn('Worker error, falling back:', err);
      aiWorker=null; doAiFallback();
    };
    // Send minimal state (no circular refs)
    aiWorker.postMessage({
      state: {
        board: gameState.board.slice(),
        turn: gameState.turn,
        castling: {...gameState.castling},
        enPassant: gameState.enPassant,
        captures: {w:[],b:[]}
      },
      depth: 3
    });
  } catch(e) {
    // Fallback if workers not supported (e.g. file:// protocol)
    aiWorker=null; doAiFallback();
  }
}

function doAiFallback() {
  // Depth 2 synchronous fallback
  const moves = orderMoves(getAllLegalMoves(gameState,'b'), gameState);
  if (!moves.length){aiThinking=false;return;}
  let best=null, bestScore=-Infinity;
  for (const move of moves) {
    if (move.promotion) move.promotion='Q';
    const score=minimax(applyMove(gameState,move),1,-Infinity,Infinity,false);
    if(score>bestScore){bestScore=score;best=move;}
  }
  aiThinking=false;
  if(best) executeMove(best);
}

function minimax(state,depth,alpha,beta,isMax){
  if(depth===0)return evaluateBoard(state);
  const color=isMax?'b':'w';
  const moves=orderMoves(getAllLegalMoves(state,color),state);
  if(!moves.length){return isInCheck(state,color)?(isMax?-50000:50000):0;}
  if(isMax){
    let best=-Infinity;
    for(const m of moves){
      best=Math.max(best,minimax(applyMove(state,m),depth-1,alpha,beta,false));
      alpha=Math.max(alpha,best);if(beta<=alpha)break;
    }
    return best;
  }else{
    let best=Infinity;
    for(const m of moves){
      best=Math.min(best,minimax(applyMove(state,m),depth-1,alpha,beta,true));
      beta=Math.min(beta,best);if(beta<=alpha)break;
    }
    return best;
  }
}

function evaluateBoard(state){
  let score=0;
  for(let i=0;i<64;i++){
    const p=state.board[i];if(!p)continue;
    const[color,type]=[p[0],p[1]];
    const val=PIECE_VALUES[type]||0;
    const pstIdx=color==='w'?63-i:i;
    const pst=PST[type]?PST[type][pstIdx]:0;
    score+=color==='b'?(val+pst):-(val+pst);
  }
  return score;
}

// ---- ONLINE ----
function setupOnline(params){
  socket=io();
  const name=decodeURIComponent(params.name||'Player');
  players=myColor==='w'?[name,'Opponent']:['Opponent',name];
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  document.getElementById('white-name').textContent='♔ '+players[0];
  document.getElementById('black-name').textContent='♚ '+players[1];
  document.getElementById('online-info').innerHTML=`
    <div class="room-code-display" style="margin-bottom:16px">
      <div class="room-code-label">ROOM CODE</div><div class="room-code-value">${params.code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${params.code}').then(()=>window.GameHub?.showToast('Copied!'))">Copy</button>
    </div><p style="text-align:center;color:var(--text-secondary);margin-bottom:12px">Waiting for opponent…</p>`;
  socket.emit('join-room',{code:params.code,playerName:name});
  socket.on('room-updated',room=>{
    if(room.players.filter(p=>p.id).length>=2){
      const opp=room.players.find(p=>p.name!==name);
      if(opp)players[myColor==='w'?1:0]=opp.name;
      document.getElementById('online-info').style.display='none';
      document.getElementById('white-name').textContent='♔ '+players[0];
      document.getElementById('black-name').textContent='♚ '+players[1];
      newGame();
    }
  });
  socket.on('opponent-move',({state})=>{Object.assign(gameState,state);gameState.selected=null;gameState.possibleMoves=[];renderBoard();updateTurnBar();});
  socket.on('player-left',()=>window.GameHub?.showToast('Opponent disconnected'));
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}