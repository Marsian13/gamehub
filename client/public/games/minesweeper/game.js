const CONFIGS={easy:{r:9,c:9,m:10},medium:{r:16,c:16,m:40},hard:{r:16,c:30,m:99}};
let rows,cols,mines,board,revealed,flagged,gameOver,firstClick,timerInt,elapsed,flags;

document.addEventListener('DOMContentLoaded',newGame);

function newGame(){
  const cfg=CONFIGS[document.getElementById('diff').value];
  rows=cfg.r; cols=cfg.c; mines=cfg.m;
  board=Array(rows*cols).fill(0);
  revealed=new Set(); flagged=new Set();
  gameOver=false; firstClick=true; elapsed=0; flags=0;
  document.getElementById('mines-left').textContent=mines;
  document.getElementById('winner-overlay').style.display='none';
  clearInterval(timerInt); document.getElementById('timer').textContent='0';
  render();
}

function placeMines(safe){
  const indices=[...Array(rows*cols).keys()].filter(i=>i!==safe);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  indices.slice(0,mines).forEach(i=>board[i]=-1);
  for(let i=0;i<rows*cols;i++) if(board[i]!==-1) board[i]=neighbors(i).filter(n=>board[n]===-1).length;
}

function neighbors(i){
  const r=Math.floor(i/cols),c=i%cols,ns=[];
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc) continue;
    const nr=r+dr,nc=c+dc;
    if(nr>=0&&nr<rows&&nc>=0&&nc<cols) ns.push(nr*cols+nc);
  }
  return ns;
}

function reveal(i){
  if(revealed.has(i)||flagged.has(i)||gameOver) return;
  if(firstClick){firstClick=false;placeMines(i);startTimer();}
  revealed.add(i);
  if(board[i]===-1){gameOver=true;revealAll();endGame(false);return;}
  if(board[i]===0) neighbors(i).forEach(n=>reveal(n));
  checkWin();
  render();
}

function flag(i){
  if(revealed.has(i)||gameOver) return;
  if(flagged.has(i)){flagged.delete(i);flags--;}else{flagged.add(i);flags++;}
  document.getElementById('mines-left').textContent=mines-flags;
  render();
}

function revealAll(){
  for(let i=0;i<rows*cols;i++) if(board[i]===-1) revealed.add(i);
  render();
}

function checkWin(){
  if(revealed.size===rows*cols-mines){gameOver=true;clearInterval(timerInt);endGame(true);}
}

function endGame(win){
  clearInterval(timerInt);
  if(win){
    const best=window.GameHub.loadState('ms_best_'+document.getElementById('diff').value);
    if(!best||elapsed<best) window.GameHub.saveState('ms_best_'+document.getElementById('diff').value,elapsed);
    document.getElementById('ms-trophy').textContent='🏆';
    document.getElementById('ms-title').textContent='You Win! 🎉';
    document.getElementById('ms-sub').textContent=`Time: ${elapsed}s`;
  } else {
    document.getElementById('ms-trophy').textContent='💥';
    document.getElementById('ms-title').textContent='Boom! Game Over';
    document.getElementById('ms-sub').textContent='Better luck next time!';
  }
  document.getElementById('winner-overlay').style.display='flex';
}

function startTimer(){
  timerInt=setInterval(()=>{elapsed++;document.getElementById('timer').textContent=elapsed;},1000);
}

function render(){
  const el=document.getElementById('board');
  el.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  const best=window.GameHub.loadState('ms_best_'+document.getElementById('diff').value);
  document.getElementById('best-time').textContent=best?best+'s':'—';
  const NUM_COLORS=['','n1','n2','n3','n4','n5','n6','n7','n8'];
  el.innerHTML='';
  for(let i=0;i<rows*cols;i++){
    const cell=document.createElement('div');
    cell.className='ms-cell';
    const isRevealed=revealed.has(i), isFlagged=flagged.has(i);
    if(isRevealed){
      cell.classList.add('revealed');
      if(board[i]===-1) cell.classList.add('mine-hit');
      if(board[i]===-1) cell.textContent='💣';
      else if(board[i]>0){cell.textContent=board[i];cell.classList.add(NUM_COLORS[board[i]]);}
    } else if(isFlagged){
      cell.classList.add('flagged'); cell.textContent='🚩';
    }
    cell.onclick=()=>reveal(i);
    cell.oncontextmenu=e=>{e.preventDefault();flag(i);};
    // Long press for mobile
    let longPress; cell.ontouchstart=()=>{longPress=setTimeout(()=>flag(i),500);}; cell.ontouchend=()=>clearTimeout(longPress);
    el.appendChild(cell);
  }
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
