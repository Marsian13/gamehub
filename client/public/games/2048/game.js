let grid,score,best,history;

document.addEventListener('DOMContentLoaded',()=>{
  best=window.GameHub.loadState('2048_best')||0;
  const saved=window.GameHub.loadState('2048_state');
  if(saved){grid=saved.grid;score=saved.score;history=saved.history||[];render();}
  else newGame();
});

function newGame(){
  grid=Array(16).fill(0); score=0; history=[];
  addTile(); addTile();
  document.getElementById('winner-overlay').style.display='none';
  render(); save();
}

function addTile(){
  const empty=grid.reduce((a,v,i)=>v===0?[...a,i]:a,[]);
  if(!empty.length) return;
  const i=empty[Math.floor(Math.random()*empty.length)];
  grid[i]=Math.random()<0.9?2:4;
}

function move(dir){
  history.push([...grid]);
  const prev=grid.join();
  if(dir==='left') for(let r=0;r<4;r++) processRow(r*4,1);
  if(dir==='right') for(let r=0;r<4;r++) processRow(r*4+3,-1);
  if(dir==='up') for(let c=0;c<4;c++) processRow(c,4);
  if(dir==='down') for(let c=0;c<4;c++) processRow(c+12,-4);
  if(grid.join()!==prev){addTile();render();save();}
  if(grid.includes(2048)&&!history.some(h=>h.includes(2048))){
    document.getElementById('trophy').textContent='🎯';
    document.getElementById('wtitle').textContent='You reached 2048! 🎉';
    document.getElementById('winner-overlay').style.display='flex';
  }
  if(!canMove()){document.getElementById('trophy').textContent='😢';document.getElementById('wtitle').textContent='No more moves!';document.getElementById('winner-overlay').style.display='flex';}
}

function processRow(start,step){
  let vals=[grid[start],grid[start+step],grid[start+step*2],grid[start+step*3]].filter(v=>v!==0);
  for(let i=0;i<vals.length-1;i++){
    if(vals[i]===vals[i+1]){vals[i]*=2;score+=vals[i];vals.splice(i+1,1);}
  }
  while(vals.length<4) vals.push(0);
  [0,1,2,3].forEach(i=>{grid[start+step*i]=vals[i];});
  if(score>best){best=score;window.GameHub.saveState('2048_best',best);}
}

function canMove(){
  if(grid.includes(0)) return true;
  for(let i=0;i<16;i++){
    if(i%4<3&&grid[i]===grid[i+1]) return true;
    if(i<12&&grid[i]===grid[i+4]) return true;
  }
  return false;
}

function undoMove(){
  if(!history.length) return;
  grid=history.pop(); render();
}

function save(){
  window.GameHub.saveState('2048_state',{grid,score,history});
}

function render(){
  document.getElementById('score').textContent=score;
  document.getElementById('best').textContent=best;
  const el=document.getElementById('board');
  el.innerHTML=grid.map(v=>{
    const cls=v?`t${v}`:'';
    return `<div class="g2048-tile ${cls}">${v||''}</div>`;
  }).join('');
}

document.addEventListener('keydown',e=>{
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(map[e.key]){e.preventDefault();move(map[e.key]);}
});

// Touch swipe
let tx,ty;
document.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
document.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)<30&&Math.abs(dy)<30) return;
  if(Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left');
  else move(dy>0?'down':'up');
});

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
