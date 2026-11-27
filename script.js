const $ = id => document.getElementById(id);
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const MODES = [
  { id: 'classic', name: 'Classic', n: 10, tries: 0, badge: '1–10', desc: 'No try limit' },
  { id: 'medium', name: 'Medium', n: 50, tries: 7, badge: '1–50', desc: '7 tries' },
  { id: 'hard', name: 'Hard', n: 100, tries: 8, badge: '1–100', desc: '8 tries' },
  { id: 'insane', name: 'Insane', n: 1000, tries: 11, badge: '1–1000', desc: '11 tries' },
  { id: 'daily', name: 'Daily Challenge', n: 100, tries: 8, badge: 'DAILY', desc: 'Same number for everyone today' },
  { id: 'ai', name: 'AI guesses', n: 100, tries: 0, badge: 'AI', desc: 'You think of a number, the AI finds it' }
];
const ST = Object.assign({ games: 0, wins: 0, streak: 0, best: 0, score: 0, stars: 0, bt: {}, daily: {} }, read('gtn2-stats', {}));
const SET = Object.assign({ sound: true, haptic: true, meter: true, motion: true, theme: 'indigo' }, read('gtn2-set', {}));
const saveST = () => write('gtn2-stats', ST), saveSET = () => write('gtn2-set', SET);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const isPrime = x => { if (x < 2) return false; for (let i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; };
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

let ac = null;
function tone(f, d = .1, type = 'sine', v = .06, at = 0) {
  if (!SET.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch {}
}
const vib = p => { if (SET.haptic && navigator.vibrate) { try { navigator.vibrate(p); } catch {} } };
const applyTheme = () => { document.body.dataset.theme = SET.theme; document.body.classList.toggle('calm', !SET.motion); };
const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

function show(id) {
  ['home', 'play', 'ai'].forEach(s => $(s).hidden = s !== id);
  if (id === 'home') renderHome();
  window.scrollTo(0, 0);
}

function renderHome() {
  $('sPlayed').textContent = ST.games;
  $('sWin').textContent = ST.games ? Math.round(ST.wins / ST.games * 100) + '%' : '-';
  $('sStreak').textContent = ST.streak;
  $('sStars').textContent = ST.stars;
  const box = $('modes'); box.innerHTML = '';
  MODES.forEach(m => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mode m-' + m.id;
    let meta;
    if (m.id === 'daily') { const d = ST.daily[today()]; meta = d ? (d.won ? `Done today · ${d.tries} tries` : 'Done today · missed') : 'Play today\u2019s number'; }
    else if (m.id === 'ai') meta = 'Reverse mode';
    else meta = ST.bt[m.id] ? `Best: ${ST.bt[m.id]} tries` : 'No score yet';
    b.innerHTML = `<span class="badge">${m.badge}</span><b>${m.name}</b><small>${m.desc}</small><em>${meta}</em>`;
    b.addEventListener('click', () => { tone(520, .08, 'triangle'); m.id === 'ai' ? startAI() : startGame(m.id); });
    box.appendChild(b);
  });
}

/* ---------- You guess ---------- */
let g = null;
const HINTS = [t => `It is ${t % 2 ? 'odd' : 'even'}.`, t => `It ${t % 3 === 0 ? 'is' : 'is not'} divisible by 3.`, t => `It ${isPrime(t) ? 'is' : 'is not'} a prime number.`];

function startGame(id) {
  const m = MODES.find(x => x.id === id);
  if (id === 'daily' && ST.daily[today()]) { showResult(ST.daily[today()].res); return; }
  const rng = id === 'daily' ? seeded('gtn-' + today()) : Math.random;
  g = { m, n: m.n, lo: 1, hi: m.n, target: 1 + Math.floor(rng() * m.n), tries: 0, max: m.tries, hints: 0, guesses: [], over: false, cur: Math.round((1 + m.n) / 2) };
  $('pTitle').textContent = m.name;
  $('hintBox').innerHTML = ''; $('hist').innerHTML = '';
  $('meter').hidden = !SET.meter; $('mneedle').style.left = '0%';
  setFb('', '?', 'Your move', `Find the secret number from 1 to ${m.n}.`);
  $('mlabel').textContent = 'Make your first guess'; $('mlabel').style.color = '';
  $('btnHint').textContent = 'Hint (3 left)'; $('btnHint').disabled = false;
  const tiles = m.n <= 10;
  $('pickTiles').hidden = !tiles; $('pickDial').hidden = tiles;
  if (tiles) buildTiles(); else buildDial();
  renderRange(); renderPips(); show('play');
}

function setFb(cls, a, t, s) {
  $('fb').className = 'fb ' + cls;
  $('arrow').textContent = a; $('fbT').textContent = t; $('fbS').textContent = s;
}
function buildTiles() {
  const box = $('pickTiles'); box.innerHTML = '';
  for (let v = 1; v <= g.n; v++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.textContent = v;
    b.setAttribute('aria-label', 'Guess ' + v);
    b.addEventListener('click', () => submit(v)); box.appendChild(b);
  }
  paintTiles();
}
function paintTiles() {
  [...$('pickTiles').children].forEach((t, i) => {
    const v = i + 1, miss = g.guesses.some(x => x.v === v);
    t.classList.toggle('miss', miss);
    t.classList.toggle('out', !miss && (v < g.lo || v > g.hi));
    t.classList.toggle('hit', g.over && v === g.target);
  });
}
function buildDial() {
  const steps = g.n >= 1000 ? [-100, -10, -1, 1, 10, 100] : [-10, -1, 1, 10];
  const box = $('steps'); box.innerHTML = '';
  steps.forEach(s => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = (s > 0 ? '+' : '\u2212') + Math.abs(s);
    b.addEventListener('click', () => { g.cur = clampCur(g.cur + s); syncInput(); tone(480 + s, .04, 'square', .03); }); box.appendChild(b);
  });
  syncInput();
}
const clampCur = v => Math.max(g.lo, Math.min(g.hi, v));
function syncInput() {
  const s = $('dSlider'); s.min = g.lo; s.max = g.hi; s.value = g.cur;
  $('dialIn').value = g.cur; $('dialIn').min = g.lo; $('dialIn').max = g.hi;
}

