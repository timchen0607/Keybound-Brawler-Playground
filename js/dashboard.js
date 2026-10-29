/* Dashboard page: summary cards, charts, tables. */
import { $, h, svgEl, LANG_NAME, pad2, dayKey, dayNum, fmtDate, fmtDur } from './util.js';
import { stats, resetStats, dashFilter, saveDashFilter, displayName } from './state.js';
import { openShare } from './share.js';

function card(l, v, s) {
  return h('div', { class: 'card' }, h('div', { class: 'l' }, l), h('div', { class: 'v' }, v), h('div', { class: 's' }, s || ' '));
}
function panel(title, body, wide) {
  return h('div', { class: 'panel' + (wide ? ' wide' : '') }, h('h3', null, title), body);
}
const empty = (t) => h('div', { class: 'empty' }, t || '還沒有足夠的資料。');
function table(heads, rows) {
  return h('table', null,
    h('thead', null, h('tr', null, heads.map((x, i) => h('th', { class: i ? 'n' : '' }, x)))),
    h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => h('td', { class: i ? 'n' : '' }, c))))));
}
const wordCell = (r) => (r.k && r.l === 'ja' ? h('span', null, r.t, h('span', { class: 'sub' }, r.k)) : r.t);

// items: [{ label, value, tip }]
function barChart(items, label) {
  const W = 600, H = 150, pad = { l: 34, r: 6, t: 8, b: 20 };
  const max = Math.max(0.1, ...items.map((x) => x.value));
  const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
  [0, 0.5, 1].forEach((f) => {
    const y = pad.t + (H - pad.t - pad.b) * (1 - f);
    svg.append(svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y }));
    const t = svgEl('text', { x: pad.l - 4, y: y + 3, 'text-anchor': 'end' });
    t.textContent = (max * f).toFixed(max >= 10 ? 0 : 1);
    svg.append(t);
  });
  const bw = (W - pad.l - pad.r) / items.length;
  items.forEach((x, i) => {
    const bh = (H - pad.t - pad.b) * (x.value / max);
    const r = svgEl('rect', { class: 'b', x: pad.l + i * bw + bw * 0.15, width: bw * 0.7, y: H - pad.b - bh, height: bh, rx: 2 });
    const tt = svgEl('title');
    tt.textContent = x.tip;
    r.append(tt);
    svg.append(r);
    if (x.label && (items.length <= 14 || i % 2 === 0)) {
      const t = svgEl('text', { x: pad.l + i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle' });
      t.textContent = x.label;
      svg.append(t);
    }
  });
  return svg;
}

function streaks() {
  const nums = Object.keys(stats.days).filter((k) => stats.days[k] > 0).map(dayNum).sort((a, b) => a - b);
  let best = 0, run = 0;
  nums.forEach((n, i) => { run = i && n === nums[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  const set = new Set(nums);
  const today = dayNum(dayKey(Date.now()));
  let cur = 0;
  let d = set.has(today) ? today : today - 1;       // a streak stays alive until the day is over
  while (set.has(d)) { cur++; d--; }
  return { cur, best, today: set.has(today) };
}

export function renderDash() {
  const root = $('#view-dash');
  root.textContent = '';
  const chip = (key, val, label) => h('button', {
    class: 'chip' + (dashFilter[key] === val ? ' on' : ''),
    onclick: () => { dashFilter[key] = val; saveDashFilter(); renderDash(); },
  }, label);
  root.append(h('div', { class: 'filters' },
    chip('lang', 'all', '全部語言'), chip('lang', 'ja', '日文'), chip('lang', 'en', '英文'),
    h('span', { class: 'sep' }),
    chip('mode', 'all', '全部模式'), chip('mode', 'timed', '計時'), chip('mode', 'free', '自由')));

  const ss = stats.sessions.filter((x) => (dashFilter.lang === 'all' || x.lang === dashFilter.lang) &&
                                          (dashFilter.mode === 'all' || x.mode === dashFilter.mode));
  const ws = Object.values(stats.words).filter((x) => dashFilter.lang === 'all' || x.l === dashFilter.lang);

  const sum = (f) => ss.reduce((a, x) => a + f(x), 0);
  const act = sum((x) => x.act), cl = sum((x) => x.cl), ex = sum((x) => x.ex), err = sum((x) => x.err), ms = sum((x) => x.ms);
  const fastest = ss.filter((x) => x.cl >= 3 && x.avg != null).reduce((b, x) => (!b || x.avg < b.avg ? x : b), null);
  const st = streaks();
  const dayList = [];
  for (let i = 13; i >= 0; i--) {
    const dd = new Date(); dd.setDate(dd.getDate() - i);
    const k = dayKey(dd.getTime());
    dayList.push({ value: (stats.days[k] || 0) / 60, label: `${dd.getMonth() + 1}/${dd.getDate()}`, key: k });
  }

  root.append(h('div', { class: 'share-row' }, h('button', {
    class: 'ghost',
    onclick: () => {
      const f = [dashFilter.lang === 'all' ? '全部語言' : LANG_NAME[dashFilter.lang],
                 dashFilter.mode === 'all' ? '全部模式' : (dashFilter.mode === 'timed' ? '計時' : '自由')];
      const now = new Date();
      openShare({
        name: displayName(),
        subtitle: f.join(' · ') + ' · 練習成績',
        date: `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}`,
        fileDate: dayKey(now.getTime()),
        tiles: [
          ['練習場次', String(ss.length)],
          ['每詞平均用時', cl ? (ms / cl / 1000).toFixed(1) + ' 秒' : '—'],
          ['正確率', cl + err ? Math.round((cl / (cl + err)) * 100) + '%' : '—'],
          ['消除單詞', String(cl)],
          ['累計練習', fmtDur(act)],
          ['連續練習', st.cur + ' 天'],
        ],
        days: dayList,
      });
    },
  }, '分享')));

  root.append(h('div', { class: 'cards' },
    card('練習場次', String(ss.length), ss.length ? `累計 ${fmtDur(act)}` : ''),
    card('每詞平均用時', cl ? (ms / cl / 1000).toFixed(1) + ' 秒' : '—', `共消除 ${cl} 個`),
    card('最快場次（每詞）', fastest ? fastest.avg.toFixed(1) + ' 秒' : '—', fastest ? fmtDate(fastest.ts) : '至少消除 3 個才列入'),
    card('正確率', cl + err ? Math.round((cl / (cl + err)) * 100) + '%' : '—', `${err} 次送出失敗`),
    card('每分鐘消除單詞', act ? (cl / (act / 60)).toFixed(1) : '—', ''),
    card('逾時未打', String(ex), cl + ex ? `佔 ${Math.round((ex / (cl + ex)) * 100)}%` : ''),
    card('連續練習天數', `${st.cur} 天`, st.cur && !st.today ? '今天還沒練習' : `最長 ${st.best} 天`)));

  const panels = h('div', { class: 'panels' });

  const recent = ss.filter((x) => x.avg != null).slice(-20);
  panels.append(panel('最近 20 場：每詞平均用時（秒，越低越好）', recent.length
    ? barChart(recent.map((x) => ({ value: x.avg, tip: `${fmtDate(x.ts)}  每詞 ${x.avg.toFixed(1)} 秒  消除 ${x.cl} 個` })), '最近場次的每詞平均用時')
    : empty(), true));

  const days = dayList.map((x) => Object.assign({}, x, { tip: `${x.key}  ${x.value.toFixed(1)} 分鐘` }));
  panels.append(panel('每日練習時間（最近 14 天，分鐘；不受上方篩選影響）',
    days.some((x) => x.value > 0) ? barChart(days, '每日練習分鐘數') : empty(), true));

  const worst = ws.filter((x) => x.miss > 0)
    .sort((a, b) => b.miss - a.miss || b.exp - a.exp).slice(0, 10);
  panels.append(panel('最常輸入錯誤的單詞 Top 10', worst.length
    ? table(['單詞', '打錯', '逾時', '出現'], worst.map((x) => [wordCell(x), String(x.miss), String(x.exp), String(x.shown)]))
    : empty('目前沒有錯誤紀錄。')));

  const slow = ws.filter((x) => x.cleared >= 2)
    .map((x) => ({ x, avg: x.ms / x.cleared / 1000 })).sort((a, b) => b.avg - a.avg).slice(0, 10);
  panels.append(panel('最耗時的單詞 Top 10（平均秒數）', slow.length
    ? table(['單詞', '平均秒數', '完成次數'], slow.map((s) => [wordCell(s.x), s.avg.toFixed(1), String(s.x.cleared)]))
    : empty('單詞需至少完成 2 次才會列入。')));

  const timeouts = ws.filter((x) => x.exp > 0).sort((a, b) => b.exp - a.exp).slice(0, 10);
  panels.append(panel('最常逾時的單詞 Top 10', timeouts.length
    ? table(['單詞', '逾時', '出現'], timeouts.map((x) => [wordCell(x), String(x.exp), String(x.shown)]))
    : empty('目前沒有逾時紀錄。')));

  panels.append(panel('最近 10 場', ss.length
    ? table(['時間', '語言／模式', '每詞', '正確率', '消除'], ss.slice(-10).reverse().map((x) => [
        fmtDate(x.ts), `${LANG_NAME[x.lang]}／${x.mode === 'timed' ? '計時' : '自由'}`,
        x.avg == null ? '—' : x.avg.toFixed(1) + ' 秒', x.acc == null ? '—' : Math.round(x.acc * 100) + '%', String(x.cl)]))
    : empty()));

  root.append(panels);
  root.append(h('div', { class: 'danger' }, h('button', {
    class: 'ghost',
    onclick: () => {
      if (!confirm('確定要清除所有練習紀錄？設定會保留。')) return;
      resetStats();
      renderDash();
    },
  }, '清除紀錄')));
}
