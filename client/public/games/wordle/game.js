// WORDLE — Full game logic with word list, stats, persistence

const WORDS = [
  'ABOUT','ABOVE','ABUSE','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN','AGENT',
  'AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIKE','ALIVE','ALLEY','ALLOW','ALONE',
  'ALONG','ALOUD','ALTER','ANGEL','ANGER','ANGLE','ANGRY','ANIME','ANNEX','APART',
  'APPLE','APPLY','ARENA','ARGUE','ARISE','ARRAY','ASIDE','ASKED','ATLAS','ATTIC',
  'AUDIO','AVOID','AWARD','AWARE','AWFUL','BASIC','BATCH','BEACH','BEARD','BEAST',
  'BEGIN','BEING','BELOW','BENCH','BIRTH','BLACK','BLADE','BLAME','BLANK','BLAST',
  'BLAZE','BLEED','BLEND','BLESS','BLOCK','BLOOD','BLOOM','BLOWN','BLUES','BLUNT',
  'BOARD','BOOST','BOOTH','BOUND','BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED',
  'BRICK','BRIDE','BRIEF','BRING','BROAD','BROKE','BROOK','BROWN','BRUSH','BUILD',
  'BUILT','BURST','BUYER','CABIN','CAMEL','CARRY','CAUSE','CHAIN','CHAIR','CHAOS',
  'CHARM','CHART','CHASE','CHEAP','CHECK','CHEEK','CHEER','CHESS','CHEST','CHIEF',
  'CHILD','CHINA','CHIPS','CHOIR','CHOSE','CIVIL','CLAIM','CLASS','CLEAN','CLEAR',
  'CLERK','CLICK','CLIFF','CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOUD','CLOWN',
  'CLUMP','COACH','COAST','COLOR','COMMA','CORAL','COULD','COUNT','COURT','COVER',
  'CRACK','CRAFT','CRAMP','CRANE','CRASH','CRAZY','CREAM','CREEK','CRIME','CRISP',
  'CROSS','CROWD','CRUEL','CRUSH','CURVE','CYCLE','DAILY','DANCE','DEALS','DEATH',
  'DEBUT','DELAY','DENSE','DEPOT','DEPTH','DERBY','DEVIL','DIGIT','DINGO','DISCO',
  'DODGE','DOING','DONOR','DOUBT','DOUGH','DOWEL','DRAFT','DRAIN','DRAMA','DRANK',
  'DRAWN','DREAM','DRESS','DRIED','DRIFT','DRINK','DRIVE','DROVE','DROWN','DRUMS',
  'DRYER','DUCHY','EARLY','EARTH','EATEN','EIGHT','ELITE','EMAIL','EMPTY','ENDED',
  'ENJOY','ENTER','ENTRY','EQUAL','ERROR','ESSAY','EVERY','EXACT','EXTRA','FABLE',
  'FACED','FAITH','FALSE','FANCY','FATAL','FAULT','FEAST','FENCE','FEVER','FIBRE',
  'FIELD','FIFTH','FIFTY','FIGHT','FINAL','FIRST','FIXED','FLAME','FLASH','FLEET',
  'FLESH','FLOAT','FLOOD','FLOOR','FLOUR','FOCUS','FORCE','FORGE','FORTH','FORUM',
  'FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FROZE','FRUIT','FULLY',
  'FUNNY','GIANT','GIVEN','GLASS','GLAZE','GLOBE','GLOOM','GLORY','GLOSS','GLOVE',
  'GOING','GRACE','GRADE','GRAIN','GRAND','GRANT','GRASP','GRASS','GRAVE','GRAVY',
  'GREAT','GREEN','GREET','GRIEF','GRIND','GROAN','GROPE','GROSS','GROUP','GROVE',
  'GROWN','GUARD','GUESS','GUIDE','GUILE','GUILD','GUILT','GUISE','HAPPY','HARSH',
  'HEART','HEAVY','HENCE','HERBS','HINGE','HIPPO','HOBBY','HONOR','HORSE','HOTEL',
  'HOUSE','HUMAN','HUMOR','HURRY','HYENA','IDEAL','IGLOO','IMAGE','IMPLY','INBOX',
  'INDEX','INNER','INPUT','INTER','INTRO','IRONY','IVORY','ISSUE','JAZZY','JEWEL',
  'JOKER','JUDGE','JUICE','JUMBO','KAYAK','KINKY','KNACK','KNEEL','KNIFE','KNOCK',
  'KNOWN','LABEL','LANCE','LASER','LATCH','LAUGH','LAYER','LEAFY','LEARN','LEASE',
  'LEAST','LEGAL','LEMON','LEVEL','LIGHT','LIMIT','LIVER','LOCAL','LODGE','LOGIC',
  'LOOSE','LOVER','LOWER','LOYAL','LUCKY','LUNAR','LYRIC','MAGIC','MAJOR','MAKER',
  'MANOR','MAPLE','MARCH','MARRY','MATCH','MAYBE','MAYOR','MEALS','MEANT','MEDIA',
  'MERCY','METAL','MIGHT','MINOR','MINUS','MITRE','MIXER','MODEL','MONEY','MONTH',
  'MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVIE','MUSIC','NAIVE','NEVER','NIGHT',
  'NICHE','NOBLE','NOISE','NOVEL','NURSE','OCEAN','OFFER','OFTEN','OLDER','OLIVE',
  'ONSET','OPERA','ORDER','OTHER','OUTER','OWNED','OWNER','PAINT','PANIC','PAPER',
  'PARTY','PASTA','PATCH','PAUSE','PEACE','PEBBLE','PENAL','PENNY','PHASE','PHONE',
  'PHOTO','PIANO','PIECE','PILOT','PIXEL','PLACE','PLAIN','PLANE','PLANT','PLATE',
  'PLAZA','PLEAD','PLUME','POEM','POINT','POKER','POLAR','POWER','PRESS','PRICE',
  'PRIDE','PRIME','PRINT','PRIOR','PROBE','PRONE','PROOF','PROSE','PROUD','PROVE',
  'PROXY','PSALM','PUPIL','PURSE','QUEEN','QUERY','QUEUE','QUICK','QUIET','QUOTA',
  'QUOTE','RADAR','RADIO','RAISE','RANGE','RAPID','RATIO','REACH','REALM','REBEL',
  'RECAP','REFER','REIGN','RELAX','RELAY','REMIX','REPAY','RESET','RIDER','RIDGE',
  'RIFLE','RIGHT','RIGID','RISKY','RIVAL','RIVER','ROBIN','ROBOT','ROCKY','ROUGE',
  'ROUGH','ROUND','ROUTE','ROYAL','RULER','RURAL','SADLY','SAINT','SALAD','SALON',
  'SAUCE','SCALE','SCENE','SCOPE','SCORE','SCOUT','SEIZE','SENSE','SERVE','SEVEN',
  'SHADE','SHAKE','SHALL','SHAME','SHAPE','SHARE','SHARK','SHARP','SHELF','SHELL',
  'SHIFT','SHINE','SHIRT','SHOCK','SHOOT','SHORE','SHORT','SHOUT','SIGHT','SINCE',
  'SIXTH','SIXTY','SIZED','SKILL','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL',
  'SMILE','SMOKE','SNAKE','SOLAR','SOLID','SOLVE','SONIC','SOUND','SOUTH','SPACE',
  'SPARE','SPARK','SPEAK','SPEED','SPELL','SPEND','SPICE','SPILL','SPINE','SPOKE',
  'SPORT','SQUAD','STAFF','STAGE','STAIN','STAIR','STAKE','STALE','STALL','STAMP',
  'STAND','STARK','STARS','START','STATE','STEAL','STEAM','STEEL','STEEP','STEER',
  'STERN','STICK','STILL','STOCK','STONE','STOOD','STORE','STORM','STORY','STRAP',
  'STRAW','STRIP','STUDY','STYLE','SUGAR','SUITE','SUNNY','SUPER','SURGE','SWAMP',
  'SWEAR','SWEAT','SWEEP','SWEET','SWIFT','SWING','SWORD','SWORE','TABLE','TASTE',
  'TEACH','TEETH','TEMPO','TENSE','TENTH','TERMS','THEIR','THEME','THERE','THESE',
  'THICK','THING','THINK','THIRD','THORN','THOSE','THREE','THREW','THROW','THUMB',
  'TIMER','TIRED','TITLE','TODAY','TOKEN','TOPIC','TOTAL','TOUCH','TOUGH','TOWEL',
  'TOWER','TRACE','TRACK','TRADE','TRAIN','TRAIT','TRASH','TREAD','TREAT','TREND',
  'TRIAL','TRICK','TRIED','TROOP','TRUCK','TRULY','TRUNK','TRUTH','TUNED','TUMOR',
  'TWIST','ULTRA','UNIFY','UNION','UNITY','UNTIL','UPPER','UPSET','URBAN','USUAL',
  'VALID','VALUE','VALVE','VIDEO','VIGIL','VIRAL','VISIT','VITAL','VIVID','VOICE',
  'WASTE','WATCH','WATER','WEARY','WEAVE','WEDGE','WEIRD','WHALE','WHEEL','WHERE',
  'WHICH','WHILE','WHITE','WHOLE','WHOSE','WIDER','WITCH','WOMAN','WOMEN','WORLD',
  'WORRY','WORSE','WORST','WORTH','WOULD','WRIST','WRONG','YACHT','YEARN','YIELD',
  'YOUNG','YOUTH','ZEBRA','ZONAL'
];

