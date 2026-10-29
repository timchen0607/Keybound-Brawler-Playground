export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));
export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs || {}) {
    if (k === 'class') el.className = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  kids.flat().forEach((c) => { if (c != null) el.append(c); });
  return el;
}

export const svgEl = (tag, attrs) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
  return el;
};

export const LANG_NAME = { ja: '日文', en: '英文' };

export const pad2 = (n) => String(n).padStart(2, '0');
export const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
};
export const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
export const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const fmtDur = (sec) => (sec >= 3600
  ? `${Math.floor(sec / 3600)} 時 ${Math.floor((sec % 3600) / 60)} 分`
  : `${Math.floor(sec / 60)} 分 ${Math.round(sec % 60)} 秒`);
