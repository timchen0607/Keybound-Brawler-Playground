/* Input box helpers: normalisation, live highlighting, submit history. */
import * as M from './matcher.js';
import { G, settings, HISTORY_MAX } from './state.js';
import { input, cells, setProgress } from './board.js';

export const normTyped = (kind, v) => (kind === 'kana' ? M.normKana(v) : (settings.caseSensitive ? v : v.toLowerCase()));

/* ---------- submit history (↑ / ↓) ---------- */
const hist = [];
let histIdx = 0;

export function histPush(val) {
  if (hist[hist.length - 1] !== val) hist.push(val);
  if (hist.length > HISTORY_MAX) hist.shift();
  histIdx = hist.length;
}
export const histHas = () => hist.length > 0;
// Move through history; returns the text to show.
export function histStep(dir) {
  if (dir < 0) { if (histIdx > 0) histIdx--; return hist[histIdx]; }
  if (histIdx < hist.length - 1) { histIdx++; return hist[histIdx]; }
  histIdx = hist.length;
  return '';
}

/* ---------- input box ---------- */
let badTimer = 0;

export function resetInput() {
  input.value = '';
  G.inputStart = null;
  input.classList.remove('bad');
}

export function flashBad() {
  input.classList.add('bad');
  clearTimeout(badTimer);
  badTimer = setTimeout(() => input.classList.remove('bad'), 450);
}

export function clearProgress() {
  G.words.forEach((w) => {
    w.targets.forEach((t) => setProgress(w, t, 0));
    cells[w.slot].classList.remove('hit');
  });
}

// Live check: highlight progress only. Words are cleared / judged when Enter is pressed.
export function evaluate(val) {
  if (!G.sess) return;
  const res = G.words.map((w) => ({
    w, ms: w.targets.map((t) => ({ t, m: M.match(t.tokens, normTyped(t.kind, val)) })),
  }));

  let any = false;
  res.forEach((r) => {
    let hit = false;
    r.ms.forEach(({ t, m }) => {
      const on = !!val && m.valid;
      if (on) hit = true;
      setProgress(r.w, t, on ? m.consumed : 0);
    });
    cells[r.w.slot].classList.toggle('hit', hit);
    any = any || hit;
  });
  // visual hint only; mistakes are counted on Enter
  input.classList.toggle('bad', !!val && !any && !G.composing);
}