let target, currentRow, currentCol, grid, gameOver, keyState, stats;

document.addEventListener('DOMContentLoaded', () => {
  stats = window.GameHub.loadState('wordle_stats') || {played:0,wins:0,streak:0};
  updateStats();
  const saved = window.GameHub.loadState('wordle_game');
  if (saved && !saved.gameOver) {
    restoreGame(saved); return;
  }
  newGame();
});

function newGame() {
  target = WORDS[Math.floor(Math.random()*WORDS.length)];
  currentRow=0; currentCol=0; gameOver=false;
  grid = Array.from({length:6},()=>Array(5).fill(''));
  keyState = {};
  document.getElementById('msg').textContent='';
  document.getElementById('winner-overlay').style.display='none';
  renderBoard(); renderKeyboard();
  saveGame();
}

function renderBoard() {
  const el=document.getElementById('board');
  el.innerHTML=Array.from({length:6},(_,r)=>`
    <div class="wordle-row" id="row-${r}">
      ${Array.from({length:5},(_,c)=>`<div class="wordle-tile" id="tile-${r}-${c}">${grid[r][c]}</div>`).join('')}
    </div>`).join('');
}

function renderKeyboard() {
  const rows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','⌫']];
  document.getElementById('keyboard').innerHTML=rows.map(row=>`
    <div class="kb-row">
      ${row.map(k=>`<button class="kb-key${k.length>1?' wide':''} ${keyState[k]||''}" id="kb-${k}" onclick="handleKey('${k}')">${k}</button>`).join('')}
    </div>`).join('');
}