function meterAt(v) {
  const s = g.n <= 10 ? 1 : g.n / 20, d = Math.abs(v - g.target) / s;
  const L = d <= 1 ? ['Burning hot!', '#ff3d5a'] : d <= 2 ? ['Hot', '#ff8a3d'] : d <= 4 ? ['Warm', '#e0a800'] : d <= 6 ? ['Cool', '#2fa8e0'] : ['Freezing', '#4a7bff'];
  $('mneedle').style.left = (1 - Math.min(d, 8) / 8) * 100 + '%';
  $('mlabel').textContent = L[0]; $('mlabel').style.color = L[1];
}

function submit(v) {
  if (!g || g.over) return;
  v = Math.round(+v);
  if (!(v >= g.lo && v <= g.hi)) {
    shake($('pickDial')); setFb('bad', '!', 'Outside the range', `The number must be between ${g.lo} and ${g.hi}.`);
    tone(200, .15, 'square'); vib(40); return;
  }
  g.tries++;
  if (v === g.target) { g.guesses.push({ v, d: 'ok' }); return finish(true); }
  const up = v < g.target; g.guesses.push({ v, d: up ? 'up' : 'down' });
  if (up) g.lo = v + 1; else g.hi = v - 1;
  meterAt(v);
  setFb(up ? 'up' : 'down', up ? '\u25B2' : '\u25BC', up ? 'Go higher' : 'Go lower',
    `${v} is too ${up ? 'low' : 'high'}. The number is between ${g.lo} and ${g.hi}.` + (g.lo === g.hi ? ' Only one number is left!' : ''));
  tone(up ? 640 : 400, .12, 'triangle'); vib(25);
  g.cur = Math.floor((g.lo + g.hi) / 2);
  if (g.n > 10) syncInput(); else paintTiles();
  renderRange(); renderPips(); renderHist();
  if (g.max && g.tries >= g.max) finish(false);
}
function renderRange() {
  const n = g.n, p = v => n > 1 ? (v - 1) / (n - 1) * 100 : 0;
  $('fill').style.left = p(g.lo) + '%'; $('fill').style.width = Math.max(1.5, p(g.hi) - p(g.lo)) + '%';
  $('marks').innerHTML = g.guesses.map(x => `<i class="${x.d}" style="left:${p(x.v)}%"></i>`).join('');
  $('loLbl').textContent = 1; $('hiLbl').textContent = n;
  $('rangeTxt').textContent = `${g.lo} \u2013 ${g.hi} \u00B7 ${g.hi - g.lo + 1} left`;
}
function renderPips() {
  const el = $('pips');
  if (!g.max) { el.innerHTML = `<span class="inf">Tries ${g.tries}</span>`; return; }
  el.innerHTML = Array.from({ length: g.max }, (_, i) => `<i class="${i < g.tries ? 'used' : ''}"></i>`).join('');
}
function renderHist() {
  $('hist').innerHTML = g.guesses.map(x => `<li class="${x.d}">${x.v} ${x.d === 'up' ? '\u25B2' : x.d === 'down' ? '\u25BC' : '\u2713'}</li>`).join('');
}
function hint() {
  if (!g || g.over || g.hints >= 3) return;
  const t = HINTS[g.hints](g.target); g.hints++;
  const p = document.createElement('div'); p.textContent = '\uD83D\uDCA1 ' + t; $('hintBox').appendChild(p);
  $('btnHint').textContent = g.hints >= 3 ? 'No hints left' : `Hint (${3 - g.hints} left)`; $('btnHint').disabled = g.hints >= 3;
  tone(820, .15, 'sine'); vib(20);
}

