// LUDO — Full canvas-based game
// Supports 2-4 players, local & online

const COLORS = ['#e74c3c','#27ae60','#2980b9','#f39c12'];
const COLOR_NAMES = ['Red','Green','Blue','Yellow'];
const COLOR_LIGHT = ['#ff9999','#99ff99','#99ccff','#ffe699'];

// Board path for each player (absolute cell indices on 15x15 grid)
// Simplified: use a shared 52-cell path + 5 home stretch cells per player
const SAFE_CELLS = [0,8,13,21,26,34,39,47]; // safe squares on main path
const MAIN_PATH_COORDS = buildMainPath();

function buildMainPath() {
  // 52 cells around the board (col,row) on a 15x15 logical grid
  const path = [];
  // Top-left arm going right: row6, col0-5
  for(let c=0;c<=5;c++) path.push([c,6]);
  // Down left side: col6, row0-5
  for(let r=5;r>=0;r--) path.push([6,r]);
  // Right on top: row0, col7-8 then right... wait, let me simplify with known pattern
  // Using standard Ludo coordinates:
  const pts=[
    [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],
    [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
    [7,0],[8,0],
    [8,1],[8,2],[8,3],[8,4],[8,5],[8,6],
    [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
    [14,7],[14,8],
    [13,8],[12,8],[11,8],[10,8],[9,8],[8,8],
    [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
    [7,14],[6,14],
    [6,13],[6,12],[6,11],[6,10],[6,9],[6,8],
    [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    [0,7]
  ];
  return pts;
}

// Player home positions (4 tokens each)
const HOME_POSITIONS = [
  [[1,1],[2,1],[1,2],[2,2]],   // Red top-left
  [[12,1],[13,1],[12,2],[13,2]], // Green top-right
  [[12,12],[13,12],[12,13],[13,13]], // Blue bottom-right
  [[1,12],[2,12],[1,13],[2,13]]  // Yellow bottom-left
];

const PLAYER_START = [0, 13, 26, 39]; // index in MAIN_PATH_COORDS
const HOME_ENTRY = [50, 11, 24, 37]; // index before home stretch

let numPlayers = 2;
let selectedMode = 'local';
let players, tokens, currentPlayer, diceValue, diceRolled, gameActive;
let canvas, ctx, cellSize;
let socket, roomCode, myPlayerIndex;

document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub.getQueryParams();
  selectedMode = params.mode || 'local';
  if (params.mode === 'online') {
    selectedMode = 'online';
    document.getElementById('mode-local').classList.remove('active');
    document.getElementById('mode-online').classList.add('active');
  }
  setPlayerCount(2);
});

function setPlayerCount(n) {
  numPlayers = n;
  document.querySelectorAll('.count-btn[data-n]').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.n)===n));
  const inputs = document.getElementById('player-inputs');
  inputs.innerHTML = Array.from({length:n},(_,i)=>`
    <div class="player-input-row">
      <span class="player-label" style="color:${COLORS[i]}">${COLOR_NAMES[i]}</span>
      <input class="player-name-input" id="p${i}-name" value="Player ${i+1}" maxlength="16"/>
    </div>`).join('');
}

function setMode(m) {
  selectedMode = m;
  document.getElementById('mode-local').classList.toggle('active',m==='local');
  document.getElementById('mode-online').classList.toggle('active',m==='online');
}

async function startGame() {
  const names = Array.from({length:numPlayers},(_,i)=>document.getElementById(`p${i}-name`)?.value.trim()||`Player ${i+1}`);
  players = names.map((name,i)=>({name,color:COLORS[i],light:COLOR_LIGHT[i],index:i}));

  if (selectedMode === 'online') {
    try {
      const res = await fetch('/api/create-room', {method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({game:'ludo',hostName:names[0],maxPlayers:numPlayers})});
      const data = await res.json();
      roomCode = data.code;
      myPlayerIndex = 0;
      initOnline(roomCode, names[0], data);
    } catch(e) { alert('Server not running. Use local mode.'); }
    return;
  }

  initGameState();
  showGame();
}

function initGameState() {
  tokens = players.map((p,pi)=>Array.from({length:4},(_,ti)=>({
    player:pi, index:ti, pos:-1, // -1 = at home, 0-51 = on main path, 52-56 = on home stretch
    finished:false
  })));
  currentPlayer = 0; diceValue = 0; diceRolled = false; gameActive = true;
}

function showGame() {
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  canvas = document.getElementById('ludo-canvas');
  const size = Math.min(560, window.innerWidth - 280);
  canvas.width = canvas.height = size;
  cellSize = size / 15;
  ctx = canvas.getContext('2d');
  canvas.addEventListener('click', handleCanvasClick);
  renderAll();
}

function renderAll() {
  renderBoard();
  renderTokens();
  renderPlayerPanels();
}

