const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const TOTAL = 15, KEY = 'royal-grid-v2';
const sizeFor = l => 5 + Math.floor((l - 1) / 5);   // levels 1-5: 5x5, 6-10: 6x6, 11-15: 7x7
const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ---------- saved data ---------- */
let save = { solved: {}, theme: null, autoMark: false, sound: true };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY))); } catch (e) {}
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
const unlocked = l => l === 1 || !!save.solved[l - 1];

function applyTheme() {
  document.documentElement.dataset.theme = save.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

/* ---------- sound ---------- */
let ac;
function beep(f, d = 0.08) {
  if (!save.sound) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = 0.05;
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + d);
  } catch (e) {}
}

/* ---------- screens ---------- */
function show(name) {
  clearInterval(G && G.timer); if (G) G.timer = null;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === name));
  $('#modal').hidden = true;
  if (name === 'levels') renderLevels();
  if (name === 'stats') renderStats();
  if (name === 'settings') {
    $('#optDark').checked = document.documentElement.dataset.theme === 'dark';
    $('#optAuto').checked = save.autoMark; $('#optSound').checked = save.sound;
  }
}

function renderLevels() {
  const g = $('#levelGrid'); g.innerHTML = '';
  for (let l = 1; l <= TOTAL; l++) {
    const b = document.createElement('button'), s = save.solved[l];
    b.className = 'lv'; b.disabled = !unlocked(l);
    b.innerHTML = (unlocked(l) ? l : '🔒') + (s ? '<small>' + '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars) + '</small>' : '');
    b.onclick = () => startLevel(l);
    g.appendChild(b);
  }
}

function renderStats() {
  const ids = Object.keys(save.solved), stars = ids.reduce((a, k) => a + save.solved[k].stars, 0);
  let h = `<div class="stats"><div><b>${ids.length}/${TOTAL}</b><span>Levels solved</span></div><div><b>${stars}/${TOTAL * 3}</b><span>Stars</span></div></div>`;
  if (!ids.length) h += '<p class="sub">Solve a level to see your best times here.</p>';
  ids.sort((a, b) => a - b).forEach(k => {
    h += `<div class="srow"><span>Level ${k}</span><span>${'★'.repeat(save.solved[k].stars)} &nbsp; ${fmt(save.solved[k].time)}</span></div>`;
  });
  $('#statsBody').innerHTML = h;
}

/* ---------- puzzle generator (same level number = same puzzle) ---------- */
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function makePuzzle(n, r) {
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function queens() {                       // one queen per row/column, none touching
    const cols = [];
    (function rec(row) {
      if (row === n) return true;
      for (const c of shuffle([...Array(n).keys()])) {
        if (cols.includes(c) || (row && Math.abs(cols[row - 1] - c) <= 1)) continue;
        cols[row] = c; if (rec(row + 1)) return true;
      }
      cols.length = row; return false;
    })(0);
    return cols;
  }
  function grow(q) {                        // grow colored regions from each queen
    const reg = Array.from({ length: n }, () => Array(n).fill(-1));
    q.forEach((c, row) => reg[row][c] = row);
    for (let left = n * n - n; left > 0; left--) {
      const edge = [];
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (reg[a][b] >= 0)
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = a + da, y = b + db;
          if (x >= 0 && y >= 0 && x < n && y < n && reg[x][y] < 0) edge.push([x, y, reg[a][b]]);
        }
      const [x, y, k] = edge[Math.floor(r() * edge.length)]; reg[x][y] = k;
    }
    return reg;
  }
  function count(reg) {                     // how many solutions? (stops at 2)
    let found = 0; const cols = [], uc = new Set(), ur = new Set();
    (function rec(row) {
      if (found > 1) return;
      if (row === n) { found++; return; }
      for (let c = 0; c < n; c++) {
        if (uc.has(c) || ur.has(reg[row][c]) || (row && Math.abs(cols[row - 1] - c) <= 1)) continue;
        cols[row] = c; uc.add(c); ur.add(reg[row][c]); rec(row + 1); uc.delete(c); ur.delete(reg[row][c]);
      }
    })(0);
    return found;
  }
  let q, reg;
  for (let t = 0; t < 4000; t++) { q = queens(); reg = grow(q); if (count(reg) === 1) break; }
  return { reg, sol: q };
}

/* ---------- game ---------- */
let G = null;

function startLevel(l) {
  const n = sizeFor(l), p = makePuzzle(n, rng(l * 7919 + 13));
  G = { level: l, n, reg: p.reg, sol: p.sol, state: Array.from({ length: n }, () => Array(n).fill(0)), hist: [], secs: 0, timer: null, hints: 0, won: false };
  $('#gTitle').textContent = 'Level ' + l + ' · ' + n + '×' + n;
  $('#time').textContent = '0:00'; $('#hints').textContent = 0;
  const s = save.solved[l]; $('#gBest').textContent = s ? fmt(s.time) : '–';
  show('game'); render();
}

