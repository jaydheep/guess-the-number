const MAX = 10;
const board = document.getElementById('board');
const msg = document.getElementById('msg');
const triesEl = document.getElementById('tries');
const bestEl = document.getElementById('best');
const resetBtn = document.getElementById('reset');
let target, tries, over;

const getBest = () => { try { return +localStorage.getItem('guess-best') || 0; } catch { return 0; } };
const setBest = v => { try { localStorage.setItem('guess-best', v); } catch {} };

function newGame() {
  target = Math.floor(Math.random() * MAX) + 1;
  tries = 0; over = false;
  triesEl.textContent = 0;
  bestEl.textContent = getBest() || '-';
  msg.textContent = 'Pick a number to start.';
  board.innerHTML = '';
  for (let n = 1; n <= MAX; n++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = n;
    b.addEventListener('click', () => guess(n, b));
    board.appendChild(b);
  }
}

function guess(n, tile) {
  if (over || tile.classList.contains('out')) return;
  tries++; triesEl.textContent = tries;
  if (n === target) {
    over = true;
    tile.classList.add('hit');
    board.querySelectorAll('.tile:not(.hit)').forEach(t => t.classList.add('out'));
    msg.textContent = `Got it! ${target} in ${tries} ${tries === 1 ? 'try' : 'tries'}.`;
    const best = getBest();
    if (!best || tries < best) { setBest(tries); bestEl.textContent = tries; }
    resetBtn.textContent = 'Play again'; resetBtn.focus();
    return;
  }
  const low = n < target;
  board.querySelectorAll('.tile').forEach(t => {
    const v = +t.textContent;
    if (low ? v <= n : v >= n) t.classList.add('out');
  });
  const close = Math.abs(n - target) === 1;
  msg.textContent = `${n} is too ${low ? 'low' : 'high'}${close ? ', but very close' : ''}. Try again.`;
}

resetBtn.addEventListener('click', () => { resetBtn.textContent = 'New game'; newGame(); });
newGame();