function finish(won) {
  g.over = true;
  const opt = Math.ceil(Math.log2(g.n));
  let stars = 0, score = 0;
  if (won) {
    stars = g.tries <= opt && !g.hints ? 3 : g.tries <= opt + 1 && g.hints <= 1 ? 2 : 1;
    const left = g.max ? g.max - g.tries + 1 : Math.max(1, opt * 2 - g.tries + 1);
    score = Math.max(10, Math.round(100 * left * (1 + Math.log10(g.n))) - g.hints * 30);
  }
  ST.games++; if (won) { ST.wins++; ST.streak++; ST.best = Math.max(ST.best, ST.streak); ST.score += score; ST.stars += stars; ST.bt[g.m.id] = Math.min(ST.bt[g.m.id] || 1e9, g.tries); } else ST.streak = 0;
  const res = { id: g.m.id, mode: g.m.name, won, target: g.target, tries: g.tries, max: g.max, guesses: g.guesses, stars, score, hints: g.hints };
  if (g.m.id === 'daily') ST.daily[today()] = { won, tries: g.tries, res };
  saveST();
  if (g.n <= 10) paintTiles();
  if (won) { setFb('win', '\u2713', `You got it! It was ${g.target}.`, `${g.tries} ${g.tries === 1 ? 'try' : 'tries'}.`); tone(523, .15, 'triangle', .07); tone(659, .15, 'triangle', .07, .12); tone(784, .25, 'triangle', .07, .24); vib([30, 40, 60]); confetti(); }
  else { setFb('bad', '\u2715', `Out of tries. It was ${g.target}.`, 'Try again, you were close.'); tone(300, .25, 'sawtooth', .06); tone(200, .4, 'sawtooth', .06, .2); vib([120]); }
  renderRange(); renderPips(); renderHist();
  setTimeout(() => showResult(res), won ? 900 : 700);
}

