/* "分享": render the stats card to a PNG, preview it and download it. */
import { $, h } from './util.js';

function drawShareCanvas(d) {
  const W = 1200, H = 630;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const cs = getComputedStyle(document.documentElement);
  const col = (n) => cs.getPropertyValue(n).trim();
  const FONT = '"Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif';
  const rr = (px, py, w, hh, r) => {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + hh, r); x.arcTo(px + w, py + hh, px, py + hh, r);
    x.arcTo(px, py + hh, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  };
  x.fillStyle = col('--bg'); x.fillRect(0, 0, W, H);
  x.fillStyle = col('--panel'); rr(30, 30, W - 60, H - 60, 20); x.fill();
  x.strokeStyle = col('--line'); x.lineWidth = 2; x.stroke();

  x.textBaseline = 'alphabetic';
  x.fillStyle = col('--text'); x.font = `700 52px ${FONT}`;
  x.fillText(d.name, 70, 125, W - 140);
  x.fillStyle = col('--muted'); x.font = `24px ${FONT}`;
  x.fillText(d.subtitle, 70, 168, W - 140);

  // stat tiles (3 x 2)
  const tw = 330, th = 104, gx = 24, gy = 16, ox = 70, oy = 192;
  d.tiles.forEach((tile, i) => {
    const px = ox + (i % 3) * (tw + gx), py = oy + Math.floor(i / 3) * (th + gy);
    x.fillStyle = col('--bg'); rr(px, py, tw, th, 12); x.fill();
    x.fillStyle = col('--muted'); x.font = `22px ${FONT}`; x.fillText(tile[0], px + 20, py + 34);
    x.fillStyle = col('--text'); x.font = `700 44px ${FONT}`; x.fillText(tile[1], px + 20, py + 82, tw - 40);
  });

  // last 14 days of practice minutes
  const cx = 70, cy = 468, cw = W - 140, ch = 76;
  x.fillStyle = col('--muted'); x.font = `20px ${FONT}`;
  x.fillText('最近 14 天練習時間（分鐘）', cx, cy - 8);
  const max = Math.max(1, ...d.days.map((v) => v.value));
  const bw = cw / d.days.length;
  d.days.forEach((v, i) => {
    const bh = Math.max(v.value > 0 ? 4 : 0, (ch - 6) * (v.value / max));
    x.fillStyle = v.value > 0 ? col('--accent') : col('--line');
    rr(cx + i * bw + bw * 0.18, cy + ch - (v.value > 0 ? bh : 3), bw * 0.64, v.value > 0 ? bh : 3, 4); x.fill();
  });

  // footer: date on the left, icon + title on the right
  x.fillStyle = col('--muted'); x.font = `18px ${FONT}`;
  const brand = '魔光鍵影 Playground';
  const bwid = x.measureText(brand).width;
  x.fillText(brand, W - 70 - bwid, H - 48);
  if (d.icon) x.drawImage(d.icon, W - 70 - bwid - 32, H - 48 - 22, 26, 26);
  x.fillText(d.date, 70, H - 48);
  return cv;
}

export function closeShare() {
  const m = $('#share-modal');
  if (m) { URL.revokeObjectURL(m.dataset.url); m.remove(); }
}

const iconImg = new Promise((res) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => res(null);
  im.src = 'assets/icon.ico';
});

export async function openShare(d) {
  closeShare();
  d.icon = await iconImg;
  drawShareCanvas(d).toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const fname = `魔光鍵影-${d.name.replace(/[\\/:*?"<>|#\s]+/g, '_')}-${d.fileDate}.png`;
    const download = () => { const a = h('a', { href: url, download: fname }); document.body.append(a); a.click(); a.remove(); };
    const modal = h('div', { class: 'modal', id: 'share-modal', onclick: (e) => { if (e.target === modal) closeShare(); } },
      h('div', { class: 'modal-box' },
        h('div', { class: 'modal-title' }, '分享圖片預覽', h('span', { class: 'sub' }, '已自動下載，可再次下載或直接長按／右鍵複製')),
        h('img', { src: url, alt: '成績分享圖片' }),
        h('div', { class: 'modal-actions' },
          h('button', { class: 'ghost', onclick: closeShare }, '關閉'),
          h('button', { class: 'primary', onclick: download }, '再次下載'))));
    modal.dataset.url = url;
    document.body.append(modal);
    download();
  }, 'image/png');
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#share-modal')) closeShare(); });
