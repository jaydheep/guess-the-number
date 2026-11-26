const MAX = 10;
const $ = id => document.getElementById(id);
const board = $('board'), hint = $('hint'), arrow = $('arrow'), hintText = $('hintText');
const secretEl = $('secret'), rangeEl = $('range'), histEl = $('history');
const triesEl = $('tries'), bestEl = $('best'), resetBtn = $('reset');
let target, tries, over, lo, hi;

const getBest = () => { try { return +localStorage.getItem('guess-best') || 0; } catch { return 0; } };
const setBest = v => { try { localStorage.setItem('guess-best', v); } catch {} };

function setHint(kind, a, text) {
  hint.className = 'hint ' + kind;
  arrow.textContent = a;
  hintText.textContent = text;
}

function showRange() {
  rangeEl.innerHTML = lo === hi
    ? `Only one number is left: <b>${lo}</b>`
    : `The secret number is between <b>${lo}</b> and <b>${hi}</b>`;
}

function newGame() {
  target = Math.floor(Math.random() * MAX) + 1;
  tries = 0; over = false; lo = 1; hi = MAX;
  triesEl.textContent = 0;
  bestEl.textContent = getBest() || '-';
  secretEl.textContent = '?';
  secretEl.classList.remove('win');
  histEl.innerHTML = '';
  setHint('idle', '?', 'Tap any number to make your first guess.');
  showRange();
  board.innerHTML = '';
  for (let n = 1; n <= MAX; n++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = n;
    b.setAttribute('aria-label', 'Guess ' + n);
    b.addEventListener('click', () => guess(n, b));
    board.appendChild(b);
  }
}

function addHistory(n, kind, label) {
  const li = document.createElement('li');
  li.className = kind;
  li.innerHTML = `<b>${n}</b> ${label}`;
  histEl.appendChild(li);
}

function guess(n, tile) {
  if (over || tile.classList.contains('out')) return;
  tries++; triesEl.textContent = tries;

  if (n === target) {
    over = true;
    tile.classList.add('hit');
    board.querySelectorAll('.tile:not(.hit)').forEach(t => t.classList.add('out'));
    secretEl.textContent = target;
    secretEl.classList.add('win');
    rangeEl.textContent = `You found it in ${tries} ${tries === 1 ? 'try' : 'tries'}!`;
    setHint('win', '✓', `Correct! The secret number was ${target}.`);
    addHistory(n, 'win', 'correct');
    const best = getBest();
    if (!best || tries < best) { setBest(tries); bestEl.textContent = tries; }
    resetBtn.textContent = 'Play again';
    resetBtn.focus();
    return;
  }

  const tooLow = n < target;
  if (tooLow) lo = Math.max(lo, n + 1); else hi = Math.min(hi, n - 1);
  board.querySelectorAll('.tile').forEach(t => {
    const v = +t.textContent;
    if (v < lo || v > hi) t.classList.add('out');
  });
  showRange();
  addHistory(n, tooLow ? 'low' : 'high', tooLow ? 'too low' : 'too high');
  setHint(
    tooLow ? 'low' : 'high',
    tooLow ? '▲' : '▼',
    tooLow
      ? `${n} is too low. The secret number is higher, so try a bigger number.`
      : `${n} is too high. The secret number is lower, so try a smaller number.`
  );
}

resetBtn.addEventListener('click', () => { resetBtn.textContent = 'New game'; newGame(); });
newGame();
