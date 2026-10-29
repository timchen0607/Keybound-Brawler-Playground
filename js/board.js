/* Play-page DOM: word cells, HUD, overlay and button state. */
import { $, h, mmss, LANG_NAME } from './util.js';
import { MAX_WORDS, G, settings, ui } from './state.js';

export const grid = $('#grid');
export const input = $('#typed');
const overlay = $('#overlay');
export const cells = [];
for (let i = 0; i < MAX_WORDS; i++) { const c = h('div', { class: 'cell' }); cells.push(c); grid.append(c); }

// Callbacks supplied by main.js, so this module does not depend on the page router.
export const hooks = { showView: () => {} };

export const refocus = () => { if (ui.view === 'play') input.focus(); };

/* ---------- cells ---------- */
export function setLine(el, text, end) {
  el.textContent = '';
  if (end > 0) el.append(h('span', { class: 'done' }, text.slice(0, end)));
  el.append(text.slice(end));
}

export function paintCell(w) {
  const c = cells[w.slot];
  c.className = 'cell';
  c.textContent = '';
  w.lines = { text: h('div', { class: 'tx' }) };
  w.end = { text: 0, kana: 0 };
  setLine(w.lines.text, w.text, 0);
  if (settings.lang === 'ja') {
    w.lines.kana = h('div', { class: 'rt' });
    setLine(w.lines.kana, w.kana, 0);
    c.append(w.lines.kana, w.lines.text);
  } else c.append(w.lines.text);
  w.bar = h('i', { class: 'bar' });
  c.append(w.bar);
}

export function setProgress(w, t, consumed) {
  const end = consumed > 0 ? t.tokens[consumed - 1].e : 0;
  if (w.end[t.kind] !== end && w.lines[t.kind]) { w.end[t.kind] = end; setLine(w.lines[t.kind], t.src, end); }
}

export function emptyCell(i) { cells[i].className = 'cell'; cells[i].textContent = ''; }

/* ---------- HUD / hint / overlay ---------- */
export function updateHud() {
  const s = G.sess;
  const active = s && (G.state === 'playing' || G.state === 'paused');
  if (settings.mode === 'timed') $('#h-time').textContent = mmss(settings.duration * 1000 - (active ? s.activeMs : 0));
  else $('#h-time').textContent = mmss(active ? s.activeMs : 0);
  $('#h-cleared').textContent = active ? s.cleared : 0;
  $('#h-exp').textContent = active ? s.expired : 0;
  $('#h-avg').textContent = active && s.cleared ? (s.clearMs / s.cleared / 1000).toFixed(1) + ' 秒' : '—';
  $('#h-acc').textContent = active && s.cleared + s.err ? Math.round((s.cleared / (s.cleared + s.err)) * 100) + '%' : '—';
}

function updateHint() {
  $('#hint').textContent = settings.lang === 'ja'
    ? '可輸入下方英文，或用日文輸入法輸入上方假名（不接受羅馬拼音）。打英文時請切回英數輸入。'
    : '請切回英數輸入。! \' ? - 可省略，. , 與空格必須輸入。';
}

export function showOverlay(kind) {
  overlay.className = 'overlay';
  overlay.textContent = '';
  let box;
  if (kind === 'idle') {
    const modeText = settings.mode === 'timed' ? `計時 ${settings.duration / 60} 分鐘` : '自由模式';
    box = h('div', { class: 'msg' },
      h('div', { class: 'big' }, `${LANG_NAME[settings.lang]} · ${modeText}`),
      '按「開始」，或直接開始打字。');
  } else if (kind === 'paused') {
    box = h('div', { class: 'msg' },
      h('div', { class: 'big' }, '已暫停'),
      G.pauseReason === 'idle' ? '閒置太久，已自動暫停。' : '',
      '輸入任意字元即可繼續。');
  } else if (kind === 'error') {
    box = h('div', { class: 'msg' },
      h('div', { class: 'big' }, '讀不到詞庫'),
      '請確認是透過伺服器（例如 Live Server）開啟，且 resources 資料夾內有 CSV 檔。');
  } else if (kind === 'finished') {
    const r = G.lastRec;
    if (!r) {
      box = h('div', { class: 'msg' }, h('div', { class: 'big' }, '本場沒有輸入紀錄'), '按「開始」再來一場。');
    } else {
      box = h('div', { class: 'msg' },
        h('div', { class: 'big' }, settings.mode === 'timed' ? '時間到' : '已結束'),
        h('div', { class: 'result' },
          h('span', null, '消除單詞'), h('b', null, String(r.cl)),
          h('span', null, '每詞平均用時'), h('b', null, r.avg == null ? '—' : r.avg.toFixed(1) + ' 秒'),
          h('span', null, '正確率'), h('b', null, r.acc == null ? '—' : Math.round(r.acc * 100) + '%'),
          h('span', null, '逾時'), h('b', null, String(r.ex))),
        r.best ? h('div', { class: 'best' }, '▲ 此語言與模式的新最快紀錄') : null,
        h('div', null, h('button', { class: 'ghost', onclick: () => hooks.showView('dash') }, '查看戰績')));
    }
  }
  overlay.append(box);
}

export function renderState() {
  const st = G.state;
  grid.classList.toggle('blur', st === 'paused');
  if (st === 'playing') overlay.className = 'overlay off';
  else showOverlay(st);
  const main = $('#btn-main'), stop = $('#btn-stop');
  main.textContent = st === 'playing' ? '暫停' : st === 'paused' ? '繼續' : '開始';
  stop.hidden = !(st === 'playing' || st === 'paused');
  stop.textContent = settings.mode === 'free' ? '結束並儲存' : '結束';
  updateHud();
  updateHint();
}
