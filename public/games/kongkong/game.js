// ⏱ 콩콩팥팥: 폰을 돌려 가며 스톱워치를 두 번씩 멈춘다. 1/100초 끝자리 두 개를 곱해 가장 낮은 사람이 커피를 산다.
// 끝자리가 0이면 그 자리에서 당첨. 규칙은 plan.js. 화면은 3D가 아니라 2D(DOM)로 그린다.
// 다른 게임과 달리 결과는 시작할 때 정해지지 않고, 사람이 누르는 순간 정해진다.
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { ANIMALS } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { beep } from '../../shared/audio.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { ui } from '../../shared/ui.js';
import { animalImg, animalChip } from '../../shared/animal-icons.js';
import { createMatch, current, currentRound, submit, product, formatTime } from './plan.js';

const asset = p => new URL(`../../assets/kongkong/${p}`, import.meta.url).href;
const MAX_MS = 60000;   // 1분이 지나도 안 멈추면 자동으로 멈춘다

export default {
  id: 'kongkong',
  title: '콩콩팥팥',
  emoji: '⏱',
  rule: '스톱워치를 두 번 멈춰 1/100초 끝자리끼리 곱해요. 곱이 가장 낮으면 커피! 끝자리가 0이면 바로 당첨. 폰을 돌려 가며 해요.',
  startLabel: '⏱ 게임 시작',
  // 평균 걸리는 시간(초): 한 명당 약 11 (넘기기 3 + 굴리기 2번 6 + 결과 2) + 결과까지 3
  seconds: n => 3 + 11 * n,
  create,
};

