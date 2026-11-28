// 🪵 젠가: 동물들이 둥근 탁자에 둘러앉아 자리 순서대로 블록을 하나씩 빼서 맨 위에 올린다.
// 탑을 무너뜨린 동물의 주인이 커피를 산다. 무너지는 턴과 뺄 블록은 plan.js에서 시작할 때 정한다.
// 연출은 async 함수(runGame)로 순서대로 쓴다 (룰렛·스키점프와 같은 방식).
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { canvasTex, disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { makeExclaim, animateExclaim } from '../../shared/fx.js';
import { ui } from '../../shared/ui.js';
import { planJenga, startTurn, LAYERS } from './plan.js';
import { createJengaAudio } from './sound.js';

const PI = Math.PI, TAU = PI * 2;
const BL = 1.5, BH = 0.3, BW = 0.5;              // 블록 길이, 높이, 폭
const TABLE_Y = 0.8, TABLE_R = 2.1, SEAT_R = 4.4;
const TURN_SEC = 2.9;                            // 한 턴 평균 시간 (안내 + 고르기 + 빼기 + 올리기)
const ease = k => 1 - (1 - k) ** 3, easeInOut = k => k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;

export default {
  id: 'jenga',
  title: '젠가',
  emoji: '🪵',
  rule: '자리 순서대로 블록을 하나씩 빼서 맨 위에 올립니다. 탑을 무너뜨린 동물의 주인이 커피를 삽니다.',
  startLabel: '🪵 시작',
  // 평균 걸리는 시간(초): 시작 약 3 + 평균 턴 수 x 약 2.9 + 무너진 뒤 결과까지 약 6
  seconds: n => 9 + (startTurn(n) + (n - 1) / 2) * TURN_SEC,
  create,
};

// 층 l, 칸 s의 블록 자리. 짝수 층은 길이가 x 방향, 홀수 층은 z 방향
const slotPos = (l, s) => l % 2 === 0 ? new THREE.Vector3(0, BH * (l + 0.5), (s - 1) * BW) : new THREE.Vector3((s - 1) * BW, BH * (l + 0.5), 0);
const slotRotY = l => l % 2 === 0 ? 0 : PI / 2;
const axisOf = l => l % 2 === 0 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);