function conflicts() {
  const q = [], bad = new Set();
  G.state.forEach((row, r) => row.forEach((v, c) => v === 2 && q.push([r, c])));
  for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
    const [a, b] = q[i], [c, d] = q[j];
    if (a === c || b === d || G.reg[a][b] === G.reg[c][d] || (Math.abs(a - c) <= 1 && Math.abs(b - d) <= 1)) { bad.add(a * G.n + b); bad.add(c * G.n + d); }
  }
  return { bad, count: q.length };
}

function render(pop) {
  const { n, reg, state } = G, { bad } = conflicts(), el = $('#board');
  el.style.setProperty('--n', n); el.className = 'board' + (G.won ? ' won' : ''); el.innerHTML = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c, v = state[r][c], k = reg[r][c], b = document.createElement('button');
    b.className = 'cell' + (v === 1 ? ' x' : '') + (v === 2 && (i === pop || G.won) ? ' q' : '') + (bad.has(i) ? ' bad' : '');
    b.style.backgroundColor = `var(--r${k})`; b.style.setProperty('--d', i * 40 + 'ms');
    b.textContent = v === 1 ? '×' : v === 2 ? '♛' : '';
    b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${['empty', 'marked', 'queen'][v]}`);
    b.onclick = () => press(r, c);
    el.appendChild(b);
  }
  $('#undo').disabled = !G.hist.length || G.won; $('#hint').disabled = G.won;
}

const snap = () => G.hist.push(G.state.map(r => r.slice()));
function startTimer() {
  if (!G.timer && !G.won) G.timer = setInterval(() => $('#time').textContent = fmt(++G.secs), 1000);
}

function press(r, c) {
  if (G.won) return;
  startTimer(); snap();
  const s = G.state, v = s[r][c] = (s[r][c] + 1) % 3;
  if (v === 2) {
    beep(520);
    if (save.autoMark) for (let a = 0; a < G.n; a++) for (let b = 0; b < G.n; b++)
      if (s[a][b] === 0 && (a === r || b === c || G.reg[a][b] === G.reg[r][c] || (Math.abs(a - r) <= 1 && Math.abs(b - c) <= 1))) s[a][b] = 1;
  } else beep(300, 0.04);
  render(r * G.n + c); checkWin();
}

function checkWin() {
  const { bad, count } = conflicts();
  if (count !== G.n || bad.size) return;
  G.won = true; clearInterval(G.timer); G.timer = null;
  const par = G.n * 15;
  const stars = G.hints === 0 && G.secs <= par ? 3 : G.hints <= 1 && G.secs <= par * 2 ? 2 : 1;
  const old = save.solved[G.level];
  save.solved[G.level] = { stars: Math.max(stars, old ? old.stars : 0), time: old ? Math.min(old.time, G.secs) : G.secs };
  store(); render();
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.15), i * 150));
  setTimeout(() => {
    $('#mStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#mText').textContent = 'Solved in ' + fmt(G.secs) + (G.hints ? ' with ' + G.hints + ' hint' + (G.hints > 1 ? 's' : '') : '') + '.';
    $('#mNext').style.display = G.level < TOTAL ? '' : 'none';
    $('#modal').hidden = false;
  }, 900);
}

/* ---------- buttons ---------- */
$$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
$('#play').onclick = () => { let l = 1; while (l < TOTAL && save.solved[l]) l++; startLevel(l); };
$('#undo').onclick = () => { if (G.hist.length && !G.won) { G.state = G.hist.pop(); render(); } };
$('#reset').onclick = () => startLevel(G.level);
$('#mAgain').onclick = () => startLevel(G.level);
$('#mNext').onclick = () => startLevel(G.level + 1);
$('#hint').onclick = () => {
  const rows = [...Array(G.n).keys()].filter(r => G.state[r][G.sol[r]] !== 2);
  if (!rows.length || G.won) return;
  startTimer(); snap();
  const r = rows[Math.floor(Math.random() * rows.length)], c = G.sol[r];
  G.state[r] = G.state[r].map(v => v === 2 ? 0 : v); G.state[r][c] = 2;
  $('#hints').textContent = ++G.hints; beep(660); render(r * G.n + c); checkWin();
};
$('#optDark').onchange = e => { save.theme = e.target.checked ? 'dark' : 'light'; store(); applyTheme(); };
$('#optAuto').onchange = e => { save.autoMark = e.target.checked; store(); };
$('#optSound').onchange = e => { save.sound = e.target.checked; store(); };
$('#wipe').onclick = () => { if (confirm('Delete all saved progress?')) { save.solved = {}; store(); renderStats(); } };

applyTheme();
show('home');