function renderBoard() {
  const cs = cellSize;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw 15x15 grid cells
  for(let r=0;r<15;r++) for(let c=0;c<15;c++) {
    const x=c*cs, y=r*cs;
    ctx.strokeStyle='rgba(255,255,255,0.1)';
    ctx.lineWidth=0.5;

    // Home zones (corners)
    let bg='#0d1424';
    if(r<6&&c<6) bg='rgba(231,76,60,0.25)';
    else if(r<6&&c>8) bg='rgba(39,174,96,0.25)';
    else if(r>8&&c>8) bg='rgba(41,128,185,0.25)';
    else if(r>8&&c<6) bg='rgba(243,156,18,0.25)';
    // Home stretch lanes
    else if(r===7&&c>=1&&c<=5) bg='rgba(231,76,60,0.4)';
    else if(c===7&&r>=1&&r<=5) bg='rgba(39,174,96,0.4)';
    else if(r===7&&c>=9&&c<=13) bg='rgba(41,128,185,0.4)';
    else if(c===7&&r>=9&&r<=13) bg='rgba(243,156,18,0.4)';
    // Center
    else if(r>=6&&r<=8&&c>=6&&c<=8) bg='#1a1a2e';

    ctx.fillStyle=bg;
    ctx.fillRect(x,y,cs,cs);
    ctx.strokeRect(x,y,cs,cs);
  }

  // Safe stars
  SAFE_CELLS.forEach(idx=>{
    if(idx>=MAIN_PATH_COORDS.length) return;
    const [col,row]=MAIN_PATH_COORDS[idx];
    drawStar(col*cs+cs/2, row*cs+cs/2, cs*0.25, '#ffd700');
  });

  // Center home triangle
  const cx=7.5*cs, cy=7.5*cs;
  const dirs=[[7,6],[8,7],[7,8],[6,7]];
  COLORS.slice(0,numPlayers).forEach((clr,i)=>{
    ctx.fillStyle=clr+'88';
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    const [tc,tr]=dirs[i];
    ctx.lineTo(tc*cs, tr*cs);
    ctx.lineTo((tc+1)*cs,(tr+1)*cs);
    ctx.closePath();
    ctx.fill();
  });

  // Home base squares
  HOME_POSITIONS.forEach((positions,pi)=>{
    if(pi>=numPlayers) return;
    positions.forEach(([c,r])=>{
      ctx.fillStyle=COLORS[pi]+'55';
      ctx.fillRect(c*cs+2,r*cs+2,cs-4,cs-4);
      ctx.strokeStyle=COLORS[pi];
      ctx.lineWidth=2;
      ctx.strokeRect(c*cs+2,r*cs+2,cs-4,cs-4);
    });
  });

  // Path start arrows
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.font=`${cs*0.6}px serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
}

function drawStar(x,y,r,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5-Math.PI/2;
    ctx[i===0?'moveTo':'lineTo'](x+r*Math.cos(angle),y+r*Math.sin(angle));
    const ia=angle+Math.PI/5;
    ctx.lineTo(x+r*0.4*Math.cos(ia),y+r*0.4*Math.sin(ia));
  }
  ctx.closePath(); ctx.fill();
}

function renderTokens() {
  if(!tokens) return;
  const cs=cellSize;
  tokens.forEach(playerTokens=>{
    playerTokens.forEach(token=>{
      if(token.finished) return;
      let x,y;
      if(token.pos===-1) {
        // In home
        const [tc,tr]=HOME_POSITIONS[token.player][token.index];
        x=tc*cs+cs/2; y=tr*cs+cs/2;
      } else if(token.pos>=52) {
        // Home stretch (simplified: straight line toward center)
        const stretch=token.pos-52;
        const stretches=[
          [[2,7],[3,7],[4,7],[5,7],[6,7]],
          [[7,2],[7,3],[7,4],[7,5],[7,6]],
          [[12,7],[11,7],[10,7],[9,7],[8,7]],
          [[7,12],[7,11],[7,10],[7,9],[7,8]]
        ];
        const coord=stretches[token.player][Math.min(stretch,4)];
        x=coord[0]*cs+cs/2; y=coord[1]*cs+cs/2;
      } else {
        const absPath=getPlayerPath(token.player);
        const [tc,tr]=absPath[token.pos%absPath.length];
        x=tc*cs+cs/2; y=tr*cs+cs/2;
      }
      // Draw token
      const r=cs*0.32;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=COLORS[token.player];
      ctx.fill();
      ctx.strokeStyle='white';
      ctx.lineWidth=2;
      ctx.stroke();
      // Token number
      ctx.fillStyle='white';
      ctx.font=`bold ${cs*0.28}px Orbitron,monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(token.index+1,x,y);
    });
  });
}

function getPlayerPath(pi) {
  // Rotate MAIN_PATH_COORDS starting from PLAYER_START[pi]
  const start=PLAYER_START[pi];
  return [...MAIN_PATH_COORDS.slice(start),...MAIN_PATH_COORDS.slice(0,start)];
}

function renderPlayerPanels() {
  if(!players) return;
  const el=document.getElementById('player-panels');
  el.innerHTML=players.map((p,i)=>`
    <div class="player-panel ${i===currentPlayer?'active':''}">
      <div class="player-color-dot" style="background:${p.color}"></div>
      <div><div class="player-panel-name">${p.name}</div>
      <div class="player-panel-tokens">${tokens[i].filter(t=>t.finished).length}/4 home</div></div>
    </div>`).join('');
}

