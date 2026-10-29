/* Game core: word spawning, Enter judging, sessions and the frame loop. */
import * as M from './matcher.js';
import { rand, dayKey } from './util.js';
import {
  MAX_WORDS, MIN_BATCH, MAX_BATCH, TRICKLE_MS, IDLE_PAUSE_MS, WARN_MS,
  settings, stats, saveStats, G, wstat,
} from './state.js';
import { loadWords } from './words.js';
import {
  input, cells, paintCell, emptyCell, renderState, showOverlay, updateHud,
} from './board.js';
import {
  normTyped, histPush, histHas, histStep, resetInput, flashBad, clearProgress, evaluate,
} from './typing.js';

/* ---------- words ---------- */
function makeWord(e) {
  const targets = [];
  if (e.text) targets.push({
    kind: 'text', src: e.text, tokens: M.textTokens(e.text, settings.caseSensitive),
    norm: settings.caseSensitive ? e.text : e.text.toLowerCase(),
  });
  if (e.kana) targets.push({ kind: 'kana', src: e.kana, tokens: M.kanaTokens(e.kana), norm: M.normKana(e.kana) });
  return { uid: ++G.uid, key: `${settings.lang}:${e.id}`, text: e.text, kana: e.kana, targets, age: 0, slot: -1, lines: {}, end: {} };
}

function place(w) {
  const free = [];
  G.slots.forEach((s, i) => { if (!s) free.push(i); });
  if (!free.length) return false;
  w.slot = free[rand(0, free.length - 1)];
  G.slots[w.slot] = w;
  G.words.push(w);
  paintCell(w);
  wstat(w).shown++;
  return true;
}

const collides = (a, b) => a.targets.some((x) => b.targets.some((y) =>
  x.kind === y.kind && (x.norm.startsWith(y.norm) || y.norm.startsWith(x.norm))));

function spawn(n) {
  let guard = 0;
  while (n > 0 && G.words.length < MAX_WORDS && guard++ < 300) {
    const w = makeWord(G.pool[rand(0, G.pool.length - 1)]);
    // avoid words that are prefixes of each other, otherwise one can never be typed fully
    if (G.words.some((o) => o.key === w.key || collides(o, w))) continue;
    if (place(w)) n--;
  }
}

function removeWord(w, how) {
  const i = G.words.indexOf(w);
  if (i < 0) return;
  G.words.splice(i, 1);
  G.slots[w.slot] = null;
  const slot = w.slot;
  cells[slot].classList.add('leaving');
  setTimeout(() => { if (!G.slots[slot]) emptyCell(slot); }, 260);
  if (G.state === 'playing' && G.words.length <= 1) spawn(rand(MIN_BATCH, MAX_BATCH));
  if (how === 'expire') evaluate(input.value);
}

function expireWord(w) {
  wstat(w).exp++;
  G.sess.expired++;
  removeWord(w, 'expire');
}

/* ---------- typing ---------- */
// Enter: an exact match clears the word; anything else counts as a miss.
export function submit() {
  const s = G.sess;
  const val = input.value;
  if (!s || G.state !== 'playing' || !val.trim()) return;
  histPush(val);
  const done = G.words.find((w) => w.targets.some((t) => M.match(t.tokens, normTyped(t.kind, val)).complete));
  if (done) {
    const dt = s.activeMs - (G.inputStart == null ? s.activeMs : G.inputStart);
    const st = wstat(done);
    st.cleared++; st.ms += dt;
    s.cleared++; s.clearMs += dt;
    resetInput();
    removeWord(done, 'clear');
    clearProgress();
    return;
  }
  // Attribute the miss to the word sharing the longest leading part with the input.
  // No shared start means we cannot tell which word was meant, so it is not counted.
  let best = null, bestLen = 0;
  G.words.forEach((w) => w.targets.forEach((t) => {
    const typed = normTyped(t.kind, val);
    let n = 0;
    while (n < typed.length && n < t.norm.length && typed[n] === t.norm[n]) n++;
    if (n > bestLen) { bestLen = n; best = w; }
  }));
  if (best) { wstat(best).miss++; s.err++; }
  resetInput();
  flashBad();
  clearProgress();
}

function syncInput() {
  const val = input.value;
  if (val) { if (G.inputStart == null) G.inputStart = G.sess.activeMs; } else G.inputStart = null;
  G.lastInput = performance.now();
  if (G.sess) G.sess.touched = true;
  evaluate(val);
}

export function onInput() {
  if (G.composing) return;
  if (G.state === 'idle' || G.state === 'finished') { resetInput(); startSession(); return; }
  if (G.state === 'paused') resume();
  syncInput();
}

