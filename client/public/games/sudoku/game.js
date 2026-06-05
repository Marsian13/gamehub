// SUDOKU — Generator, Solver, Notes, Timer, Undo
let puzzle, solution, userBoard, notes, selected, mistakes, notesMode, history, timerInterval, startTime;

document.addEventListener('DOMContentLoaded', () => {
  const saved = window.GameHub.loadState('sudoku');
  if (saved) {
    const resume = confirm('Resume previous puzzle?');
    if (resume) { restoreState(saved); return; }
  }
  newGame();
});

function newGame() {
  const diff = document.getElementById('difficulty').value;
  solution = generateSolvedBoard();
  puzzle = createPuzzle(solution, diff);
  userBoard = puzzle.map(v => v); // copy
  notes = Array(81).fill(null).map(() => new Set());
  selected = null; mistakes = 0; notesMode = false;
  history = [];
  document.getElementById('mistake-count').textContent = 0;
  document.getElementById('winner-overlay').style.display = 'none';
  document.getElementById('notes-mode').checked = false;
  clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  renderBoard();
  renderNumpad();
  saveState();
}

function generateSolvedBoard() {
  const board = Array(81).fill(0);
  solveSudokuBoard(board);
  return board;
}

function solveSudokuBoard(board) {
  const empty = board.indexOf(0);
  if (empty === -1) return true;
  const row = Math.floor(empty / 9), col = empty % 9;
  const nums = shuffle([1,2,3,4,5,6,7,8,9]);
  for (const n of nums) {
    if (isValid(board, row, col, n)) {
      board[empty] = n;
      if (solveSudokuBoard(board)) return true;
      board[empty] = 0;
    }
  }
  return false;
}

function createPuzzle(sol, diff) {
  const puzzle = [...sol];
  const removals = diff==='easy'?36:diff==='medium'?46:54;
  const indices = shuffle([...Array(81).keys()]);
  let removed = 0;
  for (const i of indices) {
    if (removed >= removals) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    // Verify unique solution (quick check)
    const test = [...puzzle];
    if (countSolutions(test) === 1) removed++;
    else puzzle[i] = backup;
  }
  return puzzle;
}

function countSolutions(board, count = {n:0}) {
  const empty = board.indexOf(0);
  if (empty === -1) { count.n++; return count.n; }
  const row = Math.floor(empty/9), col = empty%9;
  for (let n=1;n<=9;n++) {
    if (isValid(board,row,col,n)) {
      board[empty]=n;
      countSolutions(board, count);
      board[empty]=0;
      if (count.n>1) return count.n;
    }
  }
  return count.n;
}

function isValid(board, row, col, n) {
  const box = Math.floor(row/3)*3+Math.floor(col/3);
  for (let i=0;i<9;i++) {
    if (board[row*9+i]===n) return false;
    if (board[i*9+col]===n) return false;
    const br=Math.floor(box/3)*3+Math.floor(i/3);
    const bc=(box%3)*3+(i%3);
    if (board[br*9+bc]===n) return false;
  }
  return true;
}

function shuffle(arr) {
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

function renderBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let i=0;i<81;i++) {
    const row=Math.floor(i/9), col=i%9;
    const cell = document.createElement('div');
    cell.className = 'sdk-cell';
    cell.dataset.i = i; cell.dataset.row = row; cell.dataset.col = col;
    cell.onclick = () => selectCell(i);

    const isGiven = puzzle[i]!==0;
    const userVal = userBoard[i];
    const isSelected = selected===i;
    const selRow = selected!==null?Math.floor(selected/9):-1;
    const selCol = selected!==null?selected%9:-1;
    const isHighlighted = selected!==null&&(row===selRow||col===selCol||
      (Math.floor(row/3)===Math.floor(selRow/3)&&Math.floor(col/3)===Math.floor(selCol/3)));

    if (isSelected) cell.classList.add('selected');
    else if (isHighlighted) cell.classList.add('highlighted');

    if (isGiven) {
      cell.classList.add('given');
      cell.textContent = puzzle[i];
    } else if (userVal!==0) {
      const isError = userVal!==solution[i];
      cell.classList.add(isError?'error':'user');
      cell.textContent = userVal;
    } else if (notes[i].size>0) {
      cell.classList.add('notes');
      for(let n=1;n<=9;n++) {
        const s=document.createElement('span');
        s.textContent=notes[i].has(n)?n:'';
        cell.appendChild(s);
      }
    }
    el.appendChild(cell);
  }
}

