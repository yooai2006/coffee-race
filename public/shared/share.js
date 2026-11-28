// 결과 공유 이미지: 결과 화면 내용을 1080×1350(세로 4:5) PNG로 그린다.
// 화면을 그대로 찍지 않고 따로 그린다 (폰마다 크기가 다르고, 버튼까지 찍히지 않게).
import { characterUrl } from './animal-icons.js';

const W = 1080, H = 1350;
const C = { bg: '#c6b2f4', ink: '#3b2c52', soft: '#6b5c85', paper: '#fffdf8', paper2: '#f4efff', yellow: '#ffd84d', pink: '#ff7aa8',
  loserBg: '#ffe3ec', gold: '#ffd84d', silver: '#dfe3ea', bronze: '#ffb58a' };
const FUN = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const BODY = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// 글자가 maxW를 넘으면 줄여서 맞춘다
function fitFont(ctx, text, maxW, size, family, weight = '') {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; } while (ctx.measureText(text).width > maxW && (s -= 2) > 12);
  return s;
}
const box = (ctx, x, y, w, h, r, fill, stroke = null, lw = 0) => {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
};

// data: ui.showResult 에 들어온 { title, loser: { name, animal, color }, rows: [{ rank|mark, name, animal, color, note, loser }] }
export async function renderResultImage({ title, loser, rows }) {
  try { await document.fonts.load(`64px "Jua"`); } catch { /* 글꼴이 없으면 기본 글꼴 */ }
  const imgs = new Map();
  await Promise.all([loser.animal, ...rows.map(r => r.animal)].map(async a => { if (!imgs.has(a)) imgs.set(a, await loadImg(characterUrl(a))); }));

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.textBaseline = 'middle';

  // 배경: 보라 종이 + 점무늬 + 모서리 체크 테이프
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (let y = 12; y < H; y += 30) for (let x = 12; x < W; x += 30) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
  const tape = (x, y, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,.75)' : 'rgba(139,107,232,.55)'; ctx.fillRect(-120 + i * 20, -30 + j * 20, 20, 20); }
    ctx.restore();
  };
  tape(40, 40, -0.6); tape(W - 40, H - 40, -0.6);

  // 제목 스티커
  ctx.save(); ctx.translate(W / 2, 110); ctx.rotate(-0.035);
  const ts = fitFont(ctx, title, 760, 68, FUN), tw = ctx.measureText(title).width;
  box(ctx, -tw / 2 - 40, -62, tw + 80, 124, 26, 'rgba(59,44,82,.14)');
  box(ctx, -tw / 2 - 40, -68, tw + 80, 124, 26, C.paper);
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `${ts}px ${FUN}`; ctx.fillText(title, 0, -4);
  ctx.restore();

  // 커피 당첨 카드 (노란 종이)
  ctx.save(); ctx.translate(W / 2, 360); ctx.rotate(-0.025);
  box(ctx, -470, -150, 940, 300, 40, 'rgba(59,44,82,.18)');
  box(ctx, -470, -160, 940, 300, 40, C.yellow);
  ctx.textAlign = 'left';
  ctx.font = `130px ${BODY}`; ctx.fillText('☕', -430, -10);
  ctx.fillStyle = C.soft; ctx.font = `40px ${FUN}`; ctx.fillText('오늘의 커피는', -250, -80);
  const ns = fitFont(ctx, loser.name, 430, 120, FUN), nw = ctx.measureText(loser.name).width;
  ctx.fillStyle = C.pink; ctx.fillRect(-256, 40, nw + 12, 22);
  ctx.fillStyle = C.ink; ctx.font = `${ns}px ${FUN}`; ctx.fillText(loser.name, -250, 10);
  const li = imgs.get(loser.animal);
  if (li) { ctx.save(); ctx.translate(330, -10); ctx.rotate(0.1); ctx.drawImage(li, -110, -110, 220, 220); ctx.restore(); }
  ctx.restore();

  // 순위 목록
  const top = 560, bottom = H - 110, n = rows.length;
  const rowH = Math.min(112, (bottom - top - 40 - (n - 1) * 12) / n), listH = n * rowH + (n - 1) * 12 + 40;
  box(ctx, 70, top, W - 140, listH, 36, C.paper);
  rows.forEach((r, i) => {
    const y = top + 20 + i * (rowH + 12), cy = y + rowH / 2, s = rowH / 112;
    box(ctx, 90, y, W - 180, rowH, rowH / 2, r.loser ? C.loserBg : C.paper2, r.loser ? C.pink : null, 6);
    // 순위 동그라미
    const rk = r.rank ?? r.mark ?? '';
    ctx.beginPath(); ctx.arc(90 + rowH / 2, cy, 38 * s, 0, 7);
    ctx.fillStyle = r.rank === 1 ? C.gold : r.rank === 2 ? C.silver : r.rank === 3 ? C.bronze : '#fff'; ctx.fill();
    ctx.lineWidth = 5 * s; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `${Math.round((typeof rk === 'number' ? 40 : 36) * s)}px ${typeof rk === 'number' ? FUN : BODY}`;
    ctx.fillText(String(rk), 90 + rowH / 2, cy + 2);
    // 동물 동그라미 (참가자 색 테두리)
    const ax = 90 + rowH + 50 * s;
    ctx.save(); ctx.beginPath(); ctx.arc(ax, cy, 44 * s, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    const im = imgs.get(r.animal); if (im) ctx.drawImage(im, ax - 50 * s, cy - 50 * s, 100 * s, 100 * s);
    ctx.restore();
    ctx.beginPath(); ctx.arc(ax, cy, 44 * s, 0, 7); ctx.lineWidth = 6 * s; ctx.strokeStyle = r.color; ctx.stroke();
    // 이름 + 기록
    const tx = ax + 70 * s, maxW = W - 120 - tx;
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink;
    fitFont(ctx, r.name + (r.loser ? ' ☕' : ''), maxW, Math.round(44 * s), FUN);
    ctx.fillText(r.name + (r.loser ? ' ☕' : ''), tx, cy - 18 * s);
    ctx.fillStyle = C.soft; fitFont(ctx, r.note || '', maxW, Math.round(28 * s), BODY, '600');
    ctx.fillText(r.note || '', tx, cy + 24 * s);
  });

  // 아래: 날짜 + 앱 이름
  const d = new Date(), pad = x => String(x).padStart(2, '0');
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `36px ${FUN}`;
  ctx.fillText(`☕ 커피 내기 · ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`, W / 2, H - 55);

  return new Promise(res => cv.toBlob(res, 'image/png'));
}