function rollDice() {
  if(!gameActive||diceRolled) return;
  if(selectedMode==='online'&&currentPlayer!==myPlayerIndex) { window.GameHub.showToast("Not your turn!"); return; }

  const dice=document.getElementById('dice');
  dice.classList.add('rolling');
  setTimeout(()=>{
    dice.classList.remove('rolling');
    diceValue=Math.floor(Math.random()*6)+1;
    const faces=['','⚀','⚁','⚂','⚃','⚄','⚅'];
    dice.textContent=faces[diceValue];
    diceRolled=true;
    document.getElementById('roll-btn').disabled=true;

    const movable=getMovableTokens();
    if(movable.length===0) { setTimeout(endTurn,800); return; }
    if(movable.length===1&&diceValue!==6) { moveToken(movable[0]); return; }
    window.GameHub.showToast(`Rolled ${diceValue}! Click a token to move.`);
  },400);
}

function getMovableTokens() {
  return tokens[currentPlayer].filter(t=>{
    if(t.finished) return false;
    if(t.pos===-1&&diceValue===6) return true;
    if(t.pos===-1) return false;
    const newPos=t.pos+diceValue;
    if(newPos>56) return false; // can't overshoot home
    return true;
  });
}

function handleCanvasClick(e) {
  if(!gameActive||!diceRolled) return;
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(canvas.width/rect.width);
  const my=(e.clientY-rect.top)*(canvas.height/rect.height);
  const cs=cellSize;
  const clickedCol=Math.floor(mx/cs), clickedRow=Math.floor(my/cs);

  // Find which token was clicked
  const movable=getMovableTokens();
  for(const token of movable) {
    let tc,tr;
    if(token.pos===-1) { [tc,tr]=HOME_POSITIONS[token.player][token.index]; }
    else {
      const path=getPlayerPath(token.player);
      [tc,tr]=path[token.pos%path.length];
    }
    if(tc===clickedCol&&tr===clickedRow) { moveToken(token); return; }
  }
}

function moveToken(token) {
  if(token.pos===-1) {
    token.pos=0; // move out of home
  } else {
    token.pos+=diceValue;
    if(token.pos>=52) { token.pos=Math.min(token.pos,56); }
    if(token.pos===56) { token.finished=true; }
  }

  // Capture opponent tokens
  if(token.pos>0&&token.pos<52) {
    const path=getPlayerPath(token.player);
    const landCoord=path[token.pos];
    tokens.forEach(pt=>pt.forEach(t=>{
      if(t.player===token.player||t.pos<0||t.pos>=52||t.finished) return;
      const tpath=getPlayerPath(t.player);
      if(tpath[t.pos]&&tpath[t.pos][0]===landCoord[0]&&tpath[t.pos][1]===landCoord[1]) {
        if(!SAFE_CELLS.includes(t.pos)) { t.pos=-1; window.GameHub.showToast(`${players[token.player].name} captured ${players[t.player].name}'s token!`); }
      }
    }));
  }

  renderAll();

  // Check win
  if(tokens[currentPlayer].every(t=>t.finished)) {
    document.getElementById('winner-title').textContent=`${players[currentPlayer].name} Wins! 🎉`;
    document.getElementById('winner-overlay').style.display='flex';
    gameActive=false; return;
  }

  if(diceValue===6) { diceRolled=false; document.getElementById('roll-btn').disabled=false; window.GameHub.showToast("Rolled 6! Roll again!"); }
  else endTurn();

  if(selectedMode==='online'&&socket) socket.emit('game-move',{code:roomCode,move:{token:token.index,player:token.player,pos:token.pos},state:{tokens,currentPlayer}});
}

function endTurn() {
  currentPlayer=(currentPlayer+1)%numPlayers;
  diceRolled=false;
  document.getElementById('roll-btn').disabled=false;
  document.getElementById('dice').textContent='🎲';
  renderPlayerPanels();
}

function initOnline(code, name, data) {
  socket=io();
  myPlayerIndex=0;
  players=[{name,color:COLORS[0],index:0}];
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  document.getElementById('online-info').innerHTML=`
    <div class="room-code-display" style="margin-bottom:20px">
      <div class="room-code-label">ROOM CODE</div>
      <div class="room-code-value">${code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${code}').then(()=>window.GameHub.showToast('Copied!'))">Copy</button>
    </div><p style="text-align:center;color:var(--text-secondary)">Waiting for ${numPlayers-1} more player(s)…</p>`;
  socket.emit('join-room',{code,playerName:name});
  socket.on('room-updated',room=>{
    const connected=room.players.filter(p=>p.id);
    if(connected.length>=numPlayers){
      players=connected.map((p,i)=>({name:p.name,color:COLORS[i],index:i}));
      document.getElementById('online-info').style.display='none';
      initGameState(); showGame();
    }
  });
  socket.on('opponent-move',({state})=>{tokens=state.tokens;currentPlayer=state.currentPlayer;renderAll();});
  socket.on('player-left',()=>window.GameHub.showToast('A player left the game'));
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