/* ---------- Result modal ---------- */
let lastRes = null;
function showResult(res) {
  lastRes = res;
  $('mTitle').textContent = res.ai ? 'Found it!' : res.won ? 'You got it!' : 'Not this time';
  $('mTitle').className = res.won ? 'win' : 'lose';
  $('mNum').textContent = res.target;
  $('mStats').hidden = !!res.ai;
  $('mTries').textContent = res.max ? `${res.tries}/${res.max}` : res.tries;
  $('mScore').textContent = res.score; $('mStars').textContent = res.stars;
  [...$('mStarRow').children].forEach((s, i) => s.classList.toggle('on', i < res.stars));
  $('mStarRow').hidden = !!res.ai || !res.won;
  $('mMsg').textContent = res.ai ? `I found your number in ${res.tries} ${res.tries === 1 ? 'try' : 'tries'}. Picking the middle every time finds any number from 1 to 100 in 7 tries or fewer.`
    : res.id === 'daily' ? 'Come back tomorrow for a new number.' : res.won ? (res.stars === 3 ? 'Perfect play. You cannot do better.' : 'Tip: always guess the middle of the range.') : 'Tip: always guess the middle of the range.';
  $('mAgain').hidden = res.id === 'daily';
  $('mShare').hidden = !!res.ai;
  $('mShare').textContent = 'Share result';
  $('modal').hidden = false;
}
const closeModal = () => { $('modal').hidden = true; };
function share() {
  const r = lastRes; if (!r) return;
  const row = r.guesses.map(x => x.d === 'up' ? '\u2B06\uFE0F' : x.d === 'down' ? '\u2B07\uFE0F' : '\u2705').join('');
  const txt = `Guess the Number \u00B7 ${r.mode}${r.id === 'daily' ? ' ' + today() : ''}\n${r.won ? r.tries : 'X'}/${r.max || '\u221E'} ${'\u2B50'.repeat(r.stars)}\n${row}\nby jaydheep R (JK)`;
  const done = () => { $('mShare').textContent = 'Copied!'; setTimeout(() => $('mShare').textContent = 'Share result', 1600); };
  if (navigator.share) navigator.share({ text: txt }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(() => {});
}
function confetti() {
  if (!SET.motion) return;
  const fx = $('fx'), colors = ['#ffd23f', '#35d6a0', '#ff7ab6', '#2336ff', '#14123a'];
  for (let i = 0; i < 44; i++) {
    const s = document.createElement('span'), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    s.style.background = colors[i % colors.length]; fx.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
}

/* ---------- AI guesses ---------- */
let a = null;
function startAI() {
  a = { lo: 1, hi: 100, tries: 0, cur: 50, hist: [], over: false, wait: false };
  $('aiIntro').hidden = false; $('aiPlay').hidden = true; $('aiHist').innerHTML = ''; $('aiMsg').textContent = ''; $('aiRestart').hidden = true;
  show('ai');
}
function aiThink() {
  a.cur = Math.floor((a.lo + a.hi) / 2); a.wait = true;
  $('aiNum').textContent = '\u2022\u2022\u2022'; $('aiNum').classList.add('think');
  $('aiRange').textContent = `Possible: ${a.lo} \u2013 ${a.hi} (${a.hi - a.lo + 1} numbers)`;
  $('aiHist').innerHTML = a.hist.map(x => `<li class="${x.d}">${x.v} ${x.d === 'up' ? '\u25B2' : '\u25BC'}</li>`).join('');
  setTimeout(() => {
    $('aiNum').textContent = a.cur; $('aiNum').classList.remove('think'); $('aiTry').textContent = `My guess #${a.tries + 1}`;
    a.wait = false; tone(520, .1, 'triangle'); vib(15);
  }, SET.motion ? 700 : 60);
}
function aiAnswer(k) {
  if (!a || a.over || a.wait) return;
  a.tries++;
  if (k === 'ok') {
    a.over = true; ST.ai = (ST.ai || 0) + 1; saveST();
    tone(523, .15, 'triangle', .07); tone(784, .25, 'triangle', .07, .14); vib([30, 40, 60]); confetti();
    showResult({ ai: true, id: 'ai', mode: 'AI guesses', won: true, target: a.cur, tries: a.tries, guesses: [], stars: 0, score: 0 });
    return;
  }
  a.hist.push({ v: a.cur, d: k });
  if (k === 'up') a.lo = a.cur + 1; else a.hi = a.cur - 1;
  if (a.lo > a.hi) { a.over = true; $('aiMsg').textContent = 'That does not add up. Did your number change?'; $('aiRestart').hidden = false; tone(200, .3, 'sawtooth'); return; }
  tone(k === 'up' ? 640 : 400, .1, 'triangle');
  aiThink();
}

/* ---------- Settings ---------- */
const SCH = [
  { k: 'sound', l: 'Sound', t: 'tog' }, { k: 'haptic', l: 'Vibration', t: 'tog' },
  { k: 'meter', l: 'Hot / cold meter', t: 'tog' }, { k: 'motion', l: 'Animations', t: 'tog' },
  { k: 'theme', l: 'Theme', t: 'seg', o: [['indigo', 'Indigo'], ['sunset', 'Sunset'], ['forest', 'Forest'], ['mono', 'Mono']] }
];
let resetArm = 0;
function renderSettings() {
  const box = $('setList'); box.innerHTML = '';
  SCH.forEach(r => {
    const row = document.createElement('div'); row.className = 'sr';
    const lab = document.createElement('span'); lab.textContent = r.l; row.appendChild(lab);
    if (r.t === 'tog') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sw' + (SET[r.k] ? ' on' : ''); b.setAttribute('aria-pressed', SET[r.k]);
      b.addEventListener('click', () => { SET[r.k] = !SET[r.k]; saveSET(); applyTheme(); renderSettings(); tone(600, .06); }); row.appendChild(b);
    } else {
      const s = document.createElement('div'); s.className = 'seg';
      r.o.forEach(([v, t]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (SET[r.k] === v) b.className = 'on';
        b.addEventListener('click', () => { SET[r.k] = v; saveSET(); applyTheme(); renderSettings(); }); s.appendChild(b);
      }); row.appendChild(s);
    }
    box.appendChild(row);
  });
  const d = document.createElement('button'); d.type = 'button'; d.className = 'danger';
  d.textContent = resetArm ? 'Tap again to confirm' : 'Reset stats';
  d.addEventListener('click', () => {
    if (!resetArm) { resetArm = 1; renderSettings(); setTimeout(() => { resetArm = 0; if (!$('setModal').hidden) renderSettings(); }, 3000); }
    else { resetArm = 0; Object.assign(ST, { games: 0, wins: 0, streak: 0, best: 0, score: 0, stars: 0, bt: {}, daily: {} }); saveST(); renderSettings(); renderHome(); }
  });
  box.appendChild(d);
}

/* ---------- Wiring ---------- */
$('btnBack').addEventListener('click', () => show('home')); $('aiBack').addEventListener('click', () => show('home'));
$('btnHint').addEventListener('click', hint);
$('btnGuess').addEventListener('click', () => submit($('dialIn').value));
$('btnMid').addEventListener('click', () => { g.cur = Math.floor((g.lo + g.hi) / 2); syncInput(); tone(560, .06, 'triangle'); });
$('dSlider').addEventListener('input', e => { g.cur = +e.target.value; $('dialIn').value = g.cur; });
$('dialIn').addEventListener('input', e => { const v = +e.target.value; if (v) $('dSlider').value = v; });
$('dialIn').addEventListener('keydown', e => {
  if (e.key === 'Enter') submit(e.target.value);
  if (e.key === 'ArrowUp') { g.cur = clampCur(+e.target.value + 1); syncInput(); e.preventDefault(); }
  if (e.key === 'ArrowDown') { g.cur = clampCur(+e.target.value - 1); syncInput(); e.preventDefault(); }
});
$('mAgain').addEventListener('click', () => { closeModal(); lastRes.ai ? startAI() : startGame(lastRes.id); });
$('mHome').addEventListener('click', () => { closeModal(); show('home'); });
$('mShare').addEventListener('click', share);
$('aiReady').addEventListener('click', () => { $('aiIntro').hidden = true; $('aiPlay').hidden = false; aiThink(); });
$('aiUp').addEventListener('click', () => aiAnswer('up')); $('aiOk').addEventListener('click', () => aiAnswer('ok')); $('aiDown').addEventListener('click', () => aiAnswer('down'));
$('aiRestart').addEventListener('click', startAI);
$('btnSettings').addEventListener('click', () => { renderSettings(); $('setModal').hidden = false; });
$('setClose').addEventListener('click', () => { $('setModal').hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') { $('modal').hidden = true; $('setModal').hidden = true; } });

(function bgNumbers() {
  const bg = $('bg');
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.textContent = rand(1, 99); s.style.left = rand(0, 95) + '%'; s.style.fontSize = (2 + Math.random() * 5) + 'rem';
    s.style.animationDuration = rand(16, 34) + 's'; s.style.animationDelay = '-' + rand(0, 30) + 's'; bg.appendChild(s);
  }
})();
applyTheme(); renderHome();
