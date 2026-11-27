// 💣 폭탄 돌리기: 동물들이 둥글게 앉아 10초짜리 장난감 커피 폭탄을 서로 던진다.
// 펑! 하는 순간 폭탄을 들고 있던 동물의 주인이 커피를 산다. 누가 언제 누구에게 던질지는 plan.js에서 시작할 때 정한다.
import * as THREE from 'three';
import { esc } from '../../shared/util.js';
import { canvasTex, disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
import { PLAYER_COLORS } from '../../shared/roster.js';
import { makeLabel, sizeLabels } from '../../shared/labels.js';
import { createBurst, makeExclaim, animateExclaim } from '../../shared/fx.js';
import { ui } from '../../shared/ui.js';
import { planBomb, bombAt, DURATION } from './plan.js';
import { createBombAudio } from './sound.js';

const PI = Math.PI, TAU = PI * 2;
const SEAT_R = 4.3, MAT_R = 3.4;

export default {
  id: 'bomb',
  title: '폭탄 돌리기',
  emoji: '💣',
  rule: `${DURATION}초짜리 장난감 커피 폭탄을 아무에게나 던져 넘깁니다. 펑! 하는 순간 폭탄을 들고 있던 동물의 주인이 커피를 삽니다.`,
  startLabel: '💣 시작',
  create,
};

function create() {
  // ───────────── 장면: 해 질 녘 잔디, 둥근 돗자리 ─────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2140);
  scene.fog = new THREE.Fog(0x2b2140, 18, 40);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  const hemi = new THREE.HemisphereLight(0xffd6b0, 0x2a3b2a, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb880, 1.5);
  sun.position.set(-8, 12, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun);
  {
    const grass = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 1 }));
    grass.rotation.x = -PI / 2; grass.receiveShadow = true; scene.add(grass);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(MAT_R, MAT_R, 0.05, 48), new THREE.MeshStandardMaterial({
      roughness: 0.9,
      map: canvasTex(256, 256, (x, w, h) => {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#e94f4f' : '#fff3e0'; x.fillRect(i * 32, j * 32, 32, 32); }
      }),
    }));
    mat.position.y = 0.025; mat.receiveShadow = true; scene.add(mat);
    // 둘레의 작은 전구들
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU, b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
      b.position.set(Math.cos(a) * 7.5, 2.4 + Math.sin(i * 1.7) * 0.25, Math.sin(a) * 7.5); scene.add(b);
    }
  }

  // ───────────── 폭탄: 둥근 몸통, 뚜껑, 심지, 불꽃, 남은 초 ─────────────
  const bomb = new THREE.Group(); scene.add(bomb);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.35, metalness: 0.2, emissive: 0xff2200, emissiveIntensity: 0 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), bodyMat); body.castShadow = true; bomb.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.3 }));
  cap.position.y = 0.43; bomb.add(cap);
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#f5e6c8'; x.beginPath(); x.arc(w / 2, h / 2, 60, 0, TAU); x.fill();
    x.font = '80px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('☕', w / 2, h / 2 + 6);
  }) }));
  label.position.set(0, 0.05, 0.415); bomb.add(label);
  const fuse = new THREE.Group(); fuse.position.y = 0.5; bomb.add(fuse);
  const fuseMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.18, 0), new THREE.Vector3(0.18, 0.3, 0)]), 12, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0xd8c7a0 }));
  fuse.add(fuseMesh);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffd23f'); g.addColorStop(1, 'rgba(255,120,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  spark.scale.setScalar(0.5); spark.position.set(0.18, 0.3, 0); fuse.add(spark);
  const sparkLight = new THREE.PointLight(0xffa040, 3, 4, 1.5); sparkLight.position.copy(spark.position); fuse.add(sparkLight);
  // 남은 초: 폭탄 위에 뜨는 숫자 (정수가 바뀔 때만 다시 그린다)
  const timerCanvas = document.createElement('canvas'); timerCanvas.width = 256; timerCanvas.height = 128;
  const timerTex = new THREE.CanvasTexture(timerCanvas); timerTex.colorSpace = THREE.SRGBColorSpace;
  const timer = new THREE.Sprite(new THREE.SpriteMaterial({ map: timerTex, transparent: true, depthTest: false }));
  timer.renderOrder = 12; timer.scale.set(1.4, 0.7, 1); scene.add(timer);
  let shownSec = -1;
  function drawTimer(sec) {
    if (sec === shownSec) return; shownSec = sec;
    const x = timerCanvas.getContext('2d'), urgent = sec <= 3;
    x.clearRect(0, 0, 256, 128);
    x.fillStyle = urgent ? 'rgba(200,20,20,0.9)' : 'rgba(0,0,0,0.7)'; x.beginPath(); x.roundRect(48, 8, 160, 112, 30); x.fill();
    x.font = 'bold 84px -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    x.fillText(String(sec), 128, 68);
    timerTex.needsUpdate = true;
  }

  // ───────────── 상태 ─────────────
  const sound = createBombAudio();
  const fxBurst = createBurst(scene, (x, z) => Math.hypot(x, z) < MAT_R ? 0.05 : 0);
  let seats = [], plan = null, phase = 'idle', t = 0, runToken = 0, resultTimer = 0, lastSec = DURATION, lastPass = -1, shake = 0;
  const camPos = new THREE.Vector3(0, 8, 11), camLook = new THREE.Vector3(0, 1, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();

  function seatPlayers(players) {
    clearSeats();
    const n = players.length;
    seats = players.map((p, i) => {
      const a = PI / 2 + (i / n) * TAU, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const holder = new THREE.Group(); holder.position.copy(dir).multiplyScalar(SEAT_R);
      const model = makeAnimal(p.animal), s = THREE.MathUtils.clamp(2.0 / model.height, 0.6, 1.25);
      model.root.scale.setScalar(s); model.root.rotation.y = Math.atan2(dir.z, -dir.x); holder.add(model.root);
      const h = model.height * s, color = PLAYER_COLORS[i];
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      ring.rotation.x = -PI / 2; ring.position.y = 0.06; holder.add(ring);
      const lab = makeLabel(p.name, color); lab.position.y = h + 0.6 + (i % 2) * 0.5; holder.add(lab);
      scene.add(holder);
      // 폭탄을 드는 자리: 몸 앞쪽, 머리보다 조금 아래
      const hand = dir.clone().multiplyScalar(SEAT_R - 1.0).setY(Math.max(0.8, h * 0.55 + 0.3));
      return { player: p, animal: ANIMALS[p.animal], color, holder, model, dir, h, hand, label: lab, catches: 0, phase: Math.random() * 6, hop: 0, startle: 0, exclaim: null };
    });
    resize();
  }
  function clearSeats() { seats.forEach(st => disposeTree(st.holder)); seats = []; }

  function placeBomb(dt, time) {
    if (!plan) { bomb.position.set(0, 0.47, 0); bomb.rotation.set(0, time * 0.4, 0); return; }
    const where = bombAt(plan, Math.min(t, DURATION));
    if (where.holder !== undefined) {
      const st = seats[where.holder];
      bomb.position.copy(st.hand); bomb.position.y += Math.sin(time * 18) * 0.03 * (1 + t / DURATION);
      bomb.rotation.y += dt * 2; bomb.rotation.z *= Math.exp(-dt * 8);
    } else {
      const a = seats[where.from].hand, b = seats[where.to].hand, k = where.k;
      bomb.position.lerpVectors(a, b, k); bomb.position.y += Math.sin(PI * k) * (1.6 + a.distanceTo(b) * 0.15);
      bomb.rotation.z += dt * 14; bomb.rotation.y += dt * 6;
    }
  }

  let lastHud = '';
  function hud(holderName, secLeft) {
    const html = `<div class="odds">남은 시간 <b>${secLeft}</b>초</div><div class="duel">💣 ${esc(holderName)}</div>`;
    if (html !== lastHud) { lastHud = html; ui.hud('폭탄 돌리기', html); }
  }

  function boom() {
    phase = 'boom';
    const L = seats[plan.loser], token = runToken;
    sound.boom(); ui.flash(); ui.pop('펑!');
    shake = 1.2;
    fxBurst.burst(bomb.position.clone(), new THREE.Vector3(0, 1, 0), { speed: 6, spread: 7, beans: 90, confetti: 120 });
    bomb.visible = false; timer.visible = false;
    ui.banner(`☕ ${L.player.name} 당첨!`);
    hud(L.player.name, 0);
    L.startle = 1; L.exclaim = makeExclaim(); L.exclaim.position.y = L.h + 0.35; L.holder.add(L.exclaim);
    playCall(L.animal.name, { vol: 1 });
    setTimeout(() => { if (token === runToken) playLoserCry(L.animal.name); }, 700);
    seats.forEach((st, i) => { if (st !== L) setTimeout(() => { if (token === runToken) st.hop = 1; }, 400 + i * 150); });
    // 카메라: 놀란 동물을 가운데 쪽에서 정면으로
    wantPos.copy(L.dir).multiplyScalar(SEAT_R * 0.2).setY(L.h + 1.8);
    wantLook.copy(L.dir).multiplyScalar(SEAT_R).setY(L.h * 0.7);
    resultTimer = setTimeout(() => { if (token === runToken) showResult(); }, 4200);
  }

  function showResult() {
    phase = 'result';
    const L = seats[plan.loser], order = [L, ...seats.filter(s => s !== L)];
    ui.showResult({
      title: `☕ 오늘의 커피는 ${L.player.name}!`,
      head: ['', '참가자', '동물', '기록'],
      rows: order.map(st => [
        st === L ? '💥' : '😮‍💨',
        esc(st.player.name),
        `<span class="dot" style="background:${st.color}"></span>${st.animal.name}`,
        st === L ? '폭탄을 든 채 펑!' : st.catches ? `${st.catches}번 받고 넘김` : seats.indexOf(st) === plan.start ? '처음 들고 시작' : '한 번도 안 받음',
      ]),
    });
  }

  // ───────────── 게임 인터페이스 ─────────────
  async function start(players) {
    const token = ++runToken;
    seatPlayers(players);
    plan = planBomb(players.length);
    phase = 'ready'; t = 0; lastSec = DURATION; lastPass = -1; shownSec = -1; lastHud = '';
    bomb.visible = true; timer.visible = true; fuse.scale.setScalar(1);
    drawTimer(DURATION);
    hud(seats[plan.start].player.name, DURATION);
    ui.banner(`💣 ${DURATION}초 뒤에 펑! 들고 있으면 커피!`);
    if (!await ui.countdown(() => token === runToken)) return;
    phase = 'play';
    ui.hideBanner();
    sound.start();
  }

  function stop() {
    runToken++; clearTimeout(resultTimer);
    sound.stop(0.2); fxBurst.clear(); clearSeats();
    plan = null; phase = 'idle'; shake = 0;
    bomb.visible = true; timer.visible = true; bodyMat.emissiveIntensity = 0;
  }

  const tmp = new THREE.Vector3();
  function update(dt, time) {
    if (phase === 'play') {
      t += dt;
      const p = Math.min(1, t / DURATION), secLeft = Math.max(0, Math.ceil(DURATION - t));
      sound.setProgress(p, DURATION - t);
      // 넘기기: 던질 때 휙, 받을 때 탁
      const k = plan.passes.findIndex(ps => t < ps.land);
      const cur = k === -1 ? plan.passes.length : k;
      for (let i = lastPass + 1; i < plan.passes.length && plan.passes[i].land <= t; i++) {
        const ps = plan.passes[i], to = seats[ps.to];
        sound.catch_(); to.catches++; to.hop = 0.6;
        if (Math.random() < 0.35) playCall(to.animal.name, { vol: 0.5 });
        lastPass = i;
      }
      const thrown = plan.passes[cur];
      if (thrown && t >= thrown.at && !thrown.tossed) { thrown.tossed = true; sound.toss(); seats[thrown.from].hop = 0.5; }
      const where = bombAt(plan, t);
      if (secLeft !== lastSec) {
        lastSec = secLeft;
        if (secLeft > 0) { sound.second(secLeft); if (secLeft <= 3) ui.pop(String(secLeft)); }
      }
      drawTimer(Math.max(1, secLeft));
      hud(where.holder !== undefined ? seats[where.holder].player.name : '…', secLeft);
      // 폭탄이 점점 빨갛게, 점점 빨리 깜빡인다. 심지가 짧아진다
      bodyMat.emissiveIntensity = Math.max(0, Math.sin(time * (4 + 22 * p))) * (0.2 + 1.3 * p);
      fuse.scale.setScalar(1 - 0.7 * p);
      sparkLight.intensity = 2 + Math.random() * 3; spark.scale.setScalar(0.35 + Math.random() * 0.3);
      if (t >= DURATION) boom();
    } else if (phase === 'ready') {
      bodyMat.emissiveIntensity = 0;
    }

    placeBomb(dt, time);
    timer.position.copy(bomb.position).add(tmp.set(0, 1.0, 0));

    // 동물: 숨쉬기, 폭탄 든 동물은 덜덜, 받거나 던지면 폴짝, 펑에 깜짝
    const holding = plan && phase === 'play' ? bombAt(plan, t).holder : undefined;
    seats.forEach((st, i) => {
      const shaking = i === holding;
      st.phase += dt * (shaking ? 10 : 2.5);
      st.model.animate(st.phase, shaking ? 0.3 : 0.08);
      st.hop = Math.max(0, st.hop - dt * 2);
      st.startle = Math.max(0, st.startle - dt * 0.9);
      const hopY = Math.sin((1 - st.hop) * PI) * 0.5 * (st.hop > 0 ? 1 : 0);
      const jump = st.startle > 0 ? Math.max(0, Math.sin(Math.min(1, (1 - st.startle) * 2.2) * PI)) * 1.3 : 0;
      const jx = shaking ? (Math.random() - 0.5) * 0.05 : 0;
      st.holder.position.set(st.dir.x * SEAT_R + jx, hopY + jump, st.dir.z * SEAT_R);
      st.model.root.rotation.z = st.startle > 0 ? Math.sin(Math.min(1, (1 - st.startle) * 1.6) * PI) * 0.4 : 0;
      if (st.exclaim) animateExclaim(st.exclaim, dt, time, st.h + 0.35);
    });
    fxBurst.update(dt);

    // 카메라: 설정 화면에서는 천천히 돈다. 게임 중에는 점점 다가가며 폭탄 쪽을 본다
    const portrait = camera.aspect < 1;
    if (phase === 'idle') {
      const a = time * 0.1, r = portrait ? 15 : 11;
      wantPos.set(Math.cos(a) * r, portrait ? 10 : 7.5, Math.sin(a) * r); wantLook.set(0, 0.8, 0);
    } else if (phase === 'ready' || phase === 'play') {
      const p = phase === 'play' ? Math.min(1, t / DURATION) : 0, k = portrait ? 1.9 : 1;
      wantPos.set(0, (8.5 - 2.5 * p) * k, (10.5 - 3.5 * p) * k);
      wantLook.set(bomb.position.x * 0.5 * p, 0.8 + 0.4 * p, bomb.position.z * 0.5 * p);
    }
    const rate = phase === 'boom' || phase === 'result' ? 2 : 3;
    camPos.lerp(wantPos, 1 - Math.exp(-dt * rate)); camLook.lerp(wantLook, 1 - Math.exp(-dt * rate));
    shake = Math.max(0, shake - dt * 1.5);
    camera.position.copy(camPos).add(tmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(shake * 0.4));
    camera.lookAt(camLook);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 60 : 45;
    camera.updateProjectionMatrix();
    sizeLabels(seats.map(s => s.label), camera);
  }

  return { scene, camera, start, stop, update, resize };
}
