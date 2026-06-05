const GRID=20,CELL=25;
let snake,dir,nextDir,food,score,best,level,running,gameLoop;
const canvas=()=>document.getElementById('snake-canvas');
const ctx=()=>canvas().getContext('2d');

document.addEventListener('DOMContentLoaded',()=>{
  best=parseInt(window.GameHub.loadState('snake_best')||0);
  document.getElementById('best').textContent=best;
  drawIdle();
});

function startGame(){
  snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  dir={x:1,y:0}; nextDir={x:1,y:0};
  score=0; level=1; running=true;
  document.getElementById('winner-overlay').style.display='none';
  document.getElementById('start-btn').textContent='RESTART';
  spawnFood(); clearInterval(gameLoop);
  gameLoop=setInterval(tick,180);
}

function tick(){
  dir=nextDir;
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.x>=GRID||head.y<0||head.y>=GRID||snake.some(s=>s.x===head.x&&s.y===head.y)){
    endGame(); return;
  }
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score+=10*level;
    document.getElementById('score').textContent=score;
    if(score>best){best=score;window.GameHub.saveState('snake_best',best);document.getElementById('best').textContent=best;}
    if(score%(50*level)===0){level++;document.getElementById('level').textContent=level;clearInterval(gameLoop);gameLoop=setInterval(tick,Math.max(80,180-level*20));}
    spawnFood();
  } else snake.pop();
  draw();
}

function setDir(x,y){
  if(x===1&&dir.x===-1||x===-1&&dir.x===1) return;
  if(y===1&&dir.y===-1||y===-1&&dir.y===1) return;
  nextDir={x,y};
}

function spawnFood(){
  do{food={x:Math.floor(Math.random()*GRID),y:Math.floor(Math.random()*GRID)};}
  while(snake.some(s=>s.x===food.x&&s.y===food.y));
}

function draw(){
  const c=ctx();
  c.fillStyle='#050810'; c.fillRect(0,0,500,500);
  // Grid dots
  c.fillStyle='rgba(255,255,255,0.03)';
  for(let x=0;x<GRID;x++) for(let y=0;y<GRID;y++) c.fillRect(x*CELL+CELL/2-1,y*CELL+CELL/2-1,2,2);
  // Snake
  snake.forEach((s,i)=>{
    const alpha=1-i/snake.length*0.6;
    c.fillStyle=i===0?'#00ff88':`rgba(0,200,100,${alpha})`;
    c.beginPath(); c.roundRect(s.x*CELL+2,s.y*CELL+2,CELL-4,CELL-4,4); c.fill();
    if(i===0){c.fillStyle='#050810';c.fillRect(s.x*CELL+6,s.y*CELL+7,3,3);c.fillRect(s.x*CELL+16,s.y*CELL+7,3,3);}
  });
  // Food
  c.font=`${CELL-2}px serif`; c.textAlign='center'; c.textBaseline='middle';
  c.fillText('🍎',food.x*CELL+CELL/2,food.y*CELL+CELL/2+1);
}

function drawIdle(){
  const c=ctx();
  c.fillStyle='#050810'; c.fillRect(0,0,500,500);
  c.fillStyle='rgba(0,255,136,0.1)';
  c.fillRect(0,0,500,500);
  c.fillStyle='var(--accent,#e8b84b)'; c.font='bold 24px Orbitron,monospace';
  c.textAlign='center'; c.fillText('Press START',250,250);
}

function endGame(){
  clearInterval(gameLoop); running=false;
  document.getElementById('final-score').textContent=`Score: ${score}  |  Best: ${best}`;
  document.getElementById('winner-overlay').style.display='flex';
}

document.addEventListener('keydown',e=>{
  const map={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
  if(map[e.key]){e.preventDefault();setDir(map[e.key].x,map[e.key].y);}
  if(e.key===' '&&!running) startGame();
});

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
