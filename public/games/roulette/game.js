// 🔫 러시안 룰렛: 동물들이 원형 탁자에 둘러앉고, 가운데 장난감 총(8칸)에 커피콩 1발.
// 랜덤으로 겨누고 쏘다가, 커피콩을 맞은 사람이 커피를 산다. 규칙과 순서는 plan.js에서 시작할 때 정한다.
//
// 연출은 async 함수(runGame)로 순서대로 쓴다. tween()/wait()는 게임 시간으로 흐르므로
// 탭이 가려지면 같이 멈추고, stop()이 runToken을 바꾸면 이어지지 않고 끝난다.
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { playVoices } from '../../shared/audio.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { ui } from '../../shared/ui.js';
import { planRoulette, firePercent, CHAMBERS } from './plan.js';
import { buildGun } from './gun.js';

const PI = Math.PI, TAU = PI * 2;
const TABLE_R = 3.0, TABLE_Y = 0.8, SEAT_R = 4.7, GUN_R = 2.0, GUN_Y = 1.8;
const ease = t => 1 - (1 - t) ** 3;                         // 끝에서 천천히
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

// ── 효과음 (audio.js의 voice 형식) ──
const SFX = {
  heart: [
    { wave: 'sine', f: [[0, 75], [1, 42]], dur: 0.13, gain: 1 },
    { at: 0.2, wave: 'sine', f: [[0, 62], [1, 38]], dur: 0.15, gain: 0.75 }],
  tick: [{ wave: 'noise', dur: 0.025, filter: ['bandpass', 4200, 4], gain: 0.7 }],
  cock: [
    { wave: 'noise', dur: 0.03, filter: ['bandpass', 2600, 3], gain: 0.9 },
    { at: 0.07, wave: 'noise', dur: 0.04, filter: ['bandpass', 1500, 4], gain: 0.8 }],
  click: [
    { wave: 'noise', dur: 0.035, filter: ['bandpass', 3200, 2], gain: 1.2 },
    { wave: 'square', f: 1800, dur: 0.03, filter: ['bandpass', 2200, 5], gain: 0.25 }],
  whoosh: [{ wave: 'noise', dur: 0.45, filter: ['bandpass', [[0, 300], [0.6, 1400], [1, 600]], 1.2], gain: 0.35 }],
  spin: [{ wave: 'noise', dur: 1.6, filter: ['bandpass', [[0, 1800], [1, 500]], 2], am: [14, 0.8], gain: 0.3 }],
  bang: [
    { wave: 'noise', dur: 0.55, filter: ['lowpass', [[0, 6000], [0.2, 1500], [1, 250]], 0.8], gain: 1.6 },
    { wave: 'sine', f: [[0, 140], [1, 38]], dur: 0.45, gain: 1.3 },
    { at: 0.05, wave: 'noise', dur: 0.9, filter: ['highpass', 5000, 0.7], gain: 0.25 }],
};

export default {
  id: 'roulette',
  title: '러시안 룰렛',
  emoji: '🔫',
  rule: `장난감 총(${CHAMBERS}칸)에 커피콩이 1발 들어 있습니다. 랜덤으로 서로 겨누고 쏘다가, 커피콩을 맞은 사람이 커피를 삽니다.`,
  startLabel: '🔫 게임 시작',
  create,
};

