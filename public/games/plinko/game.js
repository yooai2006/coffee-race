// 🎯 핀볼 낙하: 동물들이 동시에 떨어져 못에 통통 부딪히며 바닥 칸에 들어간다.
// 바닥 칸 위를 오가는 ☕ 표시가 있는 칸에 들어간 동물의 주인이 커피를 산다. 경로와 타이밍은 plan.js에서 시작할 때 정한다.
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { canvasTex, disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { ui } from '../../shared/ui.js';
import { animalChip } from '../../shared/animal-icons.js';
import { planPlinko, markerAt, pingpong, slotM, MARKER_SPEED, FALL0, SLOTS, ROWS, M_MAX } from './plan.js';
import { createPlinkoAudio } from './sound.js';

const PI = Math.PI;
const DX = 1.6, DY = 1.45, HALF = DX / 2;                 // 못 가로 간격, 줄 간격
const PEG_R = 0.17, BODY = 0.55;                          // 못 반지름, 동물 중심이 못 위로 떠 있는 높이
const rowY = r => 2 + DY * (ROWS - r);                    // 못 줄 r의 높이 (마지막 줄이 2 + DY)
const TOP_Y = rowY(0) + 1.4, FLOOR_Y = 0.5;               // 출발대 높이, 칸 바닥에서 동물 중심 높이
const W = SLOTS * DX;                                      // 판 너비
const G = 22;                                              // 중력
const xOf = m => m * HALF;

export default {
  id: 'plinko',
  title: '핀볼 낙하',
  emoji: '🎯',
  rule: '동물들이 못에 부딪히며 바닥 칸으로 떨어집니다. 좌우로 움직이는 ☕ 칸에 들어간 동물의 주인이 커피를 삽니다.',
  startLabel: '🎯 떨어뜨리기',
  // 평균 걸리는 시간(초): 카운트다운 2 + 낙하 약 5 + 결과까지 3.6
  seconds: () => 11,
  create,
};

function create() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d1640);
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2f6a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 14, 18); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 22, bottom: -2, near: 1, far: 50 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  // ───────────── 판: 뒤판, 옆벽, 못, 바닥 칸, 출발대 ─────────────
  const boardH = TOP_Y + 1.6;
  {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.2, boardH + 0.6), new THREE.MeshStandardMaterial({
      roughness: 0.9,
      map: canvasTex(256, 512, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3b2a8c'); g.addColorStop(1, '#14324f');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 160; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 0, PI * 2); x.fill(); }
      }),
    }));
    back.position.set(0, boardH / 2 - 0.3, -1.7); back.receiveShadow = true; scene.add(back);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.4, metalness: 0.2 });
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, boardH + 0.6, 3.6), frameMat);
      wall.position.set(s * (W / 2 + 0.4), boardH / 2 - 0.3, 0); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.4, 3.6), frameMat);
    base.position.set(0, -0.2, 0); base.receiveShadow = true; scene.add(base);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, boardH), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.1 }));
    glass.position.set(0, boardH / 2 - 0.3, 1.75); scene.add(glass);
  }
  // 못: 줄마다 위치가 반 칸씩 엇갈린다 (plan.js 좌표 설명 참고)
  const pegs = new Map(), pegGeo = new THREE.CylinderGeometry(PEG_R, PEG_R, 2.2, 14);
  for (let r = 0; r < ROWS; r++) {
    for (let m = -M_MAX; m <= M_MAX; m++) {
      if (((m - r - 1) % 2 + 2) % 2) continue;
      const mesh = new THREE.Mesh(pegGeo, new THREE.MeshStandardMaterial({ color: 0xe9e4ff, roughness: 0.3, metalness: 0.3, emissive: 0xffd34d, emissiveIntensity: 0 }));
      mesh.rotation.x = PI / 2; mesh.position.set(xOf(m), rowY(r), 0); mesh.castShadow = true;
      scene.add(mesh); pegs.set(`${r},${m}`, { mesh, glow: 0 });
    }
  }
  // 바닥 칸: 칸막이와 바닥 타일. ☕ 표시가 지나가는 칸은 불이 들어온다
  const slotTiles = [];
  {
    const divMat = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.4 });
    for (let i = 0; i <= SLOTS; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 3.2), divMat);
      d.position.set(-W / 2 + i * DX, 0.75, 0); d.castShadow = true; scene.add(d);
    }
    for (let s = 0; s < SLOTS; s++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(DX - 0.2, 0.12, 3.2), new THREE.MeshStandardMaterial({ color: s % 2 ? 0x2c6e8f : 0x2f5f7a, emissive: 0x6b3a10, emissiveIntensity: 0, roughness: 0.6 }));
      tile.position.set(xOf(slotM(s)), 0.06, 0); tile.receiveShadow = true; scene.add(tile); slotTiles.push(tile);
    }
  }
  // ☕ 표시: 칸 위에 떠서 좌우로 오간다
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#fff4d6'; x.beginPath(); x.arc(w / 2, h / 2, 118, 0, PI * 2); x.fill();
      x.lineWidth = 14; x.strokeStyle = '#7a4419'; x.stroke();
      x.font = '150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('☕', w / 2, h / 2 + 10);
    }),
    transparent: true, depthTest: false,
  }));
  marker.renderOrder = 12; marker.scale.setScalar(1.25); marker.position.set(0, 2.25, 1.2); scene.add(marker);
  const markerLight = new THREE.PointLight(0xffa640, 0, 6, 1.5); scene.add(markerLight);
  // 출발대와 문
  const gate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 3.2), new THREE.MeshStandardMaterial({ color: 0xff5d73, roughness: 0.5 }));
  gate.position.set(0, TOP_Y - 0.62, 0); gate.castShadow = true; scene.add(gate);

  // ───────────── 상태 ─────────────
  const sound = createPlinkoAudio();
  let runners = [], plan = null, phase = 'idle', t = 0, runToken = 0, endTimer = 0, landed = 0, lastMarkerSlot = -1, hitPulse = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  // 동물 i의 경로를 시각별 점으로 펼친다: [출발] → 못 0..ROWS-1 → 칸
  function buildPath(i) {
    const pts = [{ t: 0, x: xOf(plan.starts[i]), y: TOP_Y }];
    let m = plan.starts[i], at = FALL0;
    pts.push({ t: at, x: xOf(m), y: rowY(0) + BODY, row: 0, m });
    for (let r = 0; r < ROWS; r++) {
      m += plan.moves[i][r]; at += plan.hops[i][r];
      pts.push(r < ROWS - 1 ? { t: at, x: xOf(m), y: rowY(r + 1) + BODY, row: r + 1, m } : { t: at, x: xOf(m), y: FLOOR_Y, slot: plan.slots[i] });
    }
    return pts;
  }

  function setup(players) {
    clearRunners();
    plan = planPlinko(players.length);
    runners = players.map((p, i) => {
      const holder = new THREE.Group(), spin = new THREE.Group(); holder.add(spin);
      const model = makeAnimal(p.animal), s = THREE.MathUtils.clamp(1.15 / model.height, 0.35, 0.9);
      model.root.scale.setScalar(s); model.root.position.y = -model.height * s * 0.45; spin.add(model.root);
      model.root.rotation.y = -PI / 2 + 0.5;   // 앞(+x)이 살짝 화면 쪽을 보게
      const color = PLAYER_COLORS[i], label = makeLabel(p.name, color);
      label.position.y = model.height * s * 0.6 + 0.45; holder.add(label);
      const z = (i - (players.length - 1) / 2) * 0.02;   // 모두 같은 판 위 (이름표가 깜빡이지 않을 만큼만 비킨다)
      const path = buildPath(i);
      holder.position.set(path[0].x, path[0].y, z); scene.add(holder);
      return { player: p, animal: ANIMALS[p.animal], color, holder, spin, model, label, path, seg: 0, z, landed: false, order: 0,
        spinV: (Math.random() - 0.5) * 8, phase: Math.random() * 6, startle: 0, settle: 0,
        bx: path[0].x, by: path[0].y, off: new THREE.Vector2(), vel: new THREE.Vector2(), bumpCd: 0 };
    });
    resize();
  }
  function clearRunners() { runners.forEach(rn => disposeTree(rn.holder)); runners = []; }

  // 두 점 사이를 포물선으로: x는 일정하게, y는 중력을 받으며
  function hopPos(a, b, tt) {
    const T = b.t - a.t, k = Math.min(1, Math.max(0, (tt - a.t) / T)), s = k * T;
    const vy = (b.y - a.y + G * T * T / 2) / T;
    return [a.x + (b.x - a.x) * k, a.y + vy * s - G * s * s / 2];
  }

  function hud() {
    ui.hud('핀볼 낙하', runners.map(rn => {
      const st = !rn.landed ? '⬇️' : rn === runners[plan.loser] ? '☕' : '✅';
      return `<div class="r${rn.landed ? ' done' : ''}"><b>${st}</b>${animalChip(rn.player.animal, rn.color)}${esc(rn.player.name)}</div>`;
    }).join(''));
  }

  function onLand(rn) {
    rn.landed = true; rn.order = ++landed; rn.settle = 1;
    rn.holder.position.set(rn.path.at(-1).x, FLOOR_Y, rn.z);
    if (rn === runners[plan.loser]) {
      sound.hit(); ui.flash(); ui.pop('☕!');
      ui.banner(`☕ ${rn.player.name} 당첨!`);
      rn.startle = 1; hitPulse = 1;
      playCall(rn.animal.name, { vol: 1 });
      setTimeout(() => playLoserCry(rn.animal.name), 700);
    } else {
      sound.safe();
      playCall(rn.animal.name, { vol: 0.45, pan: rn.holder.position.x / (W / 2) * 0.7 });
    }
    hud();
    if (landed === runners.length) {
      sound.stop(1.2);
      const token = runToken;
      endTimer = setTimeout(() => { if (token === runToken) showResult(); }, 3600);
    }
  }

  // ── 동물끼리 부딪히면 튕겨 나간다 ──
  // 정해진 경로(bx, by)에 스프링으로 묶인 어긋남(off)을 더한다. 겹치면 서로 밀어내고 튕기는 속도를 준다.
  // 착지 직전에는 어긋남이 0으로 줄어들어, 정해진 칸에 정확히 들어간다.
  const BUMP_R = 0.55, SPRING = 40, DAMP = 7, KICK = 7;
  const tmpA = new THREE.Vector2(), tmpB = new THREE.Vector2(), nrm = new THREE.Vector2();
  function bump(dt) {
    const air = runners.filter(rn => !rn.landed);
    const fade = rn => Math.min(1, Math.max(0, (rn.path.at(-1).t - t) / 0.6));
    for (let i = 0; i < air.length; i++) for (let j = i + 1; j < air.length; j++) {
      const a = air[i], b = air[j], fa = fade(a), fb = fade(b);
      tmpA.set(a.bx + a.off.x * fa, a.by + a.off.y * fa); tmpB.set(b.bx + b.off.x * fb, b.by + b.off.y * fb);
      nrm.subVectors(tmpA, tmpB);
      const d = nrm.length();
      if (d >= BUMP_R * 2) continue;
      if (d < 1e-4) nrm.set(Math.random() - 0.5, Math.random() - 0.5);
      nrm.normalize();
      const push = (BUMP_R * 2 - d) / 2;
      a.off.addScaledVector(nrm, push); b.off.addScaledVector(nrm, -push);
      if (a.vel.dot(nrm) - b.vel.dot(nrm) < KICK) { a.vel.addScaledVector(nrm, KICK * 0.5); b.vel.addScaledVector(nrm, -KICK * 0.5); }
      a.spinV = -a.spinV * 1.2; b.spinV = -b.spinV * 1.2;
      if (a.bumpCd <= 0 && b.bumpCd <= 0) { sound.bump((tmpA.x + tmpB.x) / W); a.bumpCd = b.bumpCd = 0.2; }
    }
    for (const rn of air) {
      rn.bumpCd -= dt;
      rn.vel.addScaledVector(rn.off, -SPRING * dt).multiplyScalar(Math.exp(-DAMP * dt));
      rn.off.addScaledVector(rn.vel, dt);
      if (rn.off.length() > 1.1) rn.off.setLength(1.1);
      const f = fade(rn), x = THREE.MathUtils.clamp(rn.bx + rn.off.x * f, -W / 2 + 0.45, W / 2 - 0.45);
      rn.holder.position.set(x, rn.by + rn.off.y * f, rn.z);
    }
  }

  function showResult() {
    phase = 'result';
    const loser = runners[plan.loser], rest = runners.filter(r => r !== loser).sort((a, b) => a.order - b.order);
    ui.showResult({
      loser: { name: loser.player.name, animal: loser.player.animal, color: loser.color },
      rows: [loser, ...rest].map(rn => ({
        mark: rn === loser ? '☕' : '✅', name: rn.player.name, animal: rn.player.animal, color: rn.color, loser: rn === loser,
        note: `${rn.animal.name} · ${rn === loser ? '☕ 칸' : '안전'} · ${rn.order}번째 착지`,
      })),
    });
  }

  // ───────────── 게임 인터페이스 ─────────────
  async function start(players) {
    const token = ++runToken;
    setup(players);
    phase = 'ready'; t = -3; landed = 0; lastMarkerSlot = -1; hitPulse = 0;
    gate.position.x = 0; gate.visible = true;
    hud();
    sound.start();
    if (!await ui.countdown(() => token === runToken)) return;
    phase = 'drop'; t = 0;
    sound.gate();
    ui.banner('⬇️ 떨어진다!');
  }

  function stop() {
    runToken++; clearTimeout(endTimer);
    sound.stop(0.2); clearRunners();
    phase = 'idle'; gate.position.x = 0; gate.visible = true; hitPulse = 0;
  }

  function update(dt, time) {
    if (phase === 'drop' || phase === 'result') t += dt;
    else if (phase === 'ready') t = Math.min(0, t + dt);

    // ☕ 표시: 준비 중과 설정 화면에서도 오간다. 칸이 바뀔 때 째깍
    const mp = phase === 'idle' ? pingpong(time * MARKER_SPEED) : markerAt(plan, t);
    marker.position.x = xOf(slotM(0)) + mp * DX;
    marker.scale.setScalar(1.25 * (1 + hitPulse * 0.5 * Math.abs(Math.sin(time * 10))));
    markerLight.position.set(marker.position.x, 1.2, 1.4); markerLight.intensity = 8 + 20 * hitPulse;
    const ms = Math.round(mp);
    slotTiles.forEach((tile, s) => { tile.material.emissiveIntensity += ((s === ms ? 1.6 : 0) - tile.material.emissiveIntensity) * Math.min(1, dt * 12); });
    if (phase === 'drop' && ms !== lastMarkerSlot && t < (plan?.freezeT ?? 0)) { if (lastMarkerSlot >= 0) sound.tick(); lastMarkerSlot = ms; }

    // 문이 옆으로 열린다
    if (phase === 'drop' || phase === 'result') { gate.position.x += (W + 2 - gate.position.x) * Math.min(1, dt * 8); gate.visible = gate.position.x < W; }

    for (const rn of runners) {
      if (!rn.landed && (phase === 'drop' || phase === 'result')) {
        while (rn.seg < rn.path.length - 1 && t >= rn.path[rn.seg + 1].t) {
          rn.seg++;
          const p = rn.path[rn.seg];
          if (p.row !== undefined) {   // 못에 부딪힘: 못이 반짝이고 '띵', 도는 방향이 바뀐다
            const peg = pegs.get(`${p.row},${p.m}`); if (peg) peg.glow = 1;
            sound.peg(p.row, p.x / (W / 2) * 0.8);
            rn.spinV = (rn.path[rn.seg + 1]?.x > p.x ? -1 : 1) * (4 + Math.random() * 5);
          }
          if (p.slot !== undefined) { onLand(rn); break; }
        }
        if (!rn.landed) {
          const a = rn.path[rn.seg], b = rn.path[rn.seg + 1];
          [rn.bx, rn.by] = hopPos(a, b, t);   // 정해진 경로 위치. 실제 위치는 bump()에서 부딪힘을 더해 정한다
          rn.spin.rotation.z += rn.spinV * dt;
        }
      }
      // 칸에 들어가면 바로 선다. 당첨된 동물은 깜짝 놀라 펄쩍
      if (rn.landed) {
        rn.spin.rotation.z *= Math.exp(-dt * 10);
        rn.settle = Math.max(0, rn.settle - dt * 3);
        rn.startle = Math.max(0, rn.startle - dt * 0.9);
        const jump = rn.startle > 0 ? Math.max(0, Math.sin(Math.min(1, (1 - rn.startle) * 2.2) * PI)) * 1.6 : 0;
        rn.holder.position.y = FLOOR_Y + Math.sin(rn.settle * PI) * 0.25 + jump;
        rn.phase += dt * (rn.startle ? 14 : 3);
        rn.model.animate(rn.phase, rn.startle ? 0.8 : 0.1);
      } else rn.model.animate(rn.phase += dt * 6, 0.5);
    }
    if (phase === 'drop' || phase === 'result') bump(dt);
    for (const peg of pegs.values()) if (peg.glow > 0) { peg.glow = Math.max(0, peg.glow - dt * 3); peg.mesh.material.emissiveIntensity = peg.glow * 1.4; }
    hitPulse = Math.max(0, hitPulse - dt * 0.25);

    // 카메라: 판 전체가 보이게. 설정 화면에서는 살짝 좌우로 흔들린다
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needH = boardH + 1.6, needW = W + 2.4;
    const dist = Math.max(needH / 2 / tanV, needW / 2 / (tanV * camera.aspect)) + 2;
    const sway = phase === 'idle' ? Math.sin(time * 0.3) * 0.35 : 0;
    camPos.set(Math.sin(sway) * dist, boardH / 2 + 0.2, Math.cos(sway) * dist);
    camLook.set(0, boardH / 2 - 0.4, 0);
    camera.position.copy(camPos); camera.lookAt(camLook);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 40 : 30;   // 좁은 시야로 멀리서 봐야 못이 비스듬히 늘어나 보이지 않는다
    camera.updateProjectionMatrix();
    sizeLabels(runners.map(rn => rn.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
