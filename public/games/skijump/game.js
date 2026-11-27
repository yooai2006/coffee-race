// 🎿 스키점프: 한 마리씩 점프대를 타고 날아간다. 가장 짧게 날아간 동물(착지하다 굴러 눈덩이가 됨)의 주인이 커피를 산다.
// TV 중계처럼: 선수 소개 자막 → 활강(뒤에서) → 도약 슬로모션 → 비행(옆에서) → 착지 거리 → 순위표.
// 순서와 거리는 plan.js에서 시작할 때 정한다. 연출은 async 함수(runGame)로 순서대로 쓴다 (룰렛과 같은 방식).
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { canvasTex, disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { makeExclaim, animateExclaim } from '../../shared/fx.js';
import { ui } from '../../shared/ui.js';
import { planSkiJump, flight, hillY, TRICKS, HIGH_VY0, LIP_Y, HILL_LEN, OUTRUN_X } from './plan.js';
import { createSkiAudio } from './sound.js';

const PI = Math.PI;
const T_INTRO = 1.4, T_INRUN = 2.6, SLOWMO = 0.5, SLOW_RATE = 0.3, T_SLIDE = 2.0;
const INRUN = new THREE.CatmullRomCurve3([[-66, 44], [-44, 29], [-22, 13], [-8, 5.8], [0, LIP_Y]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
const LINES = [80, 90, 100, 110, 120, 130], K_POINT = 120;
const ease = k => 1 - (1 - k) ** 3;

export default {
  id: 'skijump',
  title: '스키점프',
  emoji: '🎿',
  rule: '한 마리씩 점프대를 타고 날아갑니다. 가장 짧게 날아간 동물(착지하다 굴러서 눈덩이가 돼요)의 주인이 커피를 삽니다.',
  startLabel: '🎿 경기 시작',
  // 평균 걸리는 시간(초): 시작 약 2 + 한 명당 약 12.5 (소개 1.4 + 활강 2.6 + 비행·슬로모션 약 5 + 착지 2 + 거리 1.4) + 마지막 4
  seconds: n => 6 + 12.5 * n,
  create,
};

function create() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9d4f5);
  scene.fog = new THREE.Fog(0xa9d4f5, 120, 420);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 900);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb4c8, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  scene.add(sun, sun.target);

  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 1 });
  // ── 착지 언덕: 폭 40m 띠, 높이는 hillY ──
  {
    const xs = []; for (let x = -2; x <= OUTRUN_X + 80; x += 2) xs.push(x);
    const pos = [], idx = [];
    xs.forEach((x, i) => { const y = hillY(x); pos.push(x, y, -22, x, y, 22); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const hill = new THREE.Mesh(g, snow); hill.receiveShadow = true; scene.add(hill);
    // 거리 선과 숫자
    for (const d of LINES) {
      const y = hillY(d), slope = Math.atan2(hillY(d + 0.5) - hillY(d - 0.5), 1);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 28), new THREE.MeshBasicMaterial({ color: d === K_POINT ? 0xe53935 : 0x2f6fd6 }));
      line.position.set(d, y + 0.03, 0); line.rotation.z = slope; scene.add(line);
      for (const z of [-15.5, 15.5]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 64, (x, w, h) => {
          x.fillStyle = d === K_POINT ? '#e53935' : '#2f6fd6'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 14); x.fill();
          x.fillStyle = '#fff'; x.font = 'bold 36px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(`${d}m`, w / 2, h / 2 + 2);
        }) }));
        sp.scale.set(4, 2, 1); sp.position.set(d, y + 1.6, z); scene.add(sp);
      }
    }
    // 양옆 광고판 울타리
    const colors = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047];
    for (let x = 4, i = 0; x < OUTRUN_X + 40; x += 6, i++) for (const z of [-14, 14]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: colors[i % 4], roughness: 0.6 }));
      const y = hillY(x); b.position.set(x, y + 0.45, z); b.rotation.z = Math.atan2(hillY(x + 1) - y, 1); b.castShadow = true; scene.add(b);
    }
  }
  // ── 점프대(활강로) + 기둥 ──
  {
    const pts = INRUN.getSpacedPoints(60), pos = [], idx = [];
    pts.forEach((p, i) => { pos.push(p.x, p.y - 0.05, -1.6, p.x, p.y - 0.05, 1.6); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const ramp = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe8f1ff, roughness: 0.6, side: THREE.DoubleSide })); ramp.receiveShadow = true; scene.add(ramp);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 });
    for (const z of [-1.7, 1.7]) scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y + 0.5, z))), 80, 0.08, 6), railMat));
    const steel = new THREE.MeshStandardMaterial({ color: 0x7d8a99, roughness: 0.5, metalness: 0.4 });
    for (let i = 6; i < 60; i += 6) {
      const p = pts[i], hgt = p.y + 30;
      for (const z of [-1.4, 1.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, hgt, 0.5), steel); leg.position.set(p.x, p.y - hgt / 2 - 0.1, z); leg.castShadow = true; scene.add(leg); }
    }
  }
  // ── 정리 구간 관중, 나무, 먼 산 ──
  {
    const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), new THREE.MeshStandardMaterial(), 360), m = new THREE.Matrix4(), c = new THREE.Color();
    for (let k = 0; k < 360; k++) {
      const x = OUTRUN_X - 30 + Math.random() * 70, z = -(18 + Math.random() * 10);   // 관중은 카메라 반대편(-z)에만
      m.makeTranslation(x, hillY(x) + 0.6, z); crowd.setMatrixAt(k, m); crowd.setColorAt(k, c.setHSL(Math.random(), 0.65, 0.55));
    }
    scene.add(crowd);
    const N = 220, trunks = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 7, 7), new THREE.MeshStandardMaterial({ color: 0x2e5e3a, roughness: 1 }), N);
    const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    for (let k = 0; k < N; k++) {
      const x = -90 + Math.random() * 340, z = (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 70), sc = 0.7 + Math.random() * 0.8;
      trunks.setMatrixAt(k, m.compose(v.set(x, (x < 0 ? -10 + x * -0.3 : hillY(x)) + 3.5 * sc, z), q, s.set(sc, sc, sc)));
    }
    trunks.castShadow = true; scene.add(trunks);
    const rock = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 1 }), cap = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    for (const [x, z, r, h] of [[-120, -220, 90, 150], [60, -260, 120, 190], [220, -230, 80, 130], [-40, 240, 100, 140], [200, 260, 90, 160]]) {
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock); mtn.position.set(x, h / 2 - 70, z); scene.add(mtn);
      const top = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, h * 0.35, 7), cap); top.position.set(x, h - 70 - h * 0.175 + 0.5, z); scene.add(top);
    }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), snow); under.rotation.x = -PI / 2; under.position.y = -70; scene.add(under);
  }
  // ── 내리는 눈 (카메라 주변 상자 안을 돈다) ──
  const FLAKES = 1200, flakeGeo = new THREE.BufferGeometry(), flakePos = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES * 3; i++) flakePos[i] = (Math.random() - 0.5) * 60;
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85 }));
  scene.add(flakes);

  // ───────────── 상태 ─────────────
  const sound = createSkiAudio();
  let jumpers = [], plan = null, runToken = 0, tweens = [], playing = false, timeRate = 1;
  const camPos = new THREE.Vector3(60, 30, 60), camLook = new THREE.Vector3(40, -10, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let camMode = 'idle', active = null, camRate = 3;

  function tween(dur, fn) { return new Promise(res => tweens.push({ t: 0, dur, fn, res })); }
  const wait = d => tween(d, () => {});

  function makeJumper(p, i) {
    // holder(위치) → tilt(내리막/비행 기울기) → spinner(공중 기술: 몸 가운데를 축으로 돈다) → body(모델+스키)
    const holder = new THREE.Group(), tilt = new THREE.Group(), spinner = new THREE.Group(), body = new THREE.Group();
    holder.add(tilt); tilt.add(spinner); spinner.add(body);
    const model = makeAnimal(p.animal), s = THREE.MathUtils.clamp(1.8 / model.height, 0.5, 1.2);
    model.root.scale.setScalar(s); body.add(model.root);
    spinner.position.y = model.height * s / 2; body.position.y = -model.height * s / 2;
    const skiMat = new THREE.MeshStandardMaterial({ color: PLAYER_COLORS[i], roughness: 0.4 });
    for (const z of [-0.28, 0.28]) {
      const ski = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.16), skiMat); ski.position.set(0.3, 0.03, z); ski.castShadow = true; body.add(ski);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.16), skiMat); tip.position.set(1.65, 0.12, z); tip.rotation.z = 0.5; body.add(tip);
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), snow); ball.visible = false; ball.castShadow = true; holder.add(ball);
    const h = model.height * s, label = makeLabel(p.name, PLAYER_COLORS[i]); label.position.y = h + 1.0; holder.add(label);
    holder.visible = false; scene.add(holder);
    return { player: p, animal: ANIMALS[p.animal], color: PLAYER_COLORS[i], holder, tilt, spinner, model, trick: plan.trick[i], vy0: plan.vy0[i], ball, label, h, dist: plan.dist[i], done: false, rank: 0, phase: Math.random() * 6, exclaim: null };
  }
  function clearJumpers() { jumpers.forEach(j => disposeTree(j.holder)); jumpers = []; }

  // 순위표: 뛴 사람은 거리순, 지금 뛰는 사람 ⛷️, 아직 안 뛴 사람은 아래
  function hud() {
    const done = jumpers.filter(j => j.done).sort((a, b) => b.dist - a.dist);
    const rows = done.map((j, i) => `<div class="r"><b>${i + 1}</b><i style="background:${j.color}"></i>${esc(j.player.name)} <small style="opacity:.8">${j.dist.toFixed(1)}m${j === jumpers[plan.loser] ? ' ⛄' : ''}</small></div>`);
    if (active && !active.done) rows.push(`<div class="r"><b>⛷️</b><i style="background:${active.color}"></i>${esc(active.player.name)} <small style="opacity:.7">점프 중</small></div>`);
    const waiting = plan.order.map(i => jumpers[i]).filter(j => !j.done && j !== active);
    if (waiting.length) rows.push(`<div class="r done"><small>대기 ${waiting.map(j => esc(j.player.name)).join(', ')}</small></div>`);
    ui.hud('스키점프 순위', rows.join(''));
  }

  // 언덕 위 x에서 몸 기울기 (내리막 각도)
  const slopeAt = x => Math.atan2(hillY(x + 0.5) - hillY(x - 0.5), 1);
  // 착지 후 멈출 자리: 정리 구간에 나란히 선다
  const stopX = k => OUTRUN_X - 8 + (k % 2) * 3, stopZ = k => -6 + k * 2.4;   // 뒤에 뛴 사람일수록 카메라(+z) 쪽

  async function jump(j, k, alive) {
    active = j; j.holder.visible = true; j.label.visible = true;
    const n = plan.order.length;
    ui.banner(`⛷️ ${j.player.name} · ${j.animal.name} · ${k + 1}번째 선수${k === n - 1 ? ' (마지막)' : ''}`);
    hud();
    // 1) 출발대에서 대기
    const top = INRUN.getPointAt(0);
    j.holder.position.copy(top); j.tilt.rotation.z = Math.atan2(INRUN.getTangentAt(0).y, INRUN.getTangentAt(0).x);
    camMode = 'intro'; camRate = 100;   // 선수가 바뀌면 카메라를 바로 옮긴다
    sound.gate();
    await wait(T_INTRO); if (!alive()) return; camRate = 4;
    // 2) 활강: 점점 빨라진다
    camMode = 'inrun';
    await tween(T_INRUN, k2 => {
      const u = k2 ** 1.8, p = INRUN.getPointAt(u), tg = INRUN.getTangentAt(u);
      j.holder.position.copy(p); j.tilt.rotation.z = Math.atan2(tg.y, tg.x);
      j.model.animate(j.phase += 0.15, 0.15); sound.wind(k2);
    }); if (!alive()) return;
    // 3) 도약 + 비행: 처음 잠깐 슬로모션, 옆에서 본다
    const f = flight(j.dist, j.vy0);
    sound.takeoff(); camMode = 'flight'; camRate = 3;
    playCall(j.animal.name, { vol: 0.5 });
    if (j.vy0 >= HIGH_VY0 + 1.5) ui.banner(`🚀 ${j.player.name} 높이 솟구친다!`);
    timeRate = SLOW_RATE;
    let slowDone = false, called = false;
    await tween(f.T, kk => {
      const t = kk * f.T, [x, y] = f.pos(t), [x2, y2] = f.pos(Math.min(f.T, t + 0.05));
      j.holder.position.set(x, y, 0);
      // 날아가는 방향으로 기울이고, V자 비행은 앞으로 더 숙인다
      j.tilt.rotation.z = Math.atan2(y2 - y, x2 - x) * 0.6 - (j.trick === 'v' ? 0.3 : 0.1);
      const u = trickPose(j, kk);
      if (!called && u > 0) { called = true; ui.banner(`${TRICKS[j.trick].name}  ${j.player.name}`); sound.trick(); }
      if (!slowDone && t > SLOWMO) { slowDone = true; timeRate = 1; }   // 비행 처음 SLOWMO초만 느리게
      sound.wind(0.6 - 0.3 * kk);
    }); if (!alive()) return;
    timeRate = 1; sound.windOff(0.4);
    j.spinner.rotation.set(0, 0, 0); j.spinner.scale.setScalar(1);
    // 4) 착지
    const stopAt = jumpers.filter(o => o.done).length;
    if (jumpers.indexOf(j) === plan.loser) await tumble(j, alive);
    else await landWell(j, stopAt, alive);
    if (!alive()) return;
    j.done = true;
    const best = Math.max(...jumpers.filter(o => o.done).map(o => o.dist));
    ui.pop(`${j.dist.toFixed(1)}m`, { mid: true });
    if (j.dist === best && jumpers.filter(o => o.done).length > 1) { ui.banner(`🏆 신기록! ${j.player.name} ${j.dist.toFixed(1)}m`); sound.record(); }
    hud();
    await wait(1.4);
  }

  // 공중 기술 자세: 비행의 15%~80% 구간에서 돌고, 착지 전에 바로 선다. 돌아간 정도(0..1)를 돌려준다
  function trickPose(j, kk) {
    const u = Math.min(1, Math.max(0, (kk - 0.15) / 0.65)), e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2, r = j.spinner.rotation;
    r.set(0, 0, 0); j.spinner.scale.setScalar(1);
    switch (j.trick) {
      case 'backflip': r.z = 2 * PI * e; break;              // 뒤로 한 바퀴 (머리가 위→뒤)
      case 'frontflip': r.z = -2 * PI * e; break;            // 앞으로 한 바퀴
      case 'doubleflip': r.z = 4 * PI * e; break;            // 뒤로 두 바퀴
      case 'spin': r.y = 6 * PI * e; break;                  // 피겨처럼 제자리 세 바퀴
      case 'cork': r.x = 2 * PI * e; r.y = Math.sin(PI * e) * 0.6; break;   // 나사처럼 옆으로 굴러 한 바퀴
      case 'cheer': {                                        // 만세: 쭉 펴고 신나게 흔든다
        const w = Math.sin(PI * u);
        r.z = Math.sin(u * 30) * 0.35 * w; r.x = Math.sin(u * 22) * 0.25 * w;
        j.spinner.scale.set(1 + 0.15 * w, 1 + 0.25 * w, 1 + 0.15 * w);
        j.model.animate(j.phase += 0.35, w); break;
      }
    }
    return u;
  }

  async function landWell(j, k, alive) {
    sound.land((j.dist - 76) / 58);
    const x0 = j.dist, x1 = stopX(k), z1 = stopZ(k);
    await tween(T_SLIDE, kk => {
      const e = ease(kk), x = x0 + (x1 - x0) * e;
      j.holder.position.set(x, hillY(x), z1 * e);
      j.tilt.rotation.z = slopeAt(x) * (1 - e * 0.2);
      j.tilt.scale.y = 1 - 0.18 * Math.sin(Math.min(1, kk * 4) * PI);   // 텔레마크 착지: 살짝 웅크렸다 편다
      j.model.animate(j.phase += 0.08, 0.1 * (1 - kk));
    });
    if (!alive()) return;
    j.tilt.scale.y = 1; j.tilt.rotation.z = 0; j.holder.rotation.y = -PI / 2 + 0.3;   // 멈춰서 관중을 본다
    playCall(j.animal.name, { vol: 0.6 });
  }

  // 꼴찌: 착지하다 넘어져 데굴데굴 구르며 눈덩이가 된다. 멈추면 눈덩이 위로 얼굴이 쏙
  async function tumble(j, alive) {
    sound.land(0); sound.tumble();
    const x0 = j.dist, x1 = OUTRUN_X - 16, z1 = -12;   // 착지 구역을 비우고, 카메라 반대편(관중 쪽)으로 굴러간다
    j.ball.visible = true;
    await tween(2.2, kk => {
      const e = ease(kk), x = x0 + (x1 - x0) * e, r = 0.4 + 1.1 * Math.min(1, kk * 1.4);
      j.ball.scale.setScalar(r); j.ball.position.set(0, r, 0); j.ball.rotation.z -= 0.25 * (1 - kk);
      j.holder.position.set(x, hillY(x), z1 * e);
      j.tilt.visible = kk < 0.12; j.tilt.rotation.z -= 0.6;
    });
    if (!alive()) return;
    // 눈덩이(지름 3m) 위로 몸 위쪽 절반이 쏙 나온다
    j.tilt.visible = true; j.tilt.rotation.z = 0; j.tilt.position.y = 3.0 - j.h * 0.45; j.holder.rotation.y = -PI / 2 + 0.3;
    j.label.position.y = 3.0 + j.h * 0.55 + 0.6;
    j.exclaim = makeExclaim(); j.holder.add(j.exclaim);
    playCall(j.animal.name, { vol: 0.9 });
  }

  async function runGame(token) {
    const alive = () => token === runToken;
    sound.start();
    ui.banner('🎿 스키점프 · 가장 짧게 날아가면 커피!');
    camMode = 'overview';
    await wait(2.2); if (!alive()) return;
    for (const [k, i] of plan.order.entries()) {
      await jump(jumpers[i], k, alive); if (!alive()) return;
    }
    // 최종: 눈덩이가 된 꼴찌에게 카메라
    const L = jumpers[plan.loser];
    active = L; camMode = 'final'; camRate = 2;
    sound.stopMusic(0.8);
    ui.banner(`☕ ${L.player.name} 당첨!`);
    playLoserCry(L.animal.name);
    await wait(4); if (!alive()) return;
    showResult();
  }

  function showResult() {
    const sorted = [...jumpers].sort((a, b) => b.dist - a.dist);
    ui.showResult({
      title: `☕ 오늘의 커피는 ${jumpers[plan.loser].player.name}!`,
      head: ['순위', '참가자', '동물', '거리'],
      rows: sorted.map((j, i) => [
        j === jumpers[plan.loser] ? '☕' : ['🥇', '🥈', '🥉'][i] ?? `${i + 1}위`,
        esc(j.player.name),
        `<span class="dot" style="background:${j.color}"></span>${j.animal.name}`,
        `${j.dist.toFixed(1)}m${j === jumpers[plan.loser] ? ' ⛄' : ''}`,
      ]),
    });
  }

  // ───────────── 게임 인터페이스 ─────────────
  function start(players) {
    const token = ++runToken;
    stopAll();
    plan = planSkiJump(players.length);
    jumpers = players.map(makeJumper);
    resize();
    playing = true;
    runGame(token);
  }
  function stopAll() { tweens = []; timeRate = 1; active = null; sound.stop(0.2); clearJumpers(); }
  function stop() { runToken++; playing = false; camMode = 'idle'; stopAll(); }

  const tmp = new THREE.Vector3();
  function update(dt, time) {
    const gdt = dt * timeRate;
    for (const tw of tweens) { tw.t += gdt; tw.fn(Math.min(1, tw.t / tw.dur)); }
    const done = tweens.filter(tw => tw.t >= tw.dur); tweens = tweens.filter(tw => tw.t < tw.dur); done.forEach(tw => tw.res());

    // 다 뛴 동물은 정리 구간에서 숨쉬기, 지금 뛰는 동물 말고는 이름표를 숨긴다
    for (const j of jumpers) {
      if (j.done && j !== active) j.model.animate(j.phase += dt * 2, 0.06);
      j.label.visible = j.holder.visible && (j === active || camMode === 'final');
      if (j.exclaim) animateExclaim(j.exclaim, dt, time, 3.0 + j.h * 0.55 + 0.1);
    }

    // 카메라
    const portrait = camera.aspect < 1, far = portrait ? 1.6 : 1;
    const p = active?.holder.position;
    if (camMode === 'idle' || camMode === 'overview') {
      const a = time * 0.06;
      wantPos.set(70 + Math.cos(a) * 40 * far, 25 + 10 * far, 70 * far + Math.sin(a) * 20); wantLook.set(50, -20, 0); camRate = 2;
    } else if (camMode === 'intro') {
      wantPos.copy(p).add(tmp.set(5, 2.5, 6 * far)); wantLook.copy(p).add(tmp.set(0, 1, 0));
    } else if (camMode === 'inrun') {
      wantPos.copy(p).add(tmp.set(-6, 8, 4 * far)); wantLook.copy(p).add(tmp.set(9, -4, 0));   // 점프대 아래로 들어가지 않게 높이
    } else if (camMode === 'flight') {
      wantPos.set(p.x + 1, p.y + 2, p.z + 13 * far); wantLook.set(p.x + 4, p.y - 1.5, p.z);   // 공중 기술이 잘 보이게 가까이, 옆에서 따라간다
    } else if (camMode === 'final') {
      wantPos.copy(p).add(tmp.set(-7, 4, 7 * far)); wantLook.copy(p).add(tmp.set(0, 1.8, 0));
    }
    // 착지 뒤 미끄러지는 동안은 비행 시점 그대로 따라간다
    const k = 1 - Math.exp(-dt * camRate);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    if (camRate >= 100) camRate = 4;
    camera.position.copy(camPos); camera.lookAt(camLook);

    // 해 그림자가 카메라가 보는 곳을 덮게
    sun.target.position.copy(camLook); sun.position.copy(camLook).add(tmp.set(-20, 40, 15));

    // 눈: 카메라 주변 60m 상자 안에서 떨어지고, 벗어나면 반대쪽으로
    const arr = flakeGeo.attributes.position.array;
    for (let i = 0; i < FLAKES; i++) {
      arr[i * 3 + 1] -= dt * (2 + (i % 5) * 0.4); arr[i * 3] += Math.sin(time + i) * dt * 0.5;
      for (let a = 0; a < 3; a++) {
        const rel = arr[i * 3 + a] - camPos.getComponent(a);
        if (rel < -30) arr[i * 3 + a] += 60; else if (rel > 30) arr[i * 3 + a] -= 60;
      }
    }
    flakeGeo.attributes.position.needsUpdate = true;
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 62 : 50;
    camera.updateProjectionMatrix();
    sizeLabels(jumpers.map(j => j.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
