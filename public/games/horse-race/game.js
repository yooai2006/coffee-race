// 🏇 동물 레이스: 경마장 1바퀴. 꼴찌로 들어온 동물의 주인이 커피를 산다.
// 진행 단계(phase): idle(설정 화면 배경) → countdown → race → finish(결승 카메라) → result
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { PLAYER_COLORS, MAX_PLAYERS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { ui } from '../../shared/ui.js';
import { LANE_W, X_FIN, laneR, lapLen, trackPoint, buildTrack } from './track.js';
import { planRace, frac } from './race-plan.js';
import { createRaceAudio } from './sound.js';

const PI = Math.PI;
const K_STOP = 8;   // 결승 뒤 멈추는 빠르기

export default {
  id: 'race',
  title: '동물 레이스',
  emoji: '🏇',
  rule: '꼴찌로 들어오는 동물의 주인이 커피를 삽니다. 참가자를 입력하고 각자 동물을 고르세요.',
  startLabel: '🏁 경주 시작',
  create,
};

function create() {
  // ── 장면 ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd3f0);
  scene.fog = new THREE.Fog(0x9fd3f0, 220, 520);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 1200);
  const camLook = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a7a3a, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(60, 130, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 120, bottom: -120, near: 1, far: 400 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  buildTrack(scene);

  // ── 상태 ──
  let phase = 'idle', runners = [], raceT = 0, timeScale = 1, finishCamT = 0, finishedCount = 0, resultTimer = 0, finishCamZ = 0, finishCamSpan = 0;
  let runToken = 0, hudAcc = 0;
  const sound = createRaceAudio();

  function runnerDist(rn, t) {
    if (t <= 0) return 0;
    if (t < rn.T) return frac(rn.prof, t) * rn.L;
    return rn.L + rn.vEnd * (1 - Math.exp(-(t - rn.T) * K_STOP)) / K_STOP;
  }

  function buildRace(players) {
    clearRunners();
    const n = players.length, plan = planRace(n), laneOff = Math.floor((MAX_PLAYERS - n) / 2);
    runners = players.map((p, i) => {
      const animal = ANIMALS[p.animal], color = PLAYER_COLORS[i], model = makeAnimal(p.animal);
      const r = laneR(i + laneOff), L = lapLen(r), prof = plan.profs[i], T = plan.T[i];
      const label = makeLabel(p.name, color); label.position.y = model.height + 0.9 + (i % 2) * 0.9; model.root.add(label);
      // 발밑의 참가자 색 고리: 위에서 볼 때 누가 누군지 구분
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.5, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      ring.rotation.x = -PI / 2; ring.position.y = 0.08; ring.scale.set(1.25, 0.8, 1); model.root.add(ring);
      scene.add(model.root);
      const vEnd = (frac(prof, T) - frac(prof, T - 0.01)) / 0.01 * L;
      return { player: p, animal, color, label, ...model, r, L, prof, T, vEnd, rank: plan.order.indexOf(i) + 1, nextCall: 0.3 + Math.random() * 1.8, finished: false, phase: Math.random() * 6, lastD: 0 };
    });
    const lanes = runners.map(rn => rn.r);
    finishCamZ = (Math.min(...lanes) + Math.max(...lanes)) / 2;
    finishCamSpan = Math.max(...lanes) - Math.min(...lanes) + LANE_W;
    resize();
    finishCamT = plan.T[plan.order[0]] - 0.6;   // 선두가 결승선에 닿기 직전 결승 카메라로 전환
    raceT = 0; timeScale = 1; finishedCount = 0;
    placeRunners(0);
  }
  function clearRunners() {
    runners.forEach(rn => disposeTree(rn.root));
    runners = [];
  }

  function placeRunners(dt) {
    for (const rn of runners) {
      const d = runnerDist(rn, raceT);
      const [x, z] = trackPoint(d, rn.r), [x2, z2] = trackPoint(d + 0.5, rn.r);
      rn.root.position.set(x, 0, z);
      rn.root.rotation.y = Math.atan2(-(z2 - z), x2 - x);
      const speed = dt > 0 ? (d - rn.lastD) / dt : 0;   // 화면상 속도 (슬로모션 반영)
      rn.lastD = d; rn.d = d;
      const amp = Math.min(0.75, speed * 0.06);
      rn.phase += speed * dt * 0.45;
      rn.animate(rn.phase, amp / 0.75);
    }
  }

  // ── 카메라 ──
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpUp = new THREE.Vector3(), camUp = new THREE.Vector3(0, 0, -1), scrR = new THREE.Vector3();
  function updateCamera(dt, time) {
    if (phase === 'idle') {
      const a = time * 0.05;
      camera.position.set(Math.cos(a) * 140, 95, Math.sin(a) * 140);
      camLook.set(0, 0, 0);
    } else if (phase === 'countdown' || phase === 'race') {
      // 화면 위쪽이 가리킬 지면 방향 U: 가로 화면은 고정(−z), 세로 화면은 무리가 달리는 방향.
      // 세로 화면에서는 무리가 화면 긴 쪽으로 늘어서서 더 크게 보인다.
      if (camera.aspect < 1) {
        tmpUp.set(0, 0, 0);
        for (const rn of runners) { const a = rn.root.rotation.y; tmpUp.x += Math.cos(a); tmpUp.z -= Math.sin(a); }
        tmpUp.normalize();
      } else tmpUp.set(0, 0, -1);
      const k = phase === 'countdown' ? 1 : 1 - Math.exp(-dt * 4);
      camUp.lerp(tmpUp, k).normalize();
      scrR.set(-camUp.z, 0, camUp.x);
      // 화면 축 기준 경계 상자 → 모두 들어오는 최소 높이
      let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity;
      for (const rn of runners) {
        const p = rn.root.position, r = p.x * scrR.x + p.z * scrR.z, u = p.x * camUp.x + p.z * camUp.z;
        r0 = Math.min(r0, r); r1 = Math.max(r1, r); u0 = Math.min(u0, u); u1 = Math.max(u1, u);
      }
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // 세로 화면은 무리를 화면 아래쪽으로 내려서 왼쪽 위 순위표에 가리지 않게 한다
      const lift = camera.aspect < 1 ? 0.14 : 0;
      const h = THREE.MathUtils.clamp(Math.max(((r1 - r0) / 2 + 4) / (tanV * camera.aspect), ((u1 - u0) / 2 + 6) / tanV * (1 + lift * 2), 26), 26, 150);
      const mr = (r0 + r1) / 2, mu = (u0 + u1) / 2 + h * tanV * lift;
      tmpLook.set(scrR.x * mr + camUp.x * mu, 0, scrR.z * mr + camUp.z * mu);
      tmpPos.set(tmpLook.x - camUp.x * h * 0.38, h, tmpLook.z - camUp.z * h * 0.38);
      camera.position.lerp(tmpPos, k); camLook.lerp(tmpLook, k);
      camera.up.copy(camUp);
    } else {
      // 결승선 뒤에서 들어오는 동물들을 바라보는 시점. 화면이 좁으면 모든 레인이 들어오도록 더 뒤로 물러난다.
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(17, (finishCamSpan / 2 + 2.5) / (tanV * camera.aspect));
      const back = Math.min(4, (raceT - finishCamT) * 0.6);
      camera.position.set(X_FIN + dist + back, 4.2 + (dist - 17) * 0.12, finishCamZ + 3 * Math.min(1, camera.aspect));
      camLook.set(X_FIN - 22, 1.2, finishCamZ);
    }
    if (phase === 'idle' || phase === 'finish' || phase === 'result') camera.up.set(0, 1, 0);
    camera.lookAt(camLook);
  }

  // ── 화면 ──
  function updateHud() {
    const sorted = [...runners].sort((a, b) => (a.finished && b.finished) ? a.rank - b.rank : (b.d / b.L) - (a.d / a.L));
    ui.hud('실시간 순위', sorted.map((rn, i) =>
      `<div class="r${rn.finished ? ' done' : ''}"><b>${i + 1}</b><i style="background:${rn.color}"></i>${esc(rn.player.name)} <small style="opacity:.7">${rn.animal.name}</small>${rn.finished ? ' 🏁' : ''}</div>`).join(''));
  }

  function showResult() {
    phase = 'result';
    const sorted = [...runners].sort((a, b) => a.rank - b.rank);
    ui.showResult({
      title: '🏁 경주 결과',
      head: ['순위', '참가자', '동물', '기록'],
      rows: sorted.map((rn, i) => [
        ['🥇', '🥈', '🥉'][i] ?? `${i + 1}위`,
        esc(rn.player.name),
        `<span class="dot" style="background:${rn.color}"></span>${rn.animal.name}`,
        `${rn.T.toFixed(2)}초`,
      ]),
    });
  }

  // ── 게임 인터페이스 ──
  async function start(players) {
    const token = ++runToken;
    buildRace(players);
    phase = 'countdown';
    updateHud();
    sound.crowd();
    if (!await ui.countdown(() => token === runToken)) return;
    phase = 'race';
    sound.go();
  }

  function stop() {
    runToken++;
    clearRunners(); clearTimeout(resultTimer);
    sound.stop();
    phase = 'idle';
  }

  function update(dt, time) {
    if (phase === 'race' || phase === 'finish' || phase === 'result') {
      const rdt = dt * timeScale;
      raceT += rdt;
      if (phase === 'race' && raceT >= finishCamT) {
        phase = 'finish'; timeScale = 0.7;
        ui.flash();
      }
      for (const rn of runners) {
        if (rn.finished || raceT < rn.T) continue;
        rn.finished = true; finishedCount++;
        if (finishedCount === 1) { ui.banner(`🏁 1위 골인! ${rn.player.name} (${rn.animal.name})`); sound.firstIn(); }
        if (finishedCount === runners.length) {
          ui.banner('🏁 경주 종료!');
          sound.end();
          playLoserCry(rn.animal.name);   // 마지막으로 들어온 동물이 운다
          timeScale = 1;
          resultTimer = setTimeout(showResult, 2200);
        }
      }
      placeRunners(rdt);
      // 달리는 동안 각자 가끔 운다. 화면 왼쪽/오른쪽 위치에 맞춰 스테레오로 들린다.
      for (const rn of runners) {
        if (rn.finished || raceT < rn.nextCall) continue;
        rn.nextCall = raceT + 2.2 + Math.random() * 2.8;
        const x = tmpPos.copy(rn.root.position).project(camera).x;
        playCall(rn.animal.name, { vol: 0.45, pan: THREE.MathUtils.clamp(x, -1, 1) * 0.8 });
      }
      if ((hudAcc += dt) > 0.15) {
        hudAcc = 0; updateHud();
        if (finishedCount === 0) sound.setExcite(Math.max(...runners.map(rn => rn.d / rn.L)));
      }
    }
    updateCamera(dt, time);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 64 : 50;   // 세로 화면은 시야를 넓혀 레인이 잘리지 않게
    camera.updateProjectionMatrix();
    sizeLabels(runners.map(rn => rn.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