function create() {
  // 3D 장면은 쓰지 않지만 앱 형식에 맞춰 빈 장면을 둔다 (화면은 아래 DOM이 덮는다)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc6b2f4);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 10);

  // ───────────── 화면 (DOM) ─────────────
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.className = 'kk hidden';
  root.innerHTML = `
    <div class="kkFrame">
      <div class="kkPlay">
        <div class="kkWho"><span class="kkChip"></span><b class="kkName"></b><span class="kkStep"></span></div>
        <div class="kkWatch">
          <img src="${asset('stopwatch.webp')}" alt="" draggable="false">
          <div class="kkFace"><div class="kkTime"></div><div class="kkEq"></div></div>
        </div>
        <button class="btn big yellow kkBtn tap" type="button">시작</button>
        <p class="kkTip">끝자리가 <b>0</b>이면 바로 커피! ☕</p>
      </div>
      <div class="kkHand hidden">
        <div class="kkCard">
          <div class="kkRound"></div>
          <div class="kkFace2"></div>
          <div class="kkHandName"></div>
          <div class="kkHandSub"></div>
          <div class="kkOrder"></div>
          <button class="btn big yellow kkReady tap" type="button">준비됐어요</button>
        </div>
      </div>
      <div class="kkBeans"></div>
    </div>`;
  document.body.appendChild(root);
  const $k = s => root.querySelector(s);
  const btn = $k('.kkBtn'), timeEl = $k('.kkTime'), eqEl = $k('.kkEq'), watch = $k('.kkWatch');

  let players = [], match = null, phase = 'idle', t0 = 0, token = 0;
  const later = (ms, fn) => { const tk = token; setTimeout(() => { if (tk === token) fn(); }, ms); };
  const name = id => players[id].name, color = id => PLAYER_COLORS[id], animal = id => ANIMALS[players[id].animal];

  // 시간 글자: 한 글자씩 같은 폭 칸에 넣어 숫자가 바뀌어도 흔들리지 않게. 끝자리는 강조
  function showTime(ms, done = false) {
    const s = formatTime(ms);
    timeEl.innerHTML = [...s].map((c, i) => i === s.length - 1
      ? `<em class="${done ? 'hit' : ''}">${c}</em>` : `<span${c === '.' ? ' class="dot"' : ''}>${c}</span>`).join('');
  }
  function showEq(id) {
    const d = currentRound(match).rolls[id] || [];
    const p = product(d);
    eqEl.innerHTML = `${d[0] ?? '?'} × ${d[1] ?? '?'}${d.length === 2 || p === 0 ? ` = <b>${p}</b>` : ''}`;
  }

  // ── 정보판: 이번 바퀴 순서대로 기록, 지금 최하위(커피 후보)에 ☕ ──
  function hud() {
    const r = currentRound(match), cur = current(match);
    const scores = r.order.map(id => product(r.rolls[id] || [])), done = scores.filter(s => s !== null);
    const low = done.length ? Math.min(...done) : null;
    const rows = r.order.map((id, i) => {
      const d = r.rolls[id] || [], s = scores[i];
      const mark = s !== null ? s : cur?.id === id ? '▶' : '·';
      const detail = d.length ? `${d[0]} × ${d[1] ?? '?'}` : '대기';
      return `<div class="r${s === null && cur?.id !== id ? ' done' : ''}"><b>${mark}</b>${animalChip(players[id].animal, color(id))}${esc(name(id))}${s !== null && s === low ? ' ☕' : ''} <small>${detail}</small></div>`;
    });
    ui.hud(match.rounds.length > 1 ? `🔥 재대결 ${match.rounds.length - 1}` : '콩콩팥팥', rows.join(''));
  }

  // ── 차례 넘기기 화면 ──
  function showHand() {
    const cur = current(match), r = currentRound(match);
    phase = 'hand';
    $k('.kkRound').textContent = cur.round > 1 ? '🔥 동점 재대결!' : `${r.order.indexOf(cur.id) + 1}번째 차례`;
    $k('.kkFace2').innerHTML = animalImg(players[cur.id].animal);
    $k('.kkHandName').textContent = `${name(cur.id)} 차례!`;
    $k('.kkHandSub').textContent = `폰을 ${name(cur.id)}에게 넘겨 주세요`;
    $k('.kkOrder').textContent = `순서: ${r.order.map(name).join(' → ')}`;
    $k('.kkHand').classList.remove('hidden');
    hud();
  }
  function ready() {
    if (phase !== 'hand') return;
    const cur = current(match);
    $k('.kkHand').classList.add('hidden');
    $k('.kkChip').innerHTML = animalChip(players[cur.id].animal, color(cur.id));
    $k('.kkName').textContent = name(cur.id);
    showTime(0); showEq(cur.id); watch.classList.remove('shake');
    setRollReady(cur.roll);
    playCall(animal(cur.id).name, { vol: 0.6 });
  }
  function setRollReady(roll) {
    phase = 'ready';
    $k('.kkStep').textContent = `${roll + 1}번째 굴리기`;
    btn.textContent = roll ? '두 번째 시작' : '시작';
    btn.classList.remove('run'); btn.disabled = false;
  }

  // ── 스톱워치: 탭 시작 → 탭 멈춤 ──
  function press() {
    if (phase === 'ready') {
      phase = 'run'; t0 = performance.now();
      btn.textContent = '멈춰!'; btn.classList.add('run');
      beep(660);
    } else if (phase === 'run') stopAt(performance.now() - t0);
  }
  function stopAt(ms) {
    phase = 'lock'; btn.disabled = true; btn.classList.remove('run');
    const cur = current(match), ev = submit(match, ms);
    showTime(ms, true); showEq(cur.id);
    btn.textContent = ev.digit === 0 ? '끝자리 0… 콩!' : `끝자리 ${ev.digit}!`;
    beep(990); beans(ev.type === 'zero' ? 14 : 1);
    if (ev.type === 'roll') { later(700, () => setRollReady(1)); hud(); return; }
    if (ev.type === 'zero') {
      ui.flash(); ui.pop('콩!'); watch.classList.add('shake');
      ui.banner(`☕ ${name(ev.loser)} 당첨! 끝자리 0`);
      playCall(animal(ev.loser).name, { vol: 1 });
      later(700, () => playLoserCry(animal(ev.loser).name));
      hud(); later(2800, showResult); return;
    }
    // 두 번째 굴림까지 끝
    ui.pop(String(ev.score), { mid: true });
    hud();
    if (ev.type === 'turn') later(1700, showHand);
    else if (ev.type === 'tie') { later(1200, () => ui.banner(`🔥 동점! ${ev.ids.map(name).join(', ')} 재대결`)); later(2600, () => { ui.hideBanner(); showHand(); }); }
    else if (ev.type === 'done') {
      later(1200, () => { ui.banner(`☕ ${name(ev.loser)} 당첨! 가장 낮은 ${currentScore(ev.loser)}`); playLoserCry(animal(ev.loser).name); });
      later(3600, showResult);
    }
  }
  const currentScore = id => product(currentRound(match).rolls[id] || []);

  // 커피콩·팥이 스톱워치에서 튀어 오른다
  let beanFlip = 0;
  function beans(n) {
    const box = $k('.kkBeans'), fr = $k('.kkFrame').getBoundingClientRect(), w = watch.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const img = document.createElement('img');
      img.src = asset((beanFlip++ % 2) ? 'bean-red.webp' : 'bean-coffee.webp'); img.alt = '';
      img.style.left = `${w.left - fr.left + w.width / 2 - 32}px`; img.style.top = `${w.top - fr.top + w.height * 0.3}px`;
      img.style.setProperty('--dx', `${(Math.random() - 0.5) * (n > 1 ? 320 : 160)}px`);
      img.style.setProperty('--r', `${(Math.random() - 0.5) * 540}deg`);
      img.style.animationDelay = `${i * 30}ms`;
      box.appendChild(img);
      setTimeout(() => img.remove(), 1400 + i * 30);
    }
  }

  // ── 결과 ──
  function showResult() {
    phase = 'end';
    const L = match.loser, ids = players.map((_, i) => i);
    // 한 사람의 기록: 참가한 바퀴마다 "3 × 4 = 12", 재대결은 → 로 잇는다
    const history = id => match.rounds.filter(r => r.rolls[id]).map(r => {
      const d = r.rolls[id], p = product(d);
      return `${d.join(' × ')}${p !== null ? ` = ${p}` : ''}`;
    });
    const last = id => { const rs = match.rounds.filter(r => r.rolls[id]); return rs.length ? product(rs[rs.length - 1].rolls[id]) : null; };
    const others = ids.filter(id => id !== L).sort((a, b) => (last(a) ?? 1e9) - (last(b) ?? 1e9));
    ui.showResult({
      loser: { name: name(L), animal: players[L].animal, color: color(L) },
      rows: [L, ...others].map(id => {
        const h = history(id);
        return {
          mark: id === L ? '☕' : h.length ? '😮‍💨' : '🍀', name: name(id), animal: players[id].animal, color: color(id), loser: id === L,
          note: `${animal(id).name} · ${h.length ? h.join(' → ') + (id === L && match.zero ? ' 콩!' : '') : '차례 전에 끝남'}`,
        };
      }),
    });
  }

  // ── 입력 ──
  // 시간이 중요하므로 click이 아니라 pointerdown에서 바로 잰다
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if (!btn.disabled) press(); });
  watch.addEventListener('pointerdown', e => { e.preventDefault(); if (!btn.disabled) press(); });
  $k('.kkReady').addEventListener('click', ready);
  addEventListener('keydown', e => {
    if (root.classList.contains('hidden') || e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (phase === 'hand') ready(); else if (!btn.disabled) press(); }
  });

  // ───────────── 게임 인터페이스 ─────────────
  function start(ps) {
    token++;
    players = ps; match = createMatch(ps.map((_, i) => i));
    root.classList.remove('hidden');
    $k('.kkBeans').innerHTML = ''; watch.classList.remove('shake');
    showTime(0); eqEl.textContent = '';
    showHand();
  }
  function stop() {
    token++; phase = 'idle';
    root.classList.add('hidden');
  }
  function update() {
    if (phase !== 'run') return;
    const ms = performance.now() - t0;
    if (ms >= MAX_MS) stopAt(MAX_MS - 1); else showTime(ms);
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

  return { scene, camera, start, stop, update, resize };
}
