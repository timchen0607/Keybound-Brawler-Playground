/* Entry point: page routing, global events, boot. */
import { $, $$ } from './util.js';
import { G, ui, saveStats } from './state.js';
import { input, hooks, refocus, renderState } from './board.js';
import {
  onInput, onCompositionStart, onCompositionEnd, submit, recall, clearTyped,
  startSession, pause, resume, endSession, startLoop,
} from './game.js';
import { applyTheme, syncControls, renderUser, bindSettings } from './settings.js';
import { renderDash } from './dashboard.js';

/* ---------- views ---------- */
function showView(name) {
  if (name !== 'play') pause('manual');
  ui.view = name;
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
  ['play', 'dash', 'settings'].forEach((v) => { $('#view-' + v).hidden = v !== name; });
  if (name === 'dash') renderDash();
  if (name === 'play') input.focus();
}
hooks.showView = showView;
$$('#nav button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

/* ---------- buttons ---------- */
$('#btn-main').addEventListener('click', () => {
  if (G.state === 'playing') pause('manual');
  else if (G.state === 'paused') resume();
  else startSession();
  input.focus();
});
$('#btn-stop').addEventListener('click', () => { endSession(true); input.focus(); });

/* ---------- input box ---------- */
input.addEventListener('input', onInput);
input.addEventListener('compositionstart', onCompositionStart);
input.addEventListener('compositionend', onCompositionEnd);
input.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return;   // Enter/arrows belong to the IME here
  if (e.key === 'Enter') { e.preventDefault(); submit(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); recall(-1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); recall(1); }
});

// Anything typed on the practice page lands in the input box.
document.addEventListener('keydown', (e) => {
  if (ui.view !== 'play') return;
  if (e.key === 'Escape') { clearTyped(); input.focus(); return; }
  if (document.activeElement === input || /^(SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowUp') { e.preventDefault(); input.focus(); recall(-1); }
  else if (e.key.length === 1 || e.key === 'Process' || e.key === 'Backspace') {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) input.focus();
  }
});
input.addEventListener('blur', () => setTimeout(() => {
  if (ui.view === 'play' && document.activeElement === document.body) input.focus();
}, 0));
window.addEventListener('focus', refocus);
$('.stage').addEventListener('click', refocus);

/* ---------- leaving the window ---------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause('blur'); saveStats(); }
});
window.addEventListener('blur', () => pause('blur'));
window.addEventListener('pagehide', () => {
  if (G.sess && (G.state === 'playing' || G.state === 'paused')) endSession(false);
  saveStats();
});

/* ---------- boot ---------- */
bindSettings();
applyTheme();
syncControls();
renderUser();
renderState();
startLoop();
input.focus();