function renderNumpad() {
  const el = document.getElementById('numpad');
  el.innerHTML = '';
  for(let n=1;n<=9;n++) {
    const btn = document.createElement('button');
    btn.className='num-btn'; btn.textContent=n;
    btn.onclick=()=>enterNumber(n);
    el.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.className='num-btn erase'; erase.textContent='⌫';
  erase.onclick=()=>enterNumber(0);
  el.appendChild(erase);
}

function selectCell(i) {
  selected = i; renderBoard();
}

function enterNumber(n) {
  if (selected===null) return;
  if (puzzle[selected]!==0) return; // given cell
  history.push({i:selected, prev:userBoard[selected], prevNotes:[...notes[selected]]});

  if (notesMode && n!==0) {
    if (notes[selected].has(n)) notes[selected].delete(n);
    else notes[selected].add(n);
  } else {
    notes[selected].clear();
    const prev = userBoard[selected];
    userBoard[selected] = n;
    if (n!==0 && n!==solution[selected]) {
      mistakes++;
      document.getElementById('mistake-count').textContent=mistakes;
      if (mistakes>=3) { setTimeout(()=>{ alert('3 mistakes! Game over.'); newGame(); },300); }
    }
    // Auto-clear notes in same row/col/box
    if (n!==0) clearNotesFor(selected, n);
  }
  renderBoard();
  checkComplete();
  saveState();
}

function clearNotesFor(idx, n) {
  const row=Math.floor(idx/9), col=idx%9;
  for(let i=0;i<81;i++) {
    const r=Math.floor(i/9),c=i%9;
    if(r===row||c===col||(Math.floor(r/3)===Math.floor(row/3)&&Math.floor(c/3)===Math.floor(col/3)))
      notes[i].delete(n);
  }
}

function undoSudoku() {
  if (!history.length) return;
  const {i, prev, prevNotes} = history.pop();
  userBoard[i] = prev;
  notes[i] = new Set(prevNotes);
  renderBoard();
}

function toggleNotes() {
  notesMode = document.getElementById('notes-mode').checked;
}

function checkComplete() {
  if (userBoard.every((v,i)=>v===solution[i])) {
    clearInterval(timerInterval);
    const elapsed = Math.floor((Date.now()-startTime)/1000);
    const m=Math.floor(elapsed/60), s=elapsed%60;
    document.getElementById('winner-title').textContent='Puzzle Solved! 🧠';
    document.getElementById('winner-sub').textContent=`Time: ${m}:${s.toString().padStart(2,'0')} — Mistakes: ${mistakes}`;
    document.getElementById('winner-overlay').style.display='flex';
    window.GameHub.clearState('sudoku');
  }
}

function solveSudoku() {
  if (!confirm('Show solution?')) return;
  userBoard = [...solution];
  renderBoard();
  clearInterval(timerInterval);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now()-startTime)/1000);
  const m=Math.floor(elapsed/60), s=elapsed%60;
  document.getElementById('timer').textContent=`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function saveState() {
  window.GameHub.saveState('sudoku',{puzzle,solution,userBoard,notes:notes.map(s=>[...s]),mistakes,startTime});
}

function restoreState(s) {
  puzzle=s.puzzle; solution=s.solution; userBoard=s.userBoard;
  notes=s.notes.map(a=>new Set(a)); mistakes=s.mistakes; selected=null;
  history=[]; notesMode=false;
  document.getElementById('mistake-count').textContent=mistakes;
  const elapsed=Date.now()-s.startTime;
  startTime=Date.now()-elapsed;
  timerInterval=setInterval(updateTimer,1000);
  renderBoard(); renderNumpad();
}

document.addEventListener('keydown', e=>{
  if(e.key>='1'&&e.key<='9') enterNumber(parseInt(e.key));
  if(e.key==='Backspace'||e.key==='Delete'||e.key==='0') enterNumber(0);
  if(selected!==null) {
    const r=Math.floor(selected/9),c=selected%9;
    if(e.key==='ArrowUp'&&r>0) selectCell(selected-9);
    if(e.key==='ArrowDown'&&r<8) selectCell(selected+9);
    if(e.key==='ArrowLeft'&&c>0) selectCell(selected-1);
    if(e.key==='ArrowRight'&&c<8) selectCell(selected+1);
  }
});

function showInfo(){document.getElementById('info-panel').style.display='flex';}
function hideInfo(){document.getElementById('info-panel').style.display='none';}