function create() {
  // ───────────── 장면: 어두운 방, 원형 탁자, 머리 위 전등 ─────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b09);
  scene.fog = new THREE.Fog(0x0e0b09, 14, 34);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x1a120c, 0.45));
  const lamp = new THREE.SpotLight(0xffd9a0, 420, 0, 0.62, 0.55, 2);
  lamp.position.set(0, 9.5, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0004;
  scene.add(lamp, lamp.target);
  // 겨눠진 사람을 비추는 붉은 조명
  const redSpot = new THREE.SpotLight(0xff3020, 0, 0, 0.32, 0.6, 2);
  redSpot.position.set(0, 9, 0); scene.add(redSpot, redSpot.target);

  {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x2a1d15, roughness: 0.9 }));
    floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3518, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: 0.95 }));
    top.position.y = TABLE_Y - 0.06; top.receiveShadow = true; top.castShadow = true; scene.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R, 0.12, 10, 64), wood);
    rim.rotation.x = PI / 2; rim.position.y = TABLE_Y; rim.castShadow = true; scene.add(rim);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, TABLE_Y - 0.1, 16), wood);
    leg.position.y = (TABLE_Y - 0.1) / 2; leg.castShadow = true; scene.add(leg);
    // 전등갓과 전구, 전선
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x23382a, side: THREE.DoubleSide, roughness: 0.5 }));
    shade.position.y = 7.2; scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
    bulb.position.y = 6.85; scene.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    cord.position.y = 10.6; scene.add(cord);
  }

  const gun = buildGun();
  gun.root.rotation.order = 'YZX';   // y = 좌우로 돌리기(yaw), z = 위아래로 들기(pitch)
  scene.add(gun.root);
  const spentMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.7 });
  const holeMat = gun.spentHoles[0].material;

  // ───────────── 상태 ─────────────
  let seats = [], plan = null, runToken = 0, playing = false;
  let tweens = [], particles = [], fx = null;
  let heart = { on: false, t: 0, gap: 0.8, vol: 0.6 };
  let shake = 0, flicker = 0, zoomFov = 0;
  const camPos = new THREE.Vector3(9, 7, 9), camLook = new THREE.Vector3(0, 1, 0);
  const wantPos = camPos.clone(), wantLook = camLook.clone();
  let camRate = 2.5, idleCam = true;

  function tween(dur, fn) { return new Promise(res => tweens.push({ t: 0, dur, fn, res })); }
  const wait = d => tween(d, () => {});
  const sfx = (name, vol = 1, delay = 0) => playVoices(SFX[name], { vol, delay });

  function resetGun() {
    gun.root.position.set(0, TABLE_Y + 0.12, 0);
    gun.root.rotation.set(0, 0.6, 0);
    gun.drum.rotation.x = 0; gun.hammer.rotation.z = 0;
    gun.spentHoles.forEach(h => { h.material = holeMat; });
  }
  resetGun();

  // ── 자리 배치: 동물을 원형으로 앉히고 탁자 가운데를 보게 한다 ──
  function seatPlayers(players) {
    clearSeats();
    const n = players.length;
    seats = players.map((p, i) => {
      const a = -PI / 2 + (i / n) * TAU, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const holder = new THREE.Group(); holder.position.copy(dir).multiplyScalar(SEAT_R);
      const model = makeAnimal(p.animal), s = THREE.MathUtils.clamp(2.3 / model.height, 0.65, 1.3);
      model.root.scale.setScalar(s);
      model.root.rotation.y = Math.atan2(dir.z, -dir.x);   // +x(앞)가 가운데를 보게
      holder.add(model.root);
      const color = PLAYER_COLORS[i];
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.12, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      cushion.position.y = 0.06; cushion.receiveShadow = true; holder.add(cushion);
      const h = model.height * s;
      const label = makeLabel(p.name, color); label.position.y = h + 0.7 + (i % 2) * 0.55; holder.add(label);
      scene.add(holder);
      return { player: p, animal: ANIMALS[p.animal], color, holder, model, dir, h, head: new THREE.Vector3(dir.x * SEAT_R, h * 0.8, dir.z * SEAT_R),
        label, phase: Math.random() * 6, tremble: 0, hop: 0, fallen: 0, stars: null, aimed: 0 };
    });
    resize();
  }
  function clearSeats() { seats.forEach(st => disposeTree(st.holder)); seats = []; }

  // ── 총 움직임 ──
  const yawTo = (from, to) => Math.atan2(-(to.z - from.z), to.x - from.x);
  const pitchTo = (from, to) => Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z));
  const gunSpot = st => new THREE.Vector3(st.dir.x * GUN_R, GUN_Y, st.dir.z * GUN_R);
  // extraTurns는 반드시 정수: 소수면 멈춘 방향이 겨눈 사람과 어긋난다
  function turnYaw(fromYaw, toYaw, extraTurns) {
    const d = ((toYaw - fromYaw) % TAU + TAU) % TAU;
    return fromYaw + d + extraTurns * TAU;
  }

  // 처음: 탁자 위에서 총을 돌려 먼저 쏠 사람을 정한다 (병 돌리기)
  async function spinToFirst(st) {
    sfx('spin', 0.8);
    const y0 = gun.root.rotation.y, y1 = turnYaw(y0, yawTo(gun.root.position, st.head), 3 + Math.floor(Math.random() * 2));
    await tween(2.4, k => { gun.root.rotation.y = y0 + (y1 - y0) * ease(k); });
  }
  // 쏠 사람 앞으로 날아가기
  async function moveGunTo(st, dur) {
    sfx('whoosh', 0.6);
    const p0 = gun.root.position.clone(), p1 = gunSpot(st), pitch0 = gun.root.rotation.z;
    const y0 = gun.root.rotation.y, y1 = turnYaw(y0, yawTo(p1, new THREE.Vector3(0, GUN_Y, 0)), 0);
    await tween(dur, k => {
      const e = easeInOut(k);
      gun.root.position.lerpVectors(p0, p1, e); gun.root.position.y += Math.sin(PI * k) * 0.6;
      gun.root.rotation.y = y0 + (y1 - y0) * e; gun.root.rotation.z = pitch0 * (1 - e);
    });
  }
  // 겨눌 사람 찾기: 한 바퀴 넘게 훑다가 천천히 멈춘다
  async function sweepAimTo(st, dur) {
    const from = gun.root.position, y0 = gun.root.rotation.y, y1 = turnYaw(y0, yawTo(from, st.head), 1);
    const pitch = pitchTo(from, st.head);
    let lastTick = Math.floor(y0 / (TAU / 16));
    await tween(dur, k => {
      const y = y0 + (y1 - y0) * ease(k);
      gun.root.rotation.y = y; gun.root.rotation.z = pitch * ease(k);
      const tick = Math.floor(y / (TAU / 16));
      if (tick !== lastTick) { lastTick = tick; sfx('tick', 0.35); }
    });
  }

  // ── 카메라 ──
  const isPortrait = () => camera.aspect < 1;
  const baseFov = () => isPortrait() ? 62 : 45;
  function wideShot() {
    const k = isPortrait() ? 1.45 : 1;
    wantPos.set(0, 9.5 * k, 10.5 * k); wantLook.set(0, 0.6, 0); camRate = 2; zoomFov = 0;
  }
  // 쏠 사람 어깨 너머 위쪽에서 겨눠진 사람을 본다. 쏠 사람 몸에 가리지 않게 머리보다 높이, 옆으로 비켜 선다.
  function shoulderShot(shooter, target) {
    const side = new THREE.Vector3(-shooter.dir.z, 0, shooter.dir.x);
    if (side.dot(target.dir) > 0) side.negate();   // 겨눈 사람 반대쪽 어깨에서 봐야 총과 상대가 같이 보인다
    const portrait = isPortrait(), back = portrait ? 3.4 : 2.4;
    wantPos.copy(shooter.dir).multiplyScalar(SEAT_R + back).addScaledVector(side, portrait ? 1.6 : 2.0)
      .setY(Math.max(shooter.h + 1.4, portrait ? 4.6 : 3.8));
    wantLook.lerpVectors(gunSpot(shooter), target.head, 0.7); camRate = 2.2;
  }
  // 쓰러진 사람을 탁자 쪽 위에서 내려다본다
  function fallenShot(st) {
    const portrait = isPortrait();
    wantPos.copy(st.dir).multiplyScalar(SEAT_R * (portrait ? 0.1 : 0.3)).setY(portrait ? 6.5 : 4.6);
    wantLook.copy(st.dir).multiplyScalar(SEAT_R + 0.6).setY(0.4); camRate = 1.5;
  }

  // ── 화면 위 정보판: 남은 칸, 발사 확률, 누가 누구를 ──
  function hud(turn, note = '') {
    const holes = Array.from({ length: CHAMBERS }, (_, i) => `<i class="ch${i < CHAMBERS - turn.left ? ' spent' : ''}"></i>`).join('');
    const S = seats[turn.shooter], T = seats[turn.target];
    ui.hud('러시안 룰렛', `
      <div class="chambers">${holes}</div>
      <div class="odds">남은 칸 <b>${turn.left}</b> · 발사 확률 <b>${firePercent(turn.left)}%</b></div>
      <div class="duel"><i style="background:${S.color}"></i>${esc(S.player.name)} <span>🔫➜</span> ${T ? `<i style="background:${T.color}"></i>${esc(T.player.name)}` : '?'}</div>
      ${note ? `<div class="note">${note}</div>` : ''}`);
  }

  // ── 커피콩 폭죽 ──
  const beanGeo = new THREE.SphereGeometry(1, 10, 8), beanMat = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.35 });
  const confGeo = new THREE.PlaneGeometry(0.16, 0.09);
  const CONF_COLORS = [0xffd166, 0xef476f, 0x06d6a0, 0x118ab2, 0xffffff, 0xf78c6b];
  function burst(origin, dir) {
    fx = fx || new THREE.Group(); scene.add(fx);
    const add = (mesh, speed, spread, drag) => {
      mesh.position.copy(origin); mesh.castShadow = true; fx.add(mesh);
      const v = dir.clone().multiplyScalar(speed * (0.6 + Math.random() * 0.6))
        .add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.8, (Math.random() - 0.5) * spread));
      particles.push({ mesh, v, spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), drag, rest: false });
    };
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(beanGeo, beanMat); m.scale.set(0.11, 0.075, 0.065);
      add(m, 7, 4.5, 0.4);
    }
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(confGeo, new THREE.MeshStandardMaterial({ color: CONF_COLORS[i % CONF_COLORS.length], side: THREE.DoubleSide, roughness: 0.6 }));
      add(m, 5, 6, 2.2);
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      if (p.rest) continue;
      p.v.y -= 9.8 * dt * (p.drag > 1 ? 0.35 : 1);
      p.v.multiplyScalar(Math.exp(-p.drag * dt));
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt;
      const pos = p.mesh.position, onTable = Math.hypot(pos.x, pos.z) < TABLE_R, floorY = (onTable ? TABLE_Y : 0) + 0.03;
      if (pos.y < floorY && p.v.y < 0) {
        pos.y = floorY; p.v.y *= -0.35; p.v.x *= 0.6; p.v.z *= 0.6; p.spin.multiplyScalar(0.5);
        if (Math.abs(p.v.y) < 0.4) { p.rest = true; p.mesh.rotation.x = -PI / 2 + (p.drag > 1 ? 0 : 0.3); }
      }
    }
  }
  function clearParticles() {
    if (fx) { fx.children.forEach(m => { if (m.material !== beanMat) m.material.dispose(); }); scene.remove(fx); fx = null; }
    particles = [];
  }

  // ── 쓰러진 동물 머리 위로 도는 별 ──
  function addStars(st) {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), mat);
      s.position.set(Math.cos(i / 4 * TAU) * 0.45, 0, Math.sin(i / 4 * TAU) * 0.45); g.add(s);
    }
    // 뒤로 쓰러지므로 머리는 가운데 반대쪽 바닥 근처에 있다
    g.position.copy(st.dir).multiplyScalar(Math.min(st.h * 0.55, 1.4)).setY(0.55);
    st.holder.add(g); st.stars = g;
  }

  // ───────────── 게임 진행 ─────────────
  async function runGame(token) {
    const alive = () => token === runToken;
    idleCam = false; wideShot();
    ui.banner(`🔫 커피콩 1발 · ${CHAMBERS}칸 장난감 총`);
    await wait(1.6); if (!alive()) return;

    const first = seats[plan.turns[0].shooter];
    ui.banner('🌀 총을 돌려 먼저 쏠 사람을 정합니다…');
    await spinToFirst(first); if (!alive()) return;
    ui.banner(`🎯 ${first.player.name} 먼저!`);
    playCall(first.animal.name, { vol: 0.7 });
    await wait(0.9); if (!alive()) return;

    for (const turn of plan.turns) {
      // 남은 칸이 줄수록 느려지고 심장 소리가 커진다 (f: 1 → 2)
      const f = 1 + (CHAMBERS - turn.left) / (CHAMBERS - 1);
      const S = seats[turn.shooter], T = seats[turn.target];
      hud({ ...turn, target: -1 });
      ui.banner(`${S.player.name} 차례 · 누구를 겨눌까?`);
      wideShot();
      await moveGunTo(S, 0.7); if (!alive()) return;
      shoulderShot(S, T);
      await sweepAimTo(T, 0.8 + 0.5 * f); if (!alive()) return;

      // 겨눔: 붉은 조명, 떨림, 심장 소리, 확대
      T.aimed++;
      hud(turn);
      ui.banner(`${S.player.name} 🔫➜ ${T.player.name}`);
      redSpot.position.set(T.head.x * 0.4, 8, T.head.z * 0.4); redSpot.target.position.copy(T.head);
      tween(0.4, k => { redSpot.intensity = 260 * k; });
      T.tremble = 1;
      heart = { on: true, t: 0, gap: 0.85 - 0.3 * (f - 1), vol: 0.45 + 0.35 * (f - 1) };
      playCall(T.animal.name, { vol: 0.5, pan: 0 });
      // 약실 돌리기 + 공이 젖히기
      sfx('cock', 0.9);
      const d0 = gun.drum.rotation.x;
      await tween(0.35, k => { gun.drum.rotation.x = d0 + (TAU / CHAMBERS) * ease(k); gun.hammer.rotation.z = 0.7 * ease(k); }); if (!alive()) return;
      // 버티기: 화면이 조금씩 확대된다
      const fov0 = baseFov();
      await tween(0.9 * f, k => { zoomFov = (fov0 * 0.42) * easeInOut(k); }); if (!alive()) return;
      heart.on = false;
      await wait(0.25 + 0.15 * f); if (!alive()) return;

      // 방아쇠
      await tween(0.06, k => { gun.hammer.rotation.z = 0.7 * (1 - k); });
      if (!turn.fired) {
        sfx('click', 1);
        ui.pop('찰칵…');
        gun.spentHoles[(CHAMBERS - turn.left) % CHAMBERS].material = spentMat;
        hud({ ...turn, left: turn.left - 1 }, '휴~ 빈 칸!');
        T.tremble = 0; T.hop = 1;
        tween(0.5, k => { redSpot.intensity = 260 * (1 - k); zoomFov *= 0.85; });
        await wait(0.35); if (!alive()) return;
        playCall(T.animal.name, { vol: 0.8 });
        ui.banner(`😮‍💨 휴~ ${T.player.name} 살았다! 다음은 ${T.player.name} 차례`);
        zoomFov = 0;
        await wait(1.1); if (!alive()) return;
      } else {
        await bang(S, T); return;
      }
    }
  }

  async function bang(S, T) {
    const token = runToken;
    sfx('bang', 1);
    ui.pop('빵!'); ui.flash();
    shake = 1; zoomFov = 0; heart.on = false;
    const origin = gun.muzzle.getWorldPosition(new THREE.Vector3());
    burst(origin, T.head.clone().sub(origin).normalize());
    gun.spentHoles[(CHAMBERS - plan.turns.at(-1).left) % CHAMBERS].material = spentMat;
    hud(plan.turns.at(-1), '☕ 커피콩 명중!');
    T.tremble = 0;
    // 총이 반동으로 튄다
    const r0 = gun.root.rotation.z;
    tween(0.5, k => { gun.root.rotation.z = r0 + Math.sin(PI * k) * 0.5 * (1 - k); });
    ui.banner(`☕ ${T.player.name} 당첨! 커피 사세요~`);
    // 맞은 동물이 뒤로 쓰러진다
    await tween(0.7, k => { T.fallen = ease(k); });
    if (token !== runToken) return;
    addStars(T);
    fallenShot(T);
    playLoserCry(T.animal.name);
    // 나머지는 기뻐서 폴짝
    seats.forEach((st, i) => { if (st !== T) setTimeout(() => { if (token === runToken) st.hop = 1; }, 300 + i * 180); });
    await tween(0.6, k => { redSpot.intensity = 260 * (1 - k); });
    await wait(3.2);
    if (token !== runToken) return;
    showResult(T);
  }

  function showResult(loser) {
    const order = [loser, ...seats.filter(st => st !== loser)];
    ui.showResult({
      title: `☕ 오늘의 커피는 ${loser.player.name}!`,
      head: ['', '참가자', '동물', '기록'],
      rows: order.map(st => [
        st === loser ? '☕' : '😮‍💨',
        esc(st.player.name),
        `<span class="dot" style="background:${st.color}"></span>${st.animal.name}`,
        st === loser ? `커피콩 명중${st.aimed > 1 ? ` (${st.aimed - 1}번 살아남은 뒤)` : ''}` : st.aimed ? `${st.aimed}번 겨눠지고 생존` : '한 번도 안 겨눠짐',
      ]),
    });
  }

  // ───────────── 게임 인터페이스 ─────────────
  function start(players) {
    const token = ++runToken;
    stopEffects();
    seatPlayers(players);
    plan = planRoulette(players.length);
    playing = true;
    runGame(token);
  }
  function stopEffects() {
    tweens = []; heart.on = false; shake = 0; zoomFov = 0;
    redSpot.intensity = 0; clearParticles(); resetGun();
  }
  function stop() {
    runToken++; playing = false; idleCam = true;
    stopEffects(); clearSeats();
  }

  const tmp = new THREE.Vector3();
  function update(dt, time) {
    // 진행 중인 움직임
    for (const tw of tweens) { tw.t += dt; tw.fn(Math.min(1, tw.t / tw.dur)); }
    const done = tweens.filter(tw => tw.t >= tw.dur); tweens = tweens.filter(tw => tw.t < tw.dur); done.forEach(tw => tw.res());

    // 동물: 숨쉬기, 떨기, 폴짝, 쓰러지기, 별
    for (const st of seats) {
      st.phase += dt * (st.tremble ? 9 : 2.2);
      st.model.animate(st.phase, st.tremble ? 0.25 : 0.08);
      const jx = st.tremble ? (Math.random() - 0.5) * 0.06 : 0, jz = st.tremble ? (Math.random() - 0.5) * 0.06 : 0;
      st.hop = Math.max(0, st.hop - dt * 1.6);
      const hopY = st.hop > 0 ? Math.abs(Math.sin((1 - st.hop) * PI * 2)) * 0.6 * st.hop : 0;
      st.holder.position.set(st.dir.x * SEAT_R + jx, hopY, st.dir.z * SEAT_R + jz);
      st.model.root.rotation.z = st.fallen * 1.45;
      if (st.stars) { st.stars.rotation.y += dt * 4; st.stars.position.y = 0.55 + Math.sin(time * 3) * 0.08; }
    }
    updateParticles(dt);

    // 심장 소리
    if (heart.on && (heart.t -= dt) <= 0) {
      sfx('heart', heart.vol);
      heart.gap = Math.max(0.42, heart.gap * 0.93); heart.vol = Math.min(1.3, heart.vol * 1.06); heart.t = heart.gap;
    }

    // 전등이 살짝 깜빡인다
    flicker += dt;
    lamp.intensity = 420 * (0.94 + 0.06 * Math.sin(flicker * 13) * Math.sin(flicker * 3.1));

    // 카메라
    if (idleCam) {
      const a = time * 0.12, r = isPortrait() ? 15 : 11;
      wantPos.set(Math.cos(a) * r, isPortrait() ? 10 : 7.5, Math.sin(a) * r); wantLook.set(0, 0.9, 0); camRate = 3;
    }
    const k = 1 - Math.exp(-dt * camRate);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    shake = Math.max(0, shake - dt * 1.8);
    camera.position.copy(camPos).add(tmp.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(shake * 0.35));
    camera.up.set(0, 1, 0);
    camera.lookAt(camLook);
    const fov = baseFov() - zoomFov;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); sizeLabels(seats.map(s => s.label), camera); }
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = baseFov() - zoomFov;
    camera.updateProjectionMatrix();
    sizeLabels(seats.map(s => s.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
