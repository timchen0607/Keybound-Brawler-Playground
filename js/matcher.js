/* Token builders and incremental matcher for typed text. */

function toHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// Normalise kana strings and what an IME produced: katakana -> hiragana,
// full-width ASCII -> half-width, lower case.
export function normKana(s) {
  return toHira(s)
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ')
    .toLowerCase();
}

// Kana targets are matched literally: the user types the kana itself (IME), not romaji.
export function kanaTokens(str) {
  const s = normKana(str);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const optional = c === '~' || c === ' ';
    out.push({ v: optional ? [c, ''] : [c], s: i, e: i + 1 });
  }
  return out;
}

// "!" "'" "?" "-" and similar may be skipped; "." "," and spaces must be typed.
const REQUIRED = /[A-Za-z0-9 .,]/;
export function textTokens(str, caseSensitive) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const c = caseSensitive ? str[i] : str[i].toLowerCase();
    out.push({ v: REQUIRED.test(str[i]) ? [c] : ['', c], s: i, e: i + 1 });
  }
  return out;
}

/**
 * Match what has been typed so far against a token list.
 * Returns { valid, complete, consumed: number of tokens done }.
 */
export function match(tokens, typed) {
  const n = tokens.length;
  const L = typed.length;
  const seen = new Set();
  let complete = false;
  let valid = false;
  let consumed = 0;

  (function walk(i, p) {
    const key = i * 4096 + p;
    if (seen.has(key)) return;
    seen.add(key);
    if (p === L && i > consumed) consumed = i;
    if (i === n) {
      if (p === L) { complete = true; valid = true; }
      return;
    }
    for (const v of tokens[i].v) {
      if (v === '') { walk(i + 1, p); continue; }
      const rest = L - p;
      if (rest === 0) valid = true;
      else if (rest < v.length) {
        if (v.startsWith(typed.slice(p))) { valid = true; if (i > consumed) consumed = i; }
      } else if (typed.startsWith(v, p)) walk(i + 1, p + v.length);
    }
  })(0, 0);

  return { valid, complete, consumed };
}
