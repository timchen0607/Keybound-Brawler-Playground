/* CSV word lists. */
const dict = {};

export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = ''; rows.push(row); row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export const isAscii = (s) => /^[\x20-\x7E]+$/.test(s) && /[A-Za-z]/.test(s);

export function buildEntries(text, lang) {
  const seen = new Set();
  const out = [];
  parseCsv(text).forEach((r) => {
    const id = (r[0] || '').trim();
    const t = (r[1] || '').trim();
    const kana = lang === 'ja' ? (r[2] || '').trim() : '';
    if (!id) return;
    const hasText = isAscii(t);               // only English text is typeable; drops non-English rows
    if (!hasText && !kana) return;
    if (lang === 'en') {
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
    }
    out.push({ id, text: hasText ? t : '', kana });
  });
  return out;
}

let egg = null;
export async function loadEgg() {
  if (egg) return egg;
  const r = await fetch('resources/lesson.json');
  if (!r.ok) throw new Error('egg ' + r.status);
  const data = await r.json();
  if (!data.versions || !data.versions.length) throw new Error('empty egg');
  return (egg = data);
}

export async function loadWords(lang) {
  if (dict[lang]) return dict[lang];
  const r = await fetch(`resources/ktgtypewordtextdata_0_${lang}.exd.csv`);
  if (!r.ok) throw new Error('csv ' + r.status);
  const entries = buildEntries(await r.text(), lang);
  if (!entries.length) throw new Error('empty csv');
  return (dict[lang] = entries);
}