function create() {
  // ───────────── 장면: 따뜻한 거실, 둥근 탁자, 위에서 비추는 전등 ─────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a211c);
  scene.fog = new THREE.Fog(0x2a211c, 16, 36);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  const hemi = new THREE.HemisphereLight(0xffe7cc, 0x2b1d14, 0.8); scene.add(hemi);
  const lamp = new THREE.SpotLight(0xffe0b0, 300, 0, 0.7, 0.5, 2);
  lamp.position.set(0, 11, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0004;
  scene.add(lamp, lamp.target);
  // 지금 차례인 사람만 위에서 비추는 조명 (폭탄 돌리기와 같은 방식)
  const spot = new THREE.SpotLight(0xfff0d8, 0, 0, 0.28, 0.45, 2);
  spot.position.set(0, 8, 0); scene.add(spot, spot.target);
  let focus = 0;
  {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x5b3f2c, roughness: 0.85 }));
    floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(6.2, 48), new THREE.MeshStandardMaterial({ color: 0x7a2e2e, roughness: 1 }));
    rug.rotation.x = -PI / 2; rug.position.y = 0.01; rug.receiveShadow = true; scene.add(rug);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.55 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.12, 40), wood);
    top.position.y = TABLE_Y - 0.06; top.receiveShadow = top.castShadow = true; scene.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, TABLE_Y - 0.12, 16), wood);
    leg.position.y = (TABLE_Y - 0.12) / 2; leg.castShadow = true; scene.add(leg);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9a441, side: THREE.DoubleSide }));
    shade.position.y = 9.4; scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff1c9 })); bulb.position.y = 9.1; scene.add(bulb);
  }

  // ───────────── 탑 ─────────────
  const tower = new THREE.Group(); tower.position.y = TABLE_Y; scene.add(tower);
  const blockGeo = new THREE.BoxGeometry(BL, BH * 0.96, BW * 0.96);
  const woodTex = canvasTex(128, 32, (x, w, h) => {
    x.fillStyle = '#f2d6ab'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(120,80,40,${0.15 + Math.random() * 0.2})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); x.moveTo(0, Math.random() * h); x.bezierCurveTo(w / 3, Math.random() * h, 2 * w / 3, Math.random() * h, w, Math.random() * h); x.stroke(); }
  });
  let blocks = new Map(), loose = [];   // blocks: '층,칸' → mesh, loose: 무너져 날아가는 블록
  function buildTower() {
    clearTower();
    for (let l = 0; l < LAYERS; l++) for (let s = 0; s < 3; s++) addBlock(l, s);
  }
  function addBlock(l, s) {
    const c = new THREE.Color().setHSL(0.08 + Math.random() * 0.02, 0.4, 0.72 + Math.random() * 0.08);
    const m = new THREE.Mesh(blockGeo, new THREE.MeshStandardMaterial({ map: woodTex, color: c, roughness: 0.7, emissive: 0xffd34d, emissiveIntensity: 0 }));
    m.position.copy(slotPos(l, s)); m.rotation.y = slotRotY(l); m.castShadow = m.receiveShadow = true;
    tower.add(m); blocks.set(`${l},${s}`, m);
    return m;
  }
  function clearTower() {
    for (const m of [...blocks.values(), ...loose.map(p => p.mesh)]) { m.parent?.remove(m); m.material.dispose(); }
    blocks = new Map(); loose = [];
    tower.rotation.set(0, 0, 0);
  }
  buildTower();

  // ───────────── 상태 ─────────────
  const sound = createJengaAudio();
  let seats = [], plan = null, runToken = 0, tweens = [], turn = 0, active = -1, wobble = 0.002, extraWobble = 0, tilting = false;
  let camMode = 'idle', camRate = 2.5;
  const camPos = new THREE.Vector3(9, 7, 9), camLook = new THREE.Vector3(0, 3, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const focusPoint = new THREE.Vector3();
  const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur, fn, res }));
  const wait = d => tween(d, () => {});

  function seatPlayers(players) {
    seats.forEach(st => disposeTree(st.holder));
    const n = players.length;
    seats = players.map((p, i) => {
      const a = PI / 2 + (i / n) * TAU, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const holder = new THREE.Group(); holder.position.copy(dir).multiplyScalar(SEAT_R);
      const model = makeAnimal(p.animal), s = THREE.MathUtils.clamp(2.2 / model.height, 0.6, 1.3);
      model.root.scale.setScalar(s); model.root.rotation.y = Math.atan2(dir.z, -dir.x); holder.add(model.root);
      const h = model.height * s, color = PLAYER_COLORS[i];
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.14, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      cushion.position.y = 0.07; cushion.receiveShadow = true; holder.add(cushion);
      const label = makeLabel(p.name, color); label.position.y = h + 0.6 + (i % 2) * 0.5; holder.add(label);
      scene.add(holder);
      return { player: p, animal: ANIMALS[p.animal], color, holder, model, dir, h, label, pulls: 0, phase: Math.random() * 6, hop: 0, startle: 0, exclaim: null, tremble: 0 };
    });
    resize();
  }

  function hud(note = '') {
    const layers = Math.max(0, ...[...blocks.keys()].map(k => +k.split(',')[0])) + 1;
    const st = seats[active];
    ui.hud('젠가', `<div class="odds">${turn}번째 턴 · 탑 <b>${layers}</b>층</div>${st ? `<div class="duel"><i style="background:${st.color}"></i>${esc(st.player.name)} 차례</div>` : ''}${note ? `<div class="note">${note}</div>` : ''}`);
  }

  // ───────────── 한 턴 ─────────────
  async function doTurn(mv, k, alive) {
    const st = seats[mv.player], n = seats.length;
    const tension = Math.min(1, k / (2 * n));   // 턴 수로만 긴장을 올린다 (무너질 턴이 미리 티 나지 않게)
    turn = k + 1; active = mv.player; sound.setTension(tension);
    hud(); ui.banner(`🪵 ${st.player.name} 차례`);
    const block = blocks.get(`${mv.layer},${mv.slot}`);
    const home = slotPos(mv.layer, mv.slot), axis = axisOf(mv.layer);
    const out = axis.clone().multiplyScalar(Math.sign(axis.dot(st.dir)) || 1);   // 빼는 사람 쪽으로
    // 1) 고르기: 블록이 반짝, 카메라가 빼는 사람 어깨 너머로
    camMode = 'turn'; focusPoint.copy(home).add(tower.position);
    await tween(0.3 + 0.2 * tension, kk => { block.material.emissiveIntensity = 0.5 * Math.abs(Math.sin(kk * PI * 3)); }); if (!alive()) return;
    block.material.emissiveIntensity = 0;
    // 2) 빼기: 조금씩 끌려 나온다. 탑이 더 흔들리고 빼는 동물이 떤다
    const pullSec = 0.9 + 0.8 * tension;
    st.tremble = 1; extraWobble = 0.006 + 0.012 * tension; sound.slideStart(pullSec, tension);
    const pullDist = mv.collapse ? BL * 0.55 : BL + 0.35;
    await tween(pullSec, kk => {
      const e = easeInOut(kk) + Math.sin(kk * 40) * 0.01 * (1 - kk);
      block.position.copy(home).addScaledVector(out, pullDist * e);
      if (mv.collapse) extraWobble = 0.02 + 0.05 * kk;
    }); if (!alive()) return;
    sound.slideStop(); st.tremble = 0;
    if (mv.collapse) { await collapse(st, out, alive); return; }
    extraWobble = 0;
    // 3) 맨 위로 올리기
    blocks.delete(`${mv.layer},${mv.slot}`);
    const from = block.position.clone(), to = slotPos(mv.toLayer, mv.toSlot), r0 = block.rotation.y, r1 = slotRotY(mv.toLayer);
    if (mv.toSlot === 0) hud();
    focusPoint.copy(to).add(tower.position);
    await tween(0.6, kk => {
      const e = easeInOut(kk);
      block.position.lerpVectors(from, to, e); block.position.y += Math.sin(PI * kk) * 1.2;
      block.rotation.y = r0 + (r1 - r0) * e;
    }); if (!alive()) return;
    blocks.set(`${mv.toLayer},${mv.toSlot}`, block);
    sound.tok(); st.pulls++; st.hop = 0.7;
    wobble = 0.002 + 0.0012 * k;   // 탑이 높아지고 구멍이 많아질수록 더 흔들린다
    hud('휴~ 성공!');
    if (Math.random() < 0.4) playCall(st.animal.name, { vol: 0.5 });
    await wait(0.2);
  }

  // 와르르: 탑이 빼는 사람 반대쪽으로 기울다가 블록이 흩어진다
  async function collapse(st, out, alive) {
    const away = st.dir.clone().negate();
    sound.duck(true);
    ui.banner(`😱 흔들흔들…`);
    const tiltAxis = new THREE.Vector3(away.z, 0, -away.x).normalize();   // 기울어지는 축
    tilting = true;
    await tween(0.6, kk => { tower.quaternion.setFromAxisAngle(tiltAxis, -0.28 * kk * kk); }); if (!alive()) return;
    sound.stopMusic(0.05); sound.crash(); ui.flash();
    // 블록을 탑에서 떼어 장면에 붙이고 날린다
    tower.updateMatrixWorld(true);
    for (const m of [...blocks.values()]) {
      const h = m.position.y;
      scene.attach(m);
      const v = away.clone().multiplyScalar(0.6 + h * 0.35 + Math.random() * 0.8)
        .add(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6));
      loose.push({ mesh: m, v, w: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6).multiplyScalar(0.4 + h * 0.15), rest: false });
    }
    blocks = new Map(); tower.quaternion.identity();
    camMode = 'collapse';
    ui.banner(`💥 와르르! ${st.player.name} 당첨!`);
    st.startle = 1; st.exclaim = makeExclaim(); st.exclaim.position.y = st.h + 0.35; st.holder.add(st.exclaim);
    playCall(st.animal.name, { vol: 1 });
    seats.forEach((o, i) => { if (o !== st) setTimeout(() => { if (alive()) o.hop = 1; }, 500 + i * 140); });
    await wait(1.6); if (!alive()) return;
    camMode = 'final';
    playLoserCry(st.animal.name);
    await wait(3.6); if (!alive()) return;
    showResult(st);
  }

  function updateLoose(dt) {
    for (const p of loose) {
      if (p.rest) continue;
      p.v.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += p.w.x * dt; p.mesh.rotation.y += p.w.y * dt; p.mesh.rotation.z += p.w.z * dt;
      const pos = p.mesh.position, ground = (Math.hypot(pos.x, pos.z) < TABLE_R ? TABLE_Y : 0) + BH / 2;
      if (pos.y < ground) {
        pos.y = ground;
        if (Math.abs(p.v.y) > 1.2) sound.tok(Math.min(0.6, Math.abs(p.v.y) * 0.12));
        p.v.y *= -0.25; p.v.x *= 0.6; p.v.z *= 0.6; p.w.multiplyScalar(0.5);
        if (Math.abs(p.v.y) < 0.4 && p.v.length() < 0.6) {
          p.rest = true;
          // 바닥에 눕힌다: 가장 가까운 평평한 자세로
          p.mesh.rotation.x = Math.round(p.mesh.rotation.x / (PI / 2)) * (PI / 2);
          p.mesh.rotation.z = Math.round(p.mesh.rotation.z / (PI / 2)) * (PI / 2);
        }
      }
    }
  }

  function showResult(L) {
    const order = [L, ...seats.filter(s => s !== L)];
    ui.showResult({
      title: `☕ 오늘의 커피는 ${L.player.name}!`,
      head: ['', '참가자', '동물', '기록'],
      rows: order.map(st => [
        st === L ? '💥' : '😮‍💨',
        esc(st.player.name),
        `<span class="dot" style="background:${st.color}"></span>${st.animal.name}`,
        st === L ? `와르르! (${st.pulls}번 성공 뒤)` : `${st.pulls}번 성공`,
      ]),
    });
  }

  async function runGame(token) {
    const alive = () => token === runToken;
    sound.start();
    camMode = 'intro';
    ui.banner(`🪵 ${seats[plan.first].player.name}부터 시작! 무너뜨리면 커피`);
    hud();
    await wait(2.2); if (!alive()) return;
    for (const [k, mv] of plan.moves.entries()) { await doTurn(mv, k, alive); if (!alive()) return; }
  }

  // ───────────── 게임 인터페이스 ─────────────
  function start(players) {
    const token = ++runToken;
    stopAll();
    plan = planJenga(players.length);
    seatPlayers(players);
    runGame(token);
  }
  function stopAll() {
    tweens = []; sound.stop(0.2); buildTower();
    seats.forEach(st => disposeTree(st.holder)); seats = [];
    active = -1; turn = 0; wobble = 0.002; extraWobble = 0; tilting = false; plan = null; camMode = 'idle';
  }
  function stop() { runToken++; stopAll(); }

  const tmp = new THREE.Vector3();
  function update(dt, time) {
    for (const tw of tweens) { tw.t += dt; tw.fn(Math.min(1, tw.t / tw.dur)); }
    const done = tweens.filter(tw => tw.t >= tw.dur); tweens = tweens.filter(tw => tw.t < tw.dur); done.forEach(tw => tw.res());

    // 탑 흔들림 (무너지는 중에는 collapse가 직접 기울인다)
    if (!tilting) {
      const a = wobble + extraWobble;
      tower.rotation.x = Math.sin(time * 2.3) * a; tower.rotation.z = Math.cos(time * 1.9) * a;
    }
    updateLoose(dt);

    seats.forEach(st => {
      st.phase += dt * (st.tremble ? 10 : 2.2);
      st.model.animate(st.phase, st.tremble ? 0.25 : 0.07);
      st.hop = Math.max(0, st.hop - dt * 1.8); st.startle = Math.max(0, st.startle - dt * 0.9);
      const hopY = st.hop > 0 ? Math.sin((1 - st.hop) * PI) * 0.5 : 0;
      const jump = st.startle > 0 ? Math.max(0, Math.sin(Math.min(1, (1 - st.startle) * 2.2) * PI)) * 1.2 : 0;
      const jx = st.tremble ? (Math.random() - 0.5) * 0.04 : 0;
      st.holder.position.set(st.dir.x * SEAT_R + jx, hopY + jump, st.dir.z * SEAT_R);
      st.model.root.rotation.z = st.startle > 0 ? Math.sin(Math.min(1, (1 - st.startle) * 1.6) * PI) * 0.4 : 0;
      if (st.exclaim) animateExclaim(st.exclaim, dt, time, st.h + 0.35);
    });

    // 조명: 차례인 사람 위
    const on = active >= 0 && seats[active];
    focus += ((on ? 1 : 0) - focus) * Math.min(1, dt * 3);
    if (on) { const d = seats[active].dir; spot.target.position.lerp(tmp.copy(d).multiplyScalar(SEAT_R - 0.3), Math.min(1, dt * 6)); spot.position.set(spot.target.position.x * 0.8, 8, spot.target.position.z * 0.8); }
    spot.intensity = 260 * focus; lamp.intensity = 340 * (1 - 0.2 * focus); hemi.intensity = 0.9 * (1 - 0.3 * focus);   // 탑은 계속 잘 보이게 조금만 어둡게

    // 카메라
    const portrait = camera.aspect < 1, far = portrait ? 1.5 : 1, st = seats[active];
    if (camMode === 'idle' || camMode === 'intro') {
      const a = time * 0.12, r = 11 * far;
      wantPos.set(Math.cos(a) * r, 6.5 * far, Math.sin(a) * r); wantLook.set(0, 3.2, 0); camRate = 2;
    } else if (camMode === 'turn' && st) {
      // 빼는 사람 뒤쪽 위에서, 탑과 블록을 본다
      const side = new THREE.Vector3(-st.dir.z, 0, st.dir.x);
      wantPos.copy(st.dir).multiplyScalar(SEAT_R + 2.6 * far).addScaledVector(side, 1.6).setY(Math.max(focusPoint.y + 2.2, 4) + (far - 1) * 3);
      wantLook.copy(focusPoint).multiplyScalar(0.7).setY(focusPoint.y); camRate = 2.2;
    } else if (camMode === 'collapse' && st) {
      // 블록이 날아가는 쪽(빼는 사람 반대편)을 피해 옆에서 본다
      wantPos.set(-st.dir.z, 0, st.dir.x).multiplyScalar(9 * far).addScaledVector(st.dir, 2).setY(6 * far); wantLook.set(0, 1.2, 0); camRate = 1.5;
    } else if (camMode === 'final' && st) {
      wantPos.copy(st.dir).multiplyScalar(SEAT_R * 0.15).setY(st.h + 1.9 + (far - 1) * 2); wantLook.copy(st.dir).multiplyScalar(SEAT_R).setY(st.h * 0.7); camRate = 1.8;
    }
    const k = 1 - Math.exp(-dt * camRate);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 60 : 45;
    camera.updateProjectionMatrix();
    sizeLabels(seats.map(s => s.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
