// 경마장: 트랙 모양(trackPoint)과 배경(잔디, 레인, 난간, 결승선, 관중석, 나무)
import * as THREE from 'three';
import { canvasTex } from '../../shared/three-utils.js';

export const MAX_PLAYERS = 8;   // 레인 수 = 최대 참가자 수

// 트랙: 두 직선(S) + 두 반원. 결승선 = 출발선 (아래쪽 직선 위 x = X_FIN), 1바퀴 경주.
export const S = 56, R_IN = 22, LANE_W = 2.4, PAD = 1.5;
export const R_OUT = R_IN + PAD * 2 + LANE_W * MAX_PLAYERS;
export const X_FIN = S / 4;
export const laneR = i => R_IN + PAD + LANE_W * (i + 0.5);
export const lapLen = r => 2 * S + 2 * Math.PI * r;

// 출발선에서 d만큼 달린 지점의 [x, z] (반지름 r 레인)
export function trackPoint(d, r) {
  const P = lapLen(r);
  let s = ((d + X_FIN + S / 2) % P + P) % P;
  if (s < S) return [-S / 2 + s, r];
  s -= S;
  if (s < Math.PI * r) { const th = s / r; return [S / 2 + r * Math.sin(th), r * Math.cos(th)]; }
  s -= Math.PI * r;
  if (s < S) return [S / 2 - s, -r];
  s -= S;
  const th = s / r; return [-S / 2 - r * Math.sin(th), -r * Math.cos(th)];
}

function stadiumShape(r, ShapeClass = THREE.Shape) {
  const s = new ShapeClass();
  s.moveTo(-S / 2, -r); s.lineTo(S / 2, -r);
  s.absarc(S / 2, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-S / 2, r);
  s.absarc(-S / 2, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

// 경마장 전체를 scene에 올린다
export function buildTrack(scene) {
  const flat = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };

  // 잔디, 내야, 주로
  flat(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x4f8a3c, roughness: 1 }), 0);
  flat(new THREE.ShapeGeometry(stadiumShape(R_IN), 64), new THREE.MeshStandardMaterial({ color: 0x63a64b, roughness: 1 }), 0.02);
  {
    const sh = stadiumShape(R_OUT); sh.holes.push(stadiumShape(R_IN, THREE.Path));
    flat(new THREE.ShapeGeometry(sh, 96), new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 1 }), 0.03);
  }
  // 레인 선
  {
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    for (let i = 0; i <= MAX_PLAYERS; i++) {
      const r = R_IN + PAD + LANE_W * i, P = lapLen(r), pts = [];
      for (let d = 0; d < P; d += 1.5) { const [x, z] = trackPoint(d, r); pts.push(new THREE.Vector3(x, 0.05, z)); }
      scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  // 난간
  {
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const postGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6);
    for (const r of [R_IN + 0.2, R_OUT - 0.2]) {
      const P = lapLen(r), pts = [];
      for (let d = 0; d < P; d += 2) { const [x, z] = trackPoint(d, r); pts.push(new THREE.Vector3(x, 1.1, z)); }
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 400, 0.12, 6, true), white);
      rail.castShadow = true; scene.add(rail);
      const count = Math.floor(P / 4), posts = new THREE.InstancedMesh(postGeo, white, count), m = new THREE.Matrix4();
      for (let i = 0; i < count; i++) { const [x, z] = trackPoint(i * 4, r); m.makeTranslation(x, 0.55, z); posts.setMatrixAt(i, m); }
      posts.castShadow = true; scene.add(posts);
    }
  }
  // 결승선 + 아치
  {
    const cells = 24;
    const tex = canvasTex(32, 16 * cells, (x) => {
      for (let j = 0; j < cells; j++) for (let i = 0; i < 2; i++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 16, j * 16, 16, 16); }
    });
    tex.magFilter = THREE.NearestFilter;
    const line = flat(new THREE.PlaneGeometry(1.6, R_OUT - R_IN), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0.06);
    line.position.set(X_FIN, 0.06, (R_IN + R_OUT) / 2);

    const red = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
    for (const z of [R_IN - 0.7, R_OUT + 0.7]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8, 10), red);
      pole.position.set(X_FIN, 4, z); pole.castShadow = true; scene.add(pole);
    }
    const len = R_OUT - R_IN + 1.4;
    const txt = canvasTex(1024, 72, (x, w, h) => {
      x.fillStyle = '#d32f2f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('🏁  FINISH  🏁', w / 2, h / 2 + 2);
    });
    const tm = new THREE.MeshStandardMaterial({ map: txt });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, len), [tm, tm, red, red, red, red]);
    bar.position.set(X_FIN, 8, (R_IN + R_OUT) / 2); bar.castShadow = true; scene.add(bar);
  }
  // 관중석
  {
    const zs = R_OUT + 8, mat = new THREE.MeshStandardMaterial({ color: 0xb0b6bf, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(110, 1 + i * 1.2, 2.6), mat);
      step.position.set(0, (1 + i * 1.2) / 2, zs + i * 2.6); step.castShadow = step.receiveShadow = true; scene.add(step);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(114, 0.5, 15), new THREE.MeshStandardMaterial({ color: 0x1f4e79 }));
    roof.position.set(0, 11, zs + 5); roof.castShadow = true; scene.add(roof);
    const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.1, 0.6), new THREE.MeshStandardMaterial(), 420);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let k = 0; k < 420; k++) {
      const i = k % 5;
      m.makeTranslation(-53 + Math.random() * 106, 1 + i * 1.2 + 0.55, zs + i * 2.6 + (Math.random() - 0.5));
      crowd.setMatrixAt(k, m); crowd.setColorAt(k, c.setHSL(Math.random(), 0.6, 0.55));
    }
    crowd.castShadow = true; scene.add(crowd);
  }
  // 나무
  {
    const N = 140, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), new THREE.MeshStandardMaterial({ color: 0x6d4c2f }), N);
    const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6, 8), new THREE.MeshStandardMaterial({ color: 0x2e6b30, roughness: 1 }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let placed = 0;
    while (placed < N) {
      const x = (Math.random() - 0.5) * 400, z = (Math.random() - 0.5) * 300;
      const dist = Math.hypot(Math.max(Math.abs(x) - S / 2, 0), z);
      if (dist < R_OUT + 10) continue;
      if (z > R_OUT && z < R_OUT + 32 && Math.abs(x) < 66) continue;
      const s = 0.8 + Math.random() * 0.7;
      sc.set(s, s, s);
      trunks.setMatrixAt(placed, m.compose(v.set(x, 1.5 * s, z), q, sc));
      crowns.setMatrixAt(placed, m.compose(v.set(x, 5.5 * s, z), q, sc));
      placed++;
    }
    trunks.castShadow = crowns.castShadow = true; scene.add(trunks, crowns);
  }
}
