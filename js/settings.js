/* Settings page binding, theme and user name. */
import { $, $$ } from './util.js';
import { settings, saveSettings, G, ui, defaultName, displayName } from './state.js';
import { input, renderState, refocus } from './board.js';
import { endSession } from './game.js';

const THEMES = ['auto', 'light', 'dark'];
const THEME_LABEL = { auto: '自動', light: '淺色', dark: '深色' };
// Changing one of these ends the running session.
const RESET_KEYS = ['lang', 'mode', 'duration', 'lifetime', 'caseSensitive'];

export function applyTheme() {
  if (settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = settings.theme;
  $('#theme-btn').textContent = '◐ ' + THEME_LABEL[settings.theme];
}

export function syncControls() {
  $$('[data-set]').forEach((el) => {
    const v = settings[el.dataset.set];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = String(v);
  });
  $('#duration-wrap').hidden = settings.mode !== 'timed';   // only timed mode has a length
}

export function renderUser() {
  $('#user-name').textContent = displayName();
  $('#username').placeholder = defaultName;
}

export function bindSettings() {
  $('#theme-btn').addEventListener('click', () => {
    settings.theme = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length];
    saveSettings(); applyTheme(); syncControls();
    refocus();
  });

  $('#username').addEventListener('input', (e) => { settings.username = e.target.value; saveSettings(); renderUser(); });

  $$('[data-set]').forEach((el) => {
    el.addEventListener('change', () => {
      const k = el.dataset.set;
      settings[k] = el.type === 'checkbox' ? el.checked : (el.hasAttribute('data-num') ? Number(el.value) : el.value);
      saveSettings();
      if (k === 'theme') applyTheme();
      if (k === 'username') { settings.username = settings.username.trim(); renderUser(); }
      if (RESET_KEYS.includes(k)) {
        if (G.state === 'playing' || G.state === 'paused') endSession(false);
        else if (G.state === 'finished') G.state = 'idle';
        renderState();
      }
      syncControls();
      if (el.tagName === 'SELECT' && ui.view === 'play') { el.blur(); input.focus(); }
    });
  });
}