export function onCompositionStart() {
  G.composing = true;
  if (G.state === 'playing' && G.inputStart == null) G.inputStart = G.sess.activeMs;
}

export function onCompositionEnd() {
  G.composing = false;
  onInput();
}

// Esc: empty the box without judging it.
export function clearTyped() {
  if (G.state === 'paused') resume();
  resetInput();
  G.composing = false;
  clearProgress();
}

// ↑ / ↓: bring back previously submitted text.
export function recall(dir) {
  if (!histHas()) return;
  if (G.state === 'paused') resume();
  if (G.state !== 'playing') return;
  input.value = histStep(dir);
  syncInput();
  input.setSelectionRange(input.value.length, input.value.length);
}

/* ---------- session lifecycle ---------- */
export async function startSession() {
  if (G.starting) return;
  G.starting = true;
  try {
    G.pool = await loadWords(settings.lang);
  } catch (e) {
    G.starting = false;
    showOverlay('error');
    return;
  }
  G.starting = false;
  G.words = []; G.slots.fill(null);
  cells.forEach((_, i) => emptyCell(i));
  resetInput();
  G.sess = { ts: Date.now(), lang: settings.lang, mode: settings.mode, activeMs: 0, cleared: 0, clearMs: 0,
             err: 0, expired: 0, touched: false };
  G.trickle = 0; G.lastInput = performance.now();
  G.state = 'playing';
  spawn(rand(MIN_BATCH, MAX_BATCH));
  renderState();
  input.focus();
}

export function pause(reason) {
  if (G.state !== 'playing') return;
  G.state = 'paused'; G.pauseReason = reason || 'manual';
  renderState();
}

export function resume() {
  if (G.state !== 'paused') return;
  G.state = 'playing'; G.lastInput = performance.now();
  renderState();
  input.focus();
}

// Finalize and store the session. `show` = show the result card.
export function endSession(show) {
  const s = G.sess;
  if (!s || (G.state !== 'playing' && G.state !== 'paused')) return null;
  let rec = null;
  if (s.activeMs > 1000 && (s.cleared || s.err || s.touched)) {
    const sec = Math.round(s.activeMs / 1000);
    rec = {
      ts: s.ts, lang: s.lang, mode: s.mode, act: sec, cl: s.cleared, ex: s.expired, err: s.err,
      ms: s.clearMs, avg: s.cleared ? s.clearMs / s.cleared / 1000 : null,
      acc: s.cleared + s.err ? s.cleared / (s.cleared + s.err) : null,
    };
    const prev = stats.sessions.filter((x) => x.lang === rec.lang && x.mode === rec.mode && x.cl >= 3 && x.avg != null);
    rec.best = rec.cl >= 3 && prev.length > 0 && rec.avg < Math.min(...prev.map((x) => x.avg));
    stats.sessions.push(rec);
    if (stats.sessions.length > 300) stats.sessions.splice(0, stats.sessions.length - 300);
    const k = dayKey(s.ts);
    stats.days[k] = (stats.days[k] || 0) + sec;
  }
  saveStats();
  G.state = show ? 'finished' : 'idle';
  G.lastRec = rec;
  G.words.slice().forEach((w) => removeWord(w, 'end'));
  resetInput();
  renderState();
  return rec;
}

/* ---------- frame loop ---------- */
function tick(dt) {
  const s = G.sess;
  s.activeMs += dt;
  const life = settings.lifetime * 1000;
  G.words.slice().forEach((w) => {
    w.age += dt;
    const left = life - w.age;
    if (left <= 0) { expireWord(w); return; }
    w.bar.style.transform = `scaleX(${left / life})`;
    cells[w.slot].classList.toggle('warn', left < WARN_MS);
  });
  if (settings.mode === 'timed' && s.activeMs >= settings.duration * 1000) { endSession(true); return; }
  G.trickle += dt;
  if (G.trickle >= TRICKLE_MS) { G.trickle = 0; if (G.words.length < MAX_WORDS) spawn(1); }
  if (settings.mode === 'free' && performance.now() - G.lastInput > IDLE_PAUSE_MS) { pause('idle'); return; }
  G.hudAt += dt;
  if (G.hudAt > 250) { G.hudAt = 0; updateHud(); }
}

function frame(now) {
  const dt = G.last ? Math.min(now - G.last, 200) : 0;
  G.last = now;
  if (G.state === 'playing') tick(dt);
  requestAnimationFrame(frame);
}

export function startLoop() { requestAnimationFrame(frame); }
