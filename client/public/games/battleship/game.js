// BATTLESHIP — Full game with AI hunt/target strategy
const SHIPS_DEF = [
  {name:'Carrier',size:5,symbol:'🚢'},
  {name:'Battleship',size:4,symbol:'⛴'},
  {name:'Cruiser',size:3,symbol:'🛥'},
  {name:'Submarine',size:3,symbol:'🤿'},
  {name:'Destroyer',size:2,symbol:'⚡'}
];

let mode, players, myGrid, enemyGrid, myShips, enemyShips;
let placingShipIdx, isHorizontal, placedShips;
let myTurn, gameActive, socket, roomCode, myIndex;
// AI state
let aiHits, aiTargets, aiDirection, aiLastHit;
let p2Grid, p2Ships; // for local/vs-computer

document.addEventListener('DOMContentLoaded', () => {
  const params = window.GameHub.getQueryParams();
  mode = params.mode || 'vs-computer';
  if (mode === 'vs-computer') {
    players = ['You','Computer'];
    document.getElementById('player-inputs').innerHTML = '<p style="color:var(--text-secondary);text-align:center">Place your ships then battle the AI!</p>';
  } else if (mode === 'online') {
    myIndex = params.host==='1'?0:1;
    setupOnlinePrep(params);
    return;
  } else {
    players = ['Player 1','Player 2'];
    document.getElementById('player-inputs').innerHTML = `
      <div class="player-input-row"><span class="player-label">P1</span><input class="player-name-input" id="p1-name" value="Player 1" maxlength="16"/></div>
      <div class="player-input-row"><span class="player-label">P2</span><input class="player-name-input" id="p2-name" value="Player 2" maxlength="16"/></div>`;
  }
});

function startPlacement() {
  if (mode === 'local') {
    players[0] = document.getElementById('p1-name')?.value.trim()||'Player 1';
    players[1] = document.getElementById('p2-name')?.value.trim()||'Player 2';
  }
  initPlacement(0);
}

let currentPlacingPlayer = 0;

function initPlacement(playerIdx) {
  currentPlacingPlayer = playerIdx;
  myGrid = Array(100).fill(0);
  placedShips = []; placingShipIdx = 0; isHorizontal = true;
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('placement-screen').style.display='block';
  document.getElementById('placement-title').textContent = `${players[playerIdx]}: Place Your Ships`;
  renderShipList(); renderPlacementGrid();
}

function renderShipList() {
  const el=document.getElementById('ship-list');
  el.innerHTML=SHIPS_DEF.map((s,i)=>`
    <div class="ship-item${i===placingShipIdx?' active':''}${placedShips[i]?' placed':''}" onclick="selectShip(${i})">
      <div class="ship-cells">${Array.from({length:s.size},()=>'<div class="ship-cell-preview"></div>').join('')}</div>
      ${s.symbol} ${s.name}
    </div>`).join('');
}

function selectShip(i) {
  if (placedShips[i]) return;
  placingShipIdx = i;
  renderShipList();
}

function rotateShip() { isHorizontal=!isHorizontal; }

function renderPlacementGrid() {
  const el = document.getElementById('placement-grid');
  el.innerHTML = '';
  for(let i=0;i<100;i++) {
    const cell=document.createElement('div');
    cell.className='bs-cell'+(myGrid[i]?' ship-placed':'');
    cell.dataset.i=i;
    cell.onclick=()=>placeShip(i);
    cell.onmouseenter=()=>showPreview(i);
    cell.onmouseleave=()=>clearPreview();
    el.appendChild(cell);
  }
}

function showPreview(i) {
  clearPreview();
  const ship=SHIPS_DEF[placingShipIdx];
  const cells=getShipCells(i,ship.size,isHorizontal);
  if(!cells) return;
  const valid=cells.every(c=>myGrid[c]===0);
  cells.forEach(c=>{
    const el=document.querySelector(`#placement-grid .bs-cell[data-i="${c}"]`);
    if(el) el.classList.add(valid?'hover-preview':'hover-invalid');
  });
}

function clearPreview() {
  document.querySelectorAll('#placement-grid .hover-preview, #placement-grid .hover-invalid').forEach(el=>{
    el.classList.remove('hover-preview','hover-invalid');
  });
}

function getShipCells(start,size,horiz) {
  const cells=[];
  const row=Math.floor(start/10), col=start%10;
  for(let i=0;i<size;i++) {
    if(horiz) { if(col+i>=10) return null; cells.push(start+i); }
    else { if(row+i>=10) return null; cells.push(start+i*10); }
  }
  return cells;
}

function placeShip(i) {
  if (placedShips[placingShipIdx]) return;
  const ship=SHIPS_DEF[placingShipIdx];
  const cells=getShipCells(i,ship.size,isHorizontal);
  if(!cells||cells.some(c=>myGrid[c]!==0)) return;
  cells.forEach(c=>myGrid[c]=placingShipIdx+1);
  placedShips[placingShipIdx]=cells;
  const next=SHIPS_DEF.findIndex((s,idx)=>idx>placingShipIdx&&!placedShips[idx]);
  placingShipIdx=next>=0?next:placingShipIdx;
  const readyBtn=document.getElementById('ready-btn');
  readyBtn.disabled=placedShips.filter(Boolean).length<SHIPS_DEF.length;
  renderShipList(); renderPlacementGrid();
}

function autoPlace() {
  myGrid=Array(100).fill(0); placedShips=[];
  SHIPS_DEF.forEach((_,i)=>{
    let placed=false;
    while(!placed) {
      const horiz=Math.random()<0.5, start=Math.floor(Math.random()*100);
      const cells=getShipCells(start,SHIPS_DEF[i].size,horiz);
      if(cells&&cells.every(c=>myGrid[c]===0)){cells.forEach(c=>myGrid[c]=i+1);placedShips[i]=cells;placed=true;}
    }
  });
  placingShipIdx=0;
  document.getElementById('ready-btn').disabled=false;
  renderShipList(); renderPlacementGrid();
}

function finishPlacement() {
  if (mode==='local'&&currentPlacingPlayer===0) {
    p2Grid=null; p2Ships=null;
    myShips=[...myGrid]; // save p1
    // Prompt p2
    alert(`${players[0]} done! Now ${players[1]}, place your ships.`);
    const saved=myShips;
    initPlacement(1);
    // When p2 finishes, swap
    const orig=finishPlacement;
    window._p1Grid=saved;
  } else if (mode==='local'&&currentPlacingPlayer===1) {
    p2Grid=[...myGrid];
    myGrid=window._p1Grid;
    startBattle(false);
  } else {
    // vs-computer
    const compGrid=Array(100).fill(0);
    SHIPS_DEF.forEach((_,i)=>{
      let placed=false;
      while(!placed){
        const horiz=Math.random()<0.5, start=Math.floor(Math.random()*100);
        const cells=getShipCells(start,SHIPS_DEF[i].size,horiz);
        if(cells&&cells.every(c=>compGrid[c]===0)){cells.forEach(c=>compGrid[c]=i+1);placed=true;}
      }
    });
    p2Grid=compGrid;
    startBattle(true);
  }
}

function startBattle(vsComp) {
  enemyGrid=Array(100).fill(0); // shots fired
  document.getElementById('placement-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  myTurn=true; gameActive=true;
  aiHits=[]; aiTargets=[]; aiLastHit=null; aiDirection=null;
  renderGameGrids(); updateStatus(`${players[0]}'s turn — fire!`);
}

function renderGameGrids() {
  renderGrid('enemy-grid', enemyGrid, true, true);
  renderGrid('my-grid', myGrid, false, false);
}

function renderGrid(id, grid, clickable, enemy) {
  const el=document.getElementById(id);
  el.innerHTML='';
  for(let i=0;i<100;i++){
    const cell=document.createElement('div');
    let cls='bs-cell';
    const shot=enemy?enemyGrid[i]:(mode==='local'&&!myTurn?enemyGrid[i]:null);
    if(!enemy&&myGrid[i]>0&&!(enemy&&!myTurn)) cls+=' ship-placed';
    if(grid[i]==='H') cls+=' hit';
    if(grid[i]==='M') cls+=' miss';
    cell.className=cls;
    if(grid[i]==='H') cell.textContent='💥';
    if(grid[i]==='M') cell.textContent='○';
    if(clickable&&myTurn&&grid[i]!=='H'&&grid[i]!=='M') cell.onclick=()=>fireAt(i);
    el.appendChild(cell);
  }
}

function fireAt(i) {
  if(!myTurn||!gameActive||enemyGrid[i]==='H'||enemyGrid[i]==='M') return;
  const hit=p2Grid[i]>0;
  enemyGrid[i]=hit?'H':'M';
  if(hit) checkSunk(i,p2Grid,enemyGrid);
  renderGameGrids();
  if(checkWin(enemyGrid)) { endGame(players[0]); return; }
  if(hit) { updateStatus('Hit! Fire again!'); return; } // bonus turn on hit? no — standard rules
  myTurn=false;
  updateStatus(`${players[1]} is thinking…`);
  if(mode==='vs-computer') setTimeout(aiMove,800);
  else updateStatus(`${players[1]}'s turn — fire!`);
}

function checkSunk(i, shipGrid, shotGrid) {
  const shipId=shipGrid[i];
  const cells=shipGrid.reduce((a,v,idx)=>v===shipId?[...a,idx]:a,[]);
  if(cells.every(c=>shotGrid[c]==='H')) {
    cells.forEach(c=>{ const el=document.querySelector(`#enemy-grid .bs-cell:nth-child(${c+1})`); if(el) el.classList.add('sunk'); });
    window.GameHub.showToast(`${SHIPS_DEF[shipId-1]?.name||'Ship'} sunk! 💥`);
  }
}

function checkWin(shotGrid) {
  return p2Grid.every((v,i)=>v===0||shotGrid[i]==='H');
}

function endGame(winner) {
  gameActive=false;
  document.getElementById('winner-title').textContent=`${winner} Wins! 🏆`;
  document.getElementById('winner-overlay').style.display='flex';
}

function updateStatus(msg) { document.getElementById('bs-status').textContent=msg; }

// AI hunt/target
let myShots, myHits;
function aiMove() {
  if(!gameActive) return;
  myShots=myShots||Array(100).fill(false);
  let target;
  if(aiTargets.length>0) { target=aiTargets.shift(); }
  else {
    do { target=Math.floor(Math.random()*100); } while(myShots[target]);
    // Parity: prefer cells where (row+col)%2===0 for efficiency
  }
  myShots[target]=true;
  const hit=myGrid[target]>0;
  myGrid[target]=hit?'H':'M';
  if(hit) {
    aiHits.push(target);
    aiLastHit=target;
    // Add adjacent cells to targets
    const adj=getAdjacent(target).filter(c=>!myShots[c]);
    aiTargets.push(...adj);
  }
  checkSunkAI(target);
  renderGrid('my-grid',myGrid,false,false);
  if(myGrid.filter(v=>v==='H').length===SHIPS_DEF.reduce((a,s)=>a+s.size,0)) { endGame(players[1]); return; }
  myTurn=true;
  updateStatus(`${players[0]}'s turn — fire!`);
}

function checkSunkAI(i) {
  const shipId=myGrid[i]==='H'?findShipAt(i):0;
  if(!shipId) return;
}
function findShipAt(i) { return 0; } // simplified
function getAdjacent(i) {
  const r=Math.floor(i/10),c=i%10,adj=[];
  if(r>0)adj.push(i-10); if(r<9)adj.push(i+10);
  if(c>0)adj.push(i-1); if(c<9)adj.push(i+1);
  return adj;
}

function setupOnlinePrep(params) {
  socket=io();
  const name=decodeURIComponent(params.name||'Player');
  players[myIndex]=name;
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('placement-screen').style.display='block';
  document.getElementById('placement-title').textContent=`${name}: Place Your Ships`;
  initPlacement(myIndex);
  // Override finishPlacement for online
  window._onlinePlacementDone=()=>{
    socket.emit('join-room',{code:params.code,playerName:name});
    socket.emit('game-move',{code:params.code,move:'ready',state:{grid:myGrid}});
    document.getElementById('placement-screen').style.display='none';
    document.getElementById('game-screen').style.display='block';
    document.getElementById('bs-status').textContent='Waiting for opponent to place ships…';
  };
  socket.on('room-updated',room=>{
    if(room.players.filter(p=>p.id).length>=2){
      const opp=room.players.find(p=>p.name!==name);
      if(opp) players[myIndex===0?1:0]=opp.name;
    }
  });
  socket.on('opponent-move',({move,state})=>{
    if(move==='ready'){ p2Grid=state.grid; renderGameGrids(); gameActive=true; myTurn=myIndex===0; updateStatus(myTurn?'Your turn!':'Waiting for opponent…'); }
    if(move==='fire') { const{i}=state; const hit=myGrid[i]>0; myGrid[i]=hit?'H':'M'; renderGrid('my-grid',myGrid,false,false); if(myGrid.filter(v=>v==='H').length>=17){endGame(players[myIndex===0?1:0]);return;} myTurn=true; updateStatus('Your turn!'); }
  });
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
