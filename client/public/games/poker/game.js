// POKER — Texas Hold'em, up to 10 players, AI opponents
// Supports: vs-computer, local pass-and-play, online

const SUITS=['♠','♥','♦','♣'], RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VAL={2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,'10':10,J:11,Q:12,K:13,A:14};

let numPlayers=2, pokerMode='ai', playerNames=[];
let deck,players,pot,communityCards,stage,currentBet,activePlayer,dealerIdx,handHistory,gameRunning;
let socket,roomCode,myIndex;

// ---- SETUP ----
document.addEventListener('DOMContentLoaded',()=>{
  setPokerPlayers(2);
});

function setPokerPlayers(n){
  numPlayers=n;
  document.querySelectorAll('.count-btn[data-n]').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.n)===n));
  renderNameInputs();
}

function setPokerMode(m){
  pokerMode=m;
  ['ai','local','online'].forEach(x=>document.getElementById('mode-'+x).classList.toggle('active',x===m));
  // Cap players for AI mode
  if(m==='ai'&&numPlayers>6) setPokerPlayers(6);
  renderNameInputs();
}

function renderNameInputs(){
  const el=document.getElementById('poker-player-inputs');
  if(pokerMode==='ai'){
    el.innerHTML=`<div class="player-input-row"><span class="player-label">You</span><input class="player-name-input" id="p0-name" value="Player 1" maxlength="14"/></div>`;
  } else {
    el.innerHTML=Array.from({length:numPlayers},(_,i)=>`<div class="player-input-row"><span class="player-label">P${i+1}</span><input class="player-name-input" id="p${i}-name" value="Player ${i+1}" maxlength="14"/></div>`).join('');
  }
}