function handleKey(key) {
  if (gameOver) return;
  if (key==='⌫'||key==='BACKSPACE') {
    if (currentCol>0) { currentCol--; grid[currentRow][currentCol]=''; updateTile(currentRow,currentCol,''); }
  } else if (key==='ENTER') {
    submitGuess();
  } else if (/^[A-Z]$/.test(key) && currentCol<5) {
    grid[currentRow][currentCol]=key;
    updateTile(currentRow,currentCol,key,true);
    currentCol++;
  }
  saveGame();
}

function updateTile(r,c,letter,pop=false) {
  const tile=document.getElementById(`tile-${r}-${c}`);
  if(!tile) return;
  tile.textContent=letter;
  if(pop&&letter) tile.classList.add('pop');
  else tile.classList.remove('pop');
  tile.classList.toggle('filled',!!letter);
}

function submitGuess() {
  if (currentCol<5) { shakeRow(currentRow); showMsg('Not enough letters'); return; }
  const guess=grid[currentRow].join('');
  if (!WORDS.includes(guess)) { shakeRow(currentRow); showMsg('Not in word list'); return; }

  const result=evaluateGuess(guess);
  revealRow(currentRow, result, () => {
    result.forEach((state,i)=>updateKeyState(grid[currentRow][i],state));
    renderKeyboard();
    if (guess===target) {
      gameOver=true;
      stats.played++; stats.wins++; stats.streak++;
      window.GameHub.saveState('wordle_stats',stats);
      updateStats();
      setTimeout(()=>showMsg('🎉 Brilliant!'),300);
      setTimeout(()=>{ document.getElementById('winner-title').textContent='You Solved It! 🎉'; document.getElementById('winner-overlay').style.display='flex'; },1200);
    } else if (currentRow===5) {
      gameOver=true;
      stats.played++; stats.streak=0;
      window.GameHub.saveState('wordle_stats',stats);
      updateStats();
      setTimeout(()=>showMsg(`The word was: ${target}`,4000),300);
    }
    currentRow++; currentCol=0;
    saveGame();
  });
}

