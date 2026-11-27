// 경마 게임 본체: 3D 장면, 경주 진행, 카메라, 순위표, 결과
// 진행 단계(phase): setup → countdown → race → finish(결승 카메라) → result
import * as THREE from 'three';
import { $, esc, sleep } from '../../shared/util.js';
import { canvasTex, disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { audioCtx, beep, bindMuteButton } from '../../shared/audio.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { MAX_PLAYERS, LANE_W, X_FIN, laneR, lapLen, trackPoint, buildTrack } from './track.js';
import { planRace, frac } from './race-plan.js';
import { players, initSetup, renderSetup, renderPreview } from './setup.js';

const PI = Math.PI;

// ───────────────────────── Three.js 장면 ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

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

// ───────────────────────── 이름표 ─────────────────────────
// 이름표는 거리와 상관없이 화면에서 LABEL_PX 높이로 보인다 (sizeAttenuation: false).
// 가로 길이는 이름 길이에 맞춰 캔버스 비율(aspect)로 정한다.
const LABEL_PX = 24;
function makeLabel(text, color) {
  const H = 96, font = 'bold 56px -apple-system, "Apple SD Gothic Neo", sans-serif';
  const meas = document.createElement('canvas').getContext('2d'); meas.font = font;
  const W = Math.ceil(meas.measureText(text).width) + 96;
  const tex = canvasTex(W, H, (x, w, h) => {
    x.fillStyle = 'rgba(0,0,0,0.72)'; x.beginPath(); x.roundRect(2, 2, w - 4, h - 4, 40); x.fill();
    x.strokeStyle = color; x.lineWidth = 6; x.stroke();
    x.fillStyle = color; x.beginPath(); x.arc(40, h / 2, 14, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = font; x.textBaseline = 'middle';
    x.fillText(text, 64, h / 2 + 3);
  });
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
  sp.renderOrder = 10; sp.userData.aspect = W / H;
  return sp;
}
function sizeLabels() {
  const sy = LABEL_PX / innerHeight * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const rn of runners) rn.label.scale.set(sy * rn.label.userData.aspect, sy, 1);
}

// ───────────────────────── 게임 상태 ─────────────────────────
let phase = 'setup', runners = [], raceT = 0, timeScale = 1, finishCamT = 0, finishedCount = 0, resultTimer = 0, finishCamZ = 0, finishCamSpan = 0;
const K_STOP = 8;   // 결승 뒤 멈추는 빠르기

function runnerDist(rn, t) {
  if (t <= 0) return 0;
  if (t < rn.T) return frac(rn.prof, t) * rn.L;
  return rn.L + rn.vEnd * (1 - Math.exp(-(t - rn.T) * K_STOP)) / K_STOP;
}

function buildRace() {
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
  sizeLabels();
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

// ───────────────────────── 카메라 ─────────────────────────
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpUp = new THREE.Vector3(), camUp = new THREE.Vector3(0, 0, -1), scrR = new THREE.Vector3();
function updateCamera(dt, time) {
  if (phase === 'setup') {
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
  if (phase === 'setup' || phase === 'finish' || phase === 'result') camera.up.set(0, 1, 0);
  camera.lookAt(camLook);
}

// ───────────────────────── 화면 전환 ─────────────────────────
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.add('show'); }

function toSetup(clear) {
  clearRunners(); clearTimeout(resultTimer);
  if (clear) players.length = 0;
  phase = 'setup';
  ['#result', '#hud'].forEach(s => $(s).classList.add('hidden'));
  $('#banner').classList.remove('show');
  $('#setup').classList.remove('hidden');
  renderSetup();
}

async function startRace() {
  $('#setup').classList.add('hidden');
  audioCtx();   // 시작 버튼 클릭 안에서 소리 허용
  buildRace();
  phase = 'countdown';
  $('#hud').classList.remove('hidden'); updateHud();
  const cd = $('#countdown');
  for (const s of ['3', '2', '1', 'GO!']) {
    cd.textContent = s; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
    beep(s === 'GO!' ? 880 : 440);
    await sleep(500);
    if (phase !== 'countdown') return;
  }
  phase = 'race';
}

function updateHud() {
  const sorted = [...runners].sort((a, b) => (a.finished && b.finished) ? a.rank - b.rank : (b.d / b.L) - (a.d / a.L));
  $('#hudList').innerHTML = sorted.map((rn, i) =>
    `<div class="r${rn.finished ? ' done' : ''}"><b>${i + 1}</b><i style="background:${rn.color}"></i>${esc(rn.player.name)} <small style="opacity:.7">${rn.animal.name}</small>${rn.finished ? ' 🏁' : ''}</div>`).join('');
}

function showResult() {
  phase = 'result';
  const sorted = [...runners].sort((a, b) => a.rank - b.rank);
  $('#resultTitle').textContent = '🏁 경주 결과';
  $('#resultBody').innerHTML = sorted.map((rn, i) => {
    const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}위`;
    return `<tr><td class="rk">${medal}</td><td>${esc(rn.player.name)}</td>
      <td><span class="dot" style="background:${rn.color}"></span>${rn.animal.name}</td><td>${rn.T.toFixed(2)}초</td></tr>`;
  }).join('');
  $('#result').classList.remove('hidden');
}

// ───────────────────────── 루프 ─────────────────────────
const clock = new THREE.Clock();
let hudAcc = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  if (phase === 'race' || phase === 'finish' || phase === 'result') {
    const rdt = dt * timeScale;
    raceT += rdt;
    if (phase === 'race' && raceT >= finishCamT) {
      phase = 'finish'; timeScale = 0.7;
      const f = $('#flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
    }
    for (const rn of runners) {
      if (rn.finished || raceT < rn.T) continue;
      rn.finished = true; finishedCount++;
      if (finishedCount === 1) banner(`🏁 1위 골인! ${rn.player.name} (${rn.animal.name})`);
      if (finishedCount === runners.length) {
        banner('🏁 경주 종료!');
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
    if ((hudAcc += dt) > 0.15) { hudAcc = 0; updateHud(); }
  }
  if (phase === 'setup') renderPreview(dt);
  updateCamera(dt, time);
  renderer.render(scene, camera);
});

function fitView() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 64 : 50;   // 세로 화면은 시야를 넓혀 레인이 잘리지 않게
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  sizeLabels();
}
addEventListener('resize', fitView);
fitView();
$('#againBtn').onclick = () => toSetup(false);
$('#resetBtn').onclick = () => toSetup(true);
initSetup({ onStart: startRace });
bindMuteButton($('#muteBtn'));
