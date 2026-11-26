const MAX = 10;
const $ = id => document.getElementById(id);
const board = $('board'), fb = $('fb'), arrow = $('arrow'), fbT = $('fbT'), fbS = $('fbS');
const loEl = $('lo'), hiEl = $('hi'), hist = $('hist'), triesEl = $('tries'), bestEl = $('best'), reset = $('reset'), fx = $('fx');
let target, tries, over, lo, hi, missed, tiles = [];

const getBest = () => { try { return +localStorage.getItem('guess-best') || 0; } catch { return 0; } };
const setBest = v => { try { localStorage.setItem('guess-best', v); } catch {} };

function paint() {
  tiles.forEach((t, i) => {
    const v = i + 1;
    t.classList.toggle('miss', missed.has(v));
    t.classList.toggle('out', !missed.has(v) && (v < lo || v > hi));
    t.classList.toggle('live', !over && v >= lo && v <= hi && !missed.has(v));
  });
  loEl.textContent = lo; hiEl.textContent = hi;
}

function setFb(cls, a, title, sub) {
  fb.className = 'fb ' + cls;
  arrow.textContent = a; fbT.textContent = title; fbS.textContent = sub;
}

function newGame() {
  target = Math.floor(Math.random() * MAX) + 1;
  tries = 0; over = false; lo = 1; hi = MAX; missed = new Set();
  triesEl.textContent = 0; bestEl.textContent = getBest() || '-';
  hist.innerHTML = '';
  setFb('', '?', 'Your move', `Pick any number from 1 to ${MAX}.`);
  board.innerHTML = ''; tiles = [];
  for (let n = 1; n <= MAX; n++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = n;
    b.setAttribute('aria-label', 'Guess ' + n);
    b.addEventListener('click', () => guess(n));
    board.appendChild(b); tiles.push(b);
  }
  reset.textContent = 'New game';
  paint();
}

function addHist(n, sym, cls) {
  const li = document.createElement('li');
  li.className = cls; li.textContent = `${n} ${sym}`;
  hist.appendChild(li);
}

function guess(n) {
  if (over || missed.has(n) || n < lo || n > hi) return;
  tries++; triesEl.textContent = tries;
  if (n === target) {
    over = true; lo = hi = n;
    const rating = tries <= 2 ? 'Lucky!' : tries <= 3 ? 'Great job!' : 'Nice one!';
    setFb('win', '\u2713', `You got it! It was ${n}.`, `${tries} ${tries === 1 ? 'try' : 'tries'}. ${rating}`);
    addHist(n, '\u2713', 'ok');
    const best = getBest();
    if (!best || tries < best) { setBest(tries); bestEl.textContent = tries; }
    reset.textContent = 'Play again';
    paint(); tiles[n - 1].classList.add('hit'); confetti(); reset.focus();
    return;
  }
  missed.add(n);
  if (n < target) {
    lo = n + 1;
    setFb('up', '\u25B2', 'Go higher', `${n} is too low. Try a bigger number.`);
    addHist(n, '\u25B2 too low', 'up');
  } else {
    hi = n - 1;
    setFb('down', '\u25BC', 'Go lower', `${n} is too high. Try a smaller number.`);
    addHist(n, '\u25BC too high', 'down');
  }
  if (lo === hi) fbS.textContent += ' Only one number is left!';
  paint();
}

function confetti() {
  const colors = ['#ffd23f', '#35d6a0', '#ff7ab6', '#2336ff', '#14123a'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 200;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    s.style.background = colors[i % colors.length];
    fx.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

reset.addEventListener('click', newGame);
newGame();
