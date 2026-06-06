// Chess AI Web Worker — runs off main thread, zero UI freezing

const PIECE_VALUES = { K:20000, Q:900, R:500, B:330, N:320, P:100 };
const PST = {
  P:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  N:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  Q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

function copyState(s) {
  return {
    board: s.board.slice(),
    turn: s.turn,
    castling: {...s.castling},
    enPassant: s.enPassant,
    captures: { w: s.captures.w.slice(), b: s.captures.b.slice() }
  };
}

function applyMove(state, move) {
  const s = copyState(state);
  const {from, to, type, promotion} = move;
  const piece = s.board[from];
  const color = piece[0], ptype = piece[1];
  if (s.board[to]) s.captures[color].push(s.board[to][1]);
  if (type === 'enpassant') { s.board[to+(color==='w'?8:-8)] = null; s.captures[color].push('P'); }
  s.board[to] = promotion ? color+promotion : piece;
  s.board[from] = null;
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

function getPseudoMoves(state, sq) {
  const piece=state.board[sq]; if(!piece) return [];
  const [color,type]=[piece[0],piece[1]], opp=color==='w'?'b':'w';
  const r=Math.floor(sq/8), f=sq%8, moves=[];
  const slide=(dr,df)=>{let nr=r+dr,nf=f+df;while(nr>=0&&nr<8&&nf>=0&&nf<8){const t=nr*8+nf;if(state.board[t]){if(state.board[t][0]===opp)moves.push({from:sq,to:t});break;}moves.push({from:sq,to:t});nr+=dr;nf+=df;}};
  const step=(dr,df)=>{const nr=r+dr,nf=f+df;if(nr<0||nr>7||nf<0||nf>7)return;const t=nr*8+nf;if(!state.board[t]||state.board[t][0]===opp)moves.push({from:sq,to:t});};
  if(type==='P'){
    const dir=color==='w'?-1:1,start=color==='w'?6:1,prom=color==='w'?0:7;
    const fwd=(r+dir)*8+f;
    if(r+dir>=0&&r+dir<8&&!state.board[fwd]){
      if(r+dir===prom){for(const p of['Q','R','B','N'])moves.push({from:sq,to:fwd,promotion:p});}
      else{moves.push({from:sq,to:fwd});if(r===start&&!state.board[(r+dir*2)*8+f])moves.push({from:sq,to:(r+dir*2)*8+f});}
    }
    for(const df of[-1,1]){if(f+df<0||f+df>7)continue;const cap=(r+dir)*8+(f+df);if(state.board[cap]&&state.board[cap][0]===opp){if(r+dir===prom){for(const p of['Q','R','B','N'])moves.push({from:sq,to:cap,promotion:p});}else moves.push({from:sq,to:cap});}if(state.enPassant===cap)moves.push({from:sq,to:cap,type:'enpassant'});}
  }
  else if(type==='N'){for(const[dr,df]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])step(dr,df);}
  else if(type==='B'){for(const[dr,df]of[[-1,-1],[-1,1],[1,-1],[1,1]])slide(dr,df);}
  else if(type==='R'){for(const[dr,df]of[[-1,0],[1,0],[0,-1],[0,1]])slide(dr,df);}
  else if(type==='Q'){for(const[dr,df]of[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])slide(dr,df);}
  else if(type==='K'){
    for(const[dr,df]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])step(dr,df);
    const row=color==='w'?7:0,ks=row*8+4;
    if(sq===ks&&state.castling[color+'K']){
      if(state.castling[color+'KR']&&!state.board[ks+1]&&!state.board[ks+2])moves.push({from:sq,to:ks+2,type:'castle-k'});
      if(state.castling[color+'QR']&&!state.board[ks-1]&&!state.board[ks-2]&&!state.board[ks-3])moves.push({from:sq,to:ks-2,type:'castle-q'});
    }
  }
  return moves;
}

function isInCheck(state, color) {
  const kp=state.board.indexOf(color+'K'); if(kp===-1) return true;
  const opp=color==='w'?'b':'w';
  for(let i=0;i<64;i++) if(state.board[i]&&state.board[i][0]===opp&&getPseudoMoves(state,i).some(m=>m.to===kp)) return true;
  return false;
}

function getLegalMoves(state, sq) {
  const color=state.board[sq][0];
  return getPseudoMoves(state,sq).filter(m=>!isInCheck(applyMove(state,m),color));
}

function getAllLegalMoves(state, color) {
  const moves=[];
  for(let i=0;i<64;i++) if(state.board[i]&&state.board[i][0]===color) moves.push(...getLegalMoves(state,i));
  return moves;
}

function orderMoves(moves, state) {
  return moves.sort((a,b)=>{
    const va=state.board[a.to]?(PIECE_VALUES[state.board[a.to][1]]||0):0;
    const vb=state.board[b.to]?(PIECE_VALUES[state.board[b.to][1]]||0):0;
    return vb-va;
  });
}

function evaluate(state) {
  let score=0;
  for(let i=0;i<64;i++){
    const p=state.board[i]; if(!p) continue;
    const[color,type]=[p[0],p[1]];
    const val=PIECE_VALUES[type]||0;
    const pstIdx=color==='w'?63-i:i;
    const pst=PST[type]?PST[type][pstIdx]:0;
    score+=color==='b'?(val+pst):-(val+pst);
  }
  return score;
}

function minimax(state, depth, alpha, beta, isMax) {
  if(depth===0) return evaluate(state);
  const color=isMax?'b':'w';
  const moves=orderMoves(getAllLegalMoves(state,color),state);
  if(!moves.length) return isInCheck(state,color)?(isMax?-50000:50000):0;
  if(isMax){
    let best=-Infinity;
    for(const m of moves){best=Math.max(best,minimax(applyMove(state,m),depth-1,alpha,beta,false));alpha=Math.max(alpha,best);if(beta<=alpha)break;}
    return best;
  }else{
    let best=Infinity;
    for(const m of moves){best=Math.min(best,minimax(applyMove(state,m),depth-1,alpha,beta,true));beta=Math.min(beta,best);if(beta<=alpha)break;}
    return best;
  }
}

// Listen for messages from main thread
self.onmessage = function(e) {
  const { state, depth } = e.data;
  const moves = orderMoves(getAllLegalMoves(state, 'b'), state);
  if (!moves.length) { self.postMessage({ move: null }); return; }

  let best=null, bestScore=-Infinity;
  for (const move of moves) {
    if (move.promotion) move.promotion='Q';
    const score = minimax(applyMove(state, move), depth-1, -Infinity, Infinity, false);
    if (score > bestScore) { bestScore=score; best=move; }
  }
  self.postMessage({ move: best });
};