async function startPoker(){
  const startChips=parseInt(document.getElementById('start-chips').value)||1000;
  if(pokerMode==='ai'){
    const myName=document.getElementById('p0-name').value.trim()||'You';
    playerNames=[myName,...Array.from({length:numPlayers-1},(_,i)=>`Bot ${i+1}`)];
  } else if(pokerMode==='online'){
    const myName=document.getElementById('p0-name')?.value.trim()||'Player';
    try{
      const res=await fetch('/api/create-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'poker',hostName:myName,maxPlayers:numPlayers})});
      const data=await res.json();
      roomCode=data.code; myIndex=0;
      setupOnline(myName,data.code,startChips); return;
    }catch(e){alert('Server not running. Use local mode.');}
    return;
  } else {
    playerNames=Array.from({length:numPlayers},(_,i)=>document.getElementById(`p${i}-name`)?.value.trim()||`P${i+1}`);
  }
  players=playerNames.map((name,i)=>({name,chips:startChips,bet:0,folded:false,allIn:false,hand:[],isAI:pokerMode==='ai'&&i>0}));
  dealerIdx=0;
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  startHand();
}

// ---- DECK ----
function makeDeck(){
  const d=[];
  for(const s of SUITS) for(const r of RANKS) d.push({suit:s,rank:r,val:RANK_VAL[r],color:s==='♥'||s==='♦'?'red':'black'});
  return d;
}
function shuffle(d){for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
function deal(n){return Array.from({length:n},()=>deck.pop());}

// ---- HAND FLOW ----
function startHand(){
  deck=shuffle(makeDeck());
  communityCards=[]; pot=0; stage='preflop'; currentBet=20; handHistory=[];
  players.forEach(p=>{p.bet=0;p.folded=false;p.allIn=false;p.hand=[];});
  // Deal 2 hole cards each
  players.forEach(p=>p.hand=deal(2));
  // Blinds
  const sb=(dealerIdx+1)%numPlayers, bb=(dealerIdx+2)%numPlayers;
  postBlind(sb,10); postBlind(bb,20);
  activePlayer=(dealerIdx+3)%numPlayers;
  gameRunning=true;
  document.getElementById('winner-overlay').style.display='none';
  renderTable();
  maybeAiMove();
}

function postBlind(idx,amt){
  const p=players[idx];
  const actual=Math.min(amt,p.chips);
  p.chips-=actual; p.bet+=actual; pot+=actual;
}

function playerAction(action,amount=0){
  if(!gameRunning) return;
  const p=players[activePlayer];
  switch(action){
    case 'fold': p.folded=true; break;
    case 'check': break;
    case 'call': {const toCall=Math.min(currentBet-p.bet,p.chips); p.chips-=toCall; p.bet+=toCall; pot+=toCall; if(p.chips===0)p.allIn=true; break;}
    case 'raise': {const total=Math.min(amount,p.chips+p.bet); const add=total-p.bet; p.chips-=add; p.bet=total; pot+=add; currentBet=total; if(p.chips===0)p.allIn=true; break;}
    case 'allin': {pot+=p.chips; p.bet+=p.chips; if(p.bet>currentBet) currentBet=p.bet; p.chips=0; p.allIn=true; break;}
  }
  handHistory.push({player:p.name,action,amount});
  advanceAction();
}

function advanceAction(){
  const active=players.filter(p=>!p.folded&&!p.allIn);
  // Check if only one left
  const notFolded=players.filter(p=>!p.folded);
  if(notFolded.length===1){awardPot([notFolded[0]]);return;}

  // Find next player who can act
  let next=(activePlayer+1)%numPlayers;
  let loops=0;
  while((players[next].folded||players[next].allIn)&&loops<numPlayers){next=(next+1)%numPlayers;loops++;}

  // Check if betting round over (everyone matched or folded/all-in)
  const canAct=players.filter(p=>!p.folded&&!p.allIn);
  const allMatched=canAct.every(p=>p.bet===currentBet)||canAct.length===0;

  if(allMatched&&next===getFirstToAct()){
    advanceStage(); return;
  }
  activePlayer=next;
  renderTable();
  maybeAiMove();
}

function getFirstToAct(){
  let idx=(dealerIdx+1)%numPlayers;
  while(players[idx].folded) idx=(idx+1)%numPlayers;
  return idx;
}

function advanceStage(){
  currentBet=0; players.forEach(p=>p.bet=0);
  if(stage==='preflop'){stage='flop';communityCards=deal(3);}
  else if(stage==='flop'){stage='turn';communityCards.push(...deal(1));}
  else if(stage==='turn'){stage='river';communityCards.push(...deal(1));}
  else if(stage==='river'){showdown();return;}
  activePlayer=getFirstToAct();
  renderTable();
  maybeAiMove();
}

function showdown(){
  const active=players.filter(p=>!p.folded);
  const scored=active.map(p=>({p,score:evaluateHand([...p.hand,...communityCards])}));
  scored.sort((a,b)=>b.score.rank-a.score.rank||(b.score.tiebreak.reduce((s,v,i)=>s+(v-a.score.tiebreak[i])*Math.pow(15,4-i),0)));
  const winners=scored.filter(s=>s.score.rank===scored[0].score.rank);
  awardPot(winners.map(s=>s.p), scored[0].score.name);
}

function awardPot(winners, handName=''){
  const share=Math.floor(pot/winners.length);
  winners.forEach(w=>w.chips+=share);
  const names=winners.map(w=>w.name).join(' & ');
  document.getElementById('winner-title').textContent=`${names} wins!`;
  document.getElementById('winner-sub').textContent=`${handName?handName+' | ':''}Pot: ${pot} chips`;
  gameRunning=false;
  // Reveal all cards
  renderTable(true);
  document.getElementById('winner-overlay').style.display='flex';
  // Remove busted players
  players=players.filter(p=>p.chips>0);
  if(players.length<2){
    document.getElementById('winner-title').textContent=`${players[0]?.name||'No one'} wins the game!`;
    document.getElementById('winner-sub').textContent='All other players are out!';
    document.querySelectorAll('.winner-btns button')[0].textContent='New Game';
    document.querySelectorAll('.winner-btns button')[0].onclick=()=>window.location.reload();
  }
}

function nextHand(){
  if(players.length<2){window.location.reload();return;}
  dealerIdx=(dealerIdx+1)%players.length;
  document.getElementById('winner-overlay').style.display='none';
  startHand();
}

// ---- AI ----
function maybeAiMove(){
  if(pokerMode!=='ai') return;
  const p=players[activePlayer];
  if(!p||!p.isAI||!gameRunning) return;
  setTimeout(()=>{
    const r=Math.random();
    const toCall=currentBet-p.bet;
    const handStr=evaluateHand([...p.hand,...communityCards]);
    // Aggression based on hand strength
    const aggr=handStr.rank/9;
    if(toCall>0&&r>0.3+aggr*0.4) { playerAction('fold'); return; }
    if(toCall>0) { playerAction(r<aggr*0.5?'raise':' call',currentBet+Math.floor(Math.random()*3+1)*20); return; }
    if(r<aggr*0.6) { playerAction('raise',currentBet+(Math.floor(Math.random()*3)+1)*20); return; }
    playerAction('check');
  },800+Math.random()*600);
}

// ---- HAND EVALUATOR ----
function evaluateHand(cards7){
  const best={rank:0,name:'High Card',tiebreak:[]};
  const combos=combinations(cards7,5);
  for(const hand of combos){
    const r=scoreHand(hand);
    if(r.rank>best.rank||(r.rank===best.rank&&compareTiebreak(r.tiebreak,best.tiebreak)>0)) Object.assign(best,r);
  }
  return best;
}

function scoreHand(cards){
  const vals=cards.map(c=>c.val).sort((a,b)=>b-a);
  const suits=cards.map(c=>c.suit);
  const flush=suits.every(s=>s===suits[0]);
  const sorted=[...vals].sort((a,b)=>b-a);
  const isStr=sorted[0]-sorted[4]===4&&new Set(sorted).size===5;
  const isLowStr=sorted[0]===14&&sorted[1]===5&&sorted[2]===4&&sorted[3]===3&&sorted[4]===2;
  const counts={}; vals.forEach(v=>counts[v]=(counts[v]||0)+1);
  const groups=Object.entries(counts).map(([v,c])=>({v:parseInt(v),c})).sort((a,b)=>b.c-a.c||b.v-a.v);
  const tb=groups.map(g=>g.v*15+g.c);

  if(flush&&(isStr||isLowStr)){
    if(sorted[0]===14&&sorted[1]===13) return{rank:9,name:'Royal Flush',tiebreak:sorted};
    return{rank:8,name:'Straight Flush',tiebreak:isLowStr?[5,4,3,2,1]:sorted};
  }
  if(groups[0].c===4) return{rank:7,name:'Four of a Kind',tiebreak:tb};
  if(groups[0].c===3&&groups[1]?.c===2) return{rank:6,name:'Full House',tiebreak:tb};
  if(flush) return{rank:5,name:'Flush',tiebreak:sorted};
  if(isStr||isLowStr) return{rank:4,name:'Straight',tiebreak:isLowStr?[5,4,3,2,1]:sorted};
  if(groups[0].c===3) return{rank:3,name:'Three of a Kind',tiebreak:tb};
  if(groups[0].c===2&&groups[1]?.c===2) return{rank:2,name:'Two Pair',tiebreak:tb};
  if(groups[0].c===2) return{rank:1,name:'Pair',tiebreak:tb};
  return{rank:0,name:'High Card',tiebreak:sorted};
}

function compareTiebreak(a,b){ for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return(a[i]||0)-(b[i]||0);} return 0; }

function combinations(arr,k){
  if(k===0) return [[]];
  if(arr.length<k) return [];
  const [h,...t]=arr;
  return [...combinations(t,k-1).map(c=>[h,...c]),...combinations(t,k)];
}

// ---- RENDER ----
function renderTable(showAll=false){
  renderCommunity();
  renderPlayersRing(showAll);
  renderControls();
  document.getElementById('stage-label').textContent=stage.toUpperCase();
  document.getElementById('pot').textContent=pot;
}

function renderCommunity(){
  const el=document.getElementById('community-cards');
  el.innerHTML=communityCards.map(c=>cardHtml(c,true)).join('')+
    Array.from({length:5-communityCards.length},()=>'<div class="playing-card lg" style="opacity:0.2;background:rgba(255,255,255,0.05)"></div>').join('');
}

function cardHtml(card,large=false){
  if(!card) return `<div class="playing-card${large?' lg':''} back"></div>`;
  return `<div class="playing-card${large?' lg':''}"><span class="${card.color}" style="font-size:${large?'1.1rem':'0.8rem'};font-weight:900">${card.rank}${card.suit}</span></div>`;
}

const POSITIONS_2=[[50,90],[50,5]];
const POSITIONS_3=[[50,90],[15,20],[85,20]];
const POSITIONS_4=[[50,90],[5,50],[50,5],[95,50]];
const POSITIONS_5=[[50,90],[5,65],[15,10],[85,10],[95,65]];
const POSITIONS_6=[[50,90],[5,60],[10,15],[50,3],[90,15],[95,60]];

function getPositions(n){
  const tables=[null,null,POSITIONS_2,POSITIONS_3,POSITIONS_4,POSITIONS_5,POSITIONS_6];
  if(n<=6&&tables[n]) return tables[n];
  // 7-10: evenly space around ellipse
  return Array.from({length:n},(_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return[50+45*Math.cos(a),50+45*Math.sin(a)];});
}

function renderPlayersRing(showAll=false){
  const el=document.getElementById('players-ring');
  const positions=getPositions(players.length);
  el.innerHTML=players.map((p,i)=>{
    const [lx,ly]=positions[i]||[50,50];
    const isActive=i===activePlayer&&gameRunning;
    const showCards=showAll||(pokerMode==='ai'&&i===0)||(pokerMode==='local'&&i===activePlayer);
    const handEval=showAll&&!p.folded?evaluateHand([...p.hand,...communityCards]):null;
    return `<div class="poker-player" style="left:${lx}%;top:${ly}%">
      <div class="poker-player-box${isActive?' active':''}${p.folded?' folded':''}${p.allIn?' all-in':''}">
        <div class="pp-name">${p.name}${i===dealerIdx?` <span style="color:var(--accent)">D</span>`:''}</div>
        <div class="pp-chips">${p.chips}🪙</div>
        <div class="pp-bet">${p.bet>0?`Bet: ${p.bet}`:''}</div>
        <div class="pp-cards">${showCards?p.hand.map(c=>cardHtml(c)).join(''):(p.hand.length?'<div class="playing-card back"></div><div class="playing-card back"></div>':'')}</div>
        <div class="pp-status">${p.folded?'FOLDED':p.allIn?'ALL IN':isActive?'●':''}</div>
        ${handEval?`<div class="hand-rank-badge">${handEval.name}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

function renderControls(){
  if(!gameRunning){document.getElementById('action-btns').innerHTML='';return;}
  const p=players[activePlayer];
  const isHuman=(pokerMode==='ai'&&activePlayer===0)||(pokerMode==='local')||( pokerMode==='online'&&activePlayer===myIndex);
  if(!isHuman){document.getElementById('action-btns').innerHTML='<span style="color:var(--text-secondary);font-size:0.85rem">Waiting for other players…</span>';return;}
  const toCall=currentBet-p.bet;
  // Hole cards
  document.getElementById('hole-cards').innerHTML=p.hand.map(c=>cardHtml(c,true)).join('');
  const handEval=communityCards.length>=3?evaluateHand([...p.hand,...communityCards]):null;
  if(handEval) document.getElementById('hole-cards').innerHTML+=`<div class="hand-rank-badge" style="margin-left:12px;font-size:0.8rem">${handEval.name}</div>`;
  // Slider
  const slider=document.getElementById('bet-slider');
  slider.min=currentBet+1; slider.max=p.chips+p.bet; slider.value=Math.max(currentBet+20,slider.min);
  document.getElementById('bet-amt').textContent=slider.value;
  // Buttons
  const btns=[];
  btns.push(`<button class="action-btn btn-fold" onclick="playerAction('fold')">Fold</button>`);
  if(toCall===0) btns.push(`<button class="action-btn btn-check" onclick="playerAction('check')">Check</button>`);
  if(toCall>0) btns.push(`<button class="action-btn btn-call" onclick="playerAction('call')">Call ${toCall}</button>`);
  btns.push(`<button class="action-btn btn-raise" onclick="playerAction('raise',parseInt(document.getElementById('bet-slider').value))">Raise</button>`);
  btns.push(`<button class="action-btn btn-allin" onclick="playerAction('allin')">All In ${p.chips}</button>`);
  document.getElementById('action-btns').innerHTML=btns.join('');
}

// ---- ONLINE ----
function setupOnline(name, code, startChips){
  socket=io();
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='block';
  document.getElementById('online-info').innerHTML=`
    <div class="room-code-display" style="margin-bottom:20px">
      <div class="room-code-label">ROOM CODE</div>
      <div class="room-code-value">${code}</div>
      <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${code}').then(()=>window.GameHub.showToast('Copied!'))">Copy</button>
    </div><p style="text-align:center;color:var(--text-secondary)">Waiting for players… (${numPlayers} needed)</p>`;
  socket.emit('join-room',{code,playerName:name});
  socket.on('room-updated',room=>{
    const connected=room.players.filter(p=>p.id);
    if(connected.length>=numPlayers){
      document.getElementById('online-info').style.display='none';
      playerNames=connected.map(p=>p.name);
      players=playerNames.map((n,i)=>({name:n,chips:startChips,bet:0,folded:false,allIn:false,hand:[],isAI:false}));
      myIndex=connected.findIndex(p=>p.name===name);
      dealerIdx=0; startHand();
    }
  });
  socket.on('poker-state',({action,amount,state,playerId})=>{
    Object.assign({players,pot,communityCards,stage,currentBet,activePlayer},state);
    renderTable();
  });
  socket.on('player-left',()=>window.GameHub.showToast('A player left the game'));
}

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
