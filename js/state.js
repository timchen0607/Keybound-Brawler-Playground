/* Shared constants and mutable state (settings, saved stats, live game state). */
import { LS } from './util.js';

export const MAX_WORDS = 10, MIN_BATCH = 3, MAX_BATCH = 5;
export const TRICKLE_MS = 6000, IDLE_PAUSE_MS = 15000, WARN_MS = 8000, HISTORY_MAX = 30;

const DEFAULTS = { lang: 'ja', mode: 'timed', duration: 180, lifetime: 30, caseSensitive: false, theme: 'auto', username: '' };
export const settings = Object.assign({}, DEFAULTS, LS.get('tp.settings', {}));
export const saveSettings = () => LS.set('tp.settings', settings);

const emptyStats = () => ({ sessions: [], words: {}, days: {} });
export const stats = (() => { const s = LS.get('tp.stats2', null); return s && s.sessions ? s : emptyStats(); })();
export const saveStats = () => LS.set('tp.stats2', stats);
export function resetStats() { Object.assign(stats, emptyStats()); saveStats(); }

export const dashFilter = Object.assign({ lang: 'all', mode: 'all' }, LS.get('tp.dash', {}));
export const saveDashFilter = () => LS.set('tp.dash', dashFilter);

// Live game state.
export const G = {
  state: 'idle',          // idle | playing | paused | finished
  words: [], slots: Array(MAX_WORDS).fill(null), pool: [], sess: null, uid: 0,
  trickle: 0, lastInput: 0, inputStart: null, hudAt: 0, last: 0, starting: false,
  pauseReason: '', composing: false, lastRec: null,
};
export const ui = { view: 'play' };

// Per-word statistics record.
export function wstat(w) {
  return stats.words[w.key] || (stats.words[w.key] = {
    t: w.text, k: w.kana || '', l: settings.lang, shown: 0, cleared: 0, miss: 0, exp: 0, ms: 0,
  });
}

// User name: custom one, or a stable "光之戰士#xxxx" guest name.
function guestTag() {
  let tag = LS.get('tp.tag', null);
  if (!tag) {
    const cs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    tag = Array.from({ length: 4 }, () => cs[Math.floor(Math.random() * cs.length)]).join('');
    LS.set('tp.tag', tag);
  }
  return tag;
}
export const defaultName = '光之戰士#' + guestTag();
export const displayName = () => settings.username.trim() || defaultName;