function evaluateGuess(guess) {
  const result=Array(5).fill('absent');
  const targetArr=[...target];
  const guessArr=[...guess];
  // First pass: correct
  guessArr.forEach((l,i)=>{ if(l===targetArr[i]){ result[i]='correct'; targetArr[i]=null; guessArr[i]=null; } });
  // Second pass: present
  guessArr.forEach((l,i)=>{ if(!l) return; const j=targetArr.indexOf(l); if(j>-1){ result[i]='present'; targetArr[j]=null; } });
  return result;
}

function revealRow(row, result, callback) {
  result.forEach((state,i)=>{
    setTimeout(()=>{
      const tile=document.getElementById(`tile-${row}-${i}`);
      tile.style.transition='transform 0.25s';
      tile.style.transitionDelay=`${i*0.1}s`;
      setTimeout(()=>tile.classList.add(state),i*100+50);
    },0);
  });
  setTimeout(callback, 600);
}

function shakeRow(row) {
  const el=document.getElementById(`row-${row}`);
  el.querySelectorAll('.wordle-tile').forEach(t=>{ t.classList.add('shake'); setTimeout(()=>t.classList.remove('shake'),400); });
}

function updateKeyState(key, state) {
  const priority={correct:3,present:2,absent:1};
  if (!keyState[key]||priority[state]>(priority[keyState[key]]||0)) keyState[key]=state;
}

function showMsg(msg, duration=1800) {
  const el=document.getElementById('msg');
  el.textContent=msg;
  if(duration>0) setTimeout(()=>{ if(el.textContent===msg) el.textContent=''; },duration);
}

function updateStats() {
  document.getElementById('stat-played').textContent=stats.played;
  document.getElementById('stat-wins').textContent=stats.wins;
  document.getElementById('stat-streak').textContent=stats.streak;
}

function saveGame() {
  window.GameHub.saveState('wordle_game',{target,currentRow,currentCol,grid,gameOver,keyState});
}

function restoreGame(s) {
  target=s.target; currentRow=s.currentRow; currentCol=s.currentCol;
  grid=s.grid; gameOver=s.gameOver; keyState=s.keyState||{};
  renderBoard();
  // Re-apply colors to revealed rows
  for(let r=0;r<currentRow;r++) {
    const result=evaluateGuess(grid[r].join(''));
    result.forEach((state,c)=>{ document.getElementById(`tile-${r}-${c}`)?.classList.add(state); });
  }
  renderKeyboard();
}

document.addEventListener('keydown', e=>{
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key==='Enter') handleKey('ENTER');
  else if(e.key==='Backspace') handleKey('⌫');
  else if(/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
