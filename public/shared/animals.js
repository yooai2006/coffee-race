// 동물 18종의 3D 모델. 다른 게임에서도 캐릭터로 그대로 쓸 수 있다.
// 모든 동물은 +x 방향을 보고, build()는 { root, height, animate(phase, a) }를 돌려준다. a = 달리기 세기 0..1
// 단위 도형(G)을 공유하고 크기·회전으로 모양을 만든다. 공유 도형은 dispose하지 않는다 (disposeTree가 건너뛴다).
import * as THREE from 'three';
import { canvasTex } from './three-utils.js';

const G = {
  sph: new THREE.SphereGeometry(1, 18, 14),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 12),
};
Object.values(G).forEach(g => { g.userData.shared = true; });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const PI = Math.PI;

function part(parent, geo, mat, p, s = [1, 1, 1], r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
  parent.add(m); return m;
}
function group(parent, p) { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; }
function base() { const root = new THREE.Group(), rig = group(root, [0, 0, 0]); return { root, rig }; }
function eyes(parent, x, y, z, s = 0.06, c = '#151515') {
  const m = M(c, { roughness: 0.3 });
  for (const zz of [z, -z]) part(parent, G.sph, m, [x, y, zz], [s, s, s]);
}
function legs4(rig, { fx, bx, z, hipF, hipB = hipF, r, mat, hoof }) {
  return [[fx, z, 0, hipF], [fx, -z, 0.5, hipF], [bx, z, PI, hipB], [bx, -z, PI + 0.5, hipB]].map(([x, zz, off, hip]) => {
    const pivot = group(rig, [x, hip, zz]);
    part(pivot, G.cyl, mat, [0, -hip / 2, 0], [r, hip, r]);
    if (hoof) part(pivot, G.box, hoof, [0, -hip + 0.06, 0], [r * 2.2, 0.12, r * 2.2]);
    return { pivot, off };
  });
}
const gallop = (rig, legs, swing = 0.6, bob = 0.18) => (ph, a) => {
  for (const { pivot, off } of legs) pivot.rotation.z = Math.sin(ph + off) * swing * a;
  rig.position.y = Math.abs(Math.sin(ph)) * bob * a;
  rig.rotation.z = Math.sin(ph) * 0.04 * a;
};
// 몸통을 따라 고리 무늬 (구의 극축을 x로 눕혀서 쓰면 가로 줄무늬가 몸을 감는다)
function stripeMat(baseC, stripeC, n) {
  return M('#ffffff', { map: canvasTex(64, 256, (x, w, h) => {
    x.fillStyle = baseC; x.fillRect(0, 0, w, h); x.fillStyle = stripeC;
    for (let i = 1; i <= n; i++) {
      const y = (i / (n + 1)) * h; x.beginPath(); x.moveTo(0, y - 5);
      for (let u = 0; u <= w; u += 8) x.lineTo(u, y - 5 + Math.sin(u * 0.2 + i) * 4);
      for (let u = w; u >= 0; u -= 8) x.lineTo(u, y + 5 + Math.sin(u * 0.15 + i) * 4);
      x.fill();
    }
  }) });
}
function spotMat(baseC, spotC) {
  return M('#ffffff', { map: canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = baseC; x.fillRect(0, 0, w, h); x.fillStyle = spotC;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      x.beginPath(); x.roundRect(i * 32 + 3 + (j % 2) * 8, j * 32 + 3, 24 + Math.random() * 4, 24 + Math.random() * 4, 7); x.fill();
    }
  }) });
}

function buildRat() {
  const { root, rig } = base(), c = M('#8d8d95'), pink = M('#f2a7b5');
  part(rig, G.sph, c, [0, 0.8, 0], [0.95, 0.5, 0.5]);
  part(rig, G.sph, c, [0.95, 0.92, 0], [0.42, 0.33, 0.33]);
  part(rig, G.cone, c, [1.42, 0.86, 0], [0.17, 0.4, 0.17], [0, 0, -PI / 2]);
  part(rig, G.sph, pink, [1.62, 0.86, 0], [0.06, 0.06, 0.06]);
  for (const z of [0.2, -0.2]) part(rig, G.sph, pink, [0.82, 1.22, z], [0.05, 0.18, 0.17]);
  eyes(rig, 1.2, 1.02, 0.2, 0.05);
  part(rig, G.cyl, pink, [-1.62, 0.62, 0], [0.04, 1.4, 0.04], [0, 0, PI / 2 - 0.15]);
  const legs = legs4(rig, { fx: 0.5, bx: -0.5, z: 0.28, hipF: 0.55, r: 0.07, mat: pink });
  return { root, height: 1.4, animate: gallop(rig, legs, 0.9, 0.12) };
}
function buildOx() {
  const { root, rig } = base(), c = M('#8a5a2e'), ivory = M('#f3ead3'), dark = M('#2a1d14');
  part(rig, G.sph, c, [0, 1.38, 0], [1.15, 0.62, 0.6]);
  part(rig, G.sph, c, [1.3, 1.48, 0], [0.38, 0.36, 0.34]);
  part(rig, G.sph, M('#d9a38a'), [1.62, 1.34, 0], [0.2, 0.2, 0.27]);
  for (const s of [1, -1]) {
    part(rig, G.cone, ivory, [1.22, 1.86, 0.3 * s], [0.07, 0.42, 0.07], [0.7 * s, 0, 0]);
    part(rig, G.sph, c, [1.2, 1.56, 0.42 * s], [0.08, 0.06, 0.16]);
  }
  eyes(rig, 1.52, 1.58, 0.24);
  part(rig, G.cyl, c, [-1.22, 1.2, 0], [0.04, 0.9, 0.04], [0, 0, 0.2]);
  part(rig, G.sph, dark, [-1.13, 0.75, 0], [0.08, 0.15, 0.08]);
  const legs = legs4(rig, { fx: 0.75, bx: -0.75, z: 0.32, hipF: 1.0, r: 0.13, mat: c, hoof: dark });
  return { root, height: 2.1, animate: gallop(rig, legs, 0.55, 0.15) };
}
function buildTiger() {
  const { root, rig } = base(), c = M('#e8862a'), white = M('#f7f2e8'), black = M('#151515');
  part(rig, G.sph, stripeMat('#e8862a', '#1a1a1a', 7), [0, 1.22, 0], [0.45, 1.12, 0.48], [0, 0, PI / 2]);
  part(rig, G.sph, c, [1.22, 1.42, 0], [0.4, 0.36, 0.38]);
  part(rig, G.sph, white, [1.52, 1.31, 0], [0.18, 0.15, 0.22]);
  part(rig, G.sph, black, [1.68, 1.36, 0], [0.05, 0.05, 0.07]);
  for (const s of [1, -1]) part(rig, G.sph, c, [1.1, 1.74, 0.24 * s], [0.06, 0.13, 0.12]);
  eyes(rig, 1.5, 1.52, 0.2, 0.05);
  part(rig, G.cyl, stripeMat('#e8862a', '#1a1a1a', 5), [-1.45, 1.52, 0], [0.07, 1.0, 0.07], [0, 0, 1.1]);
  const legs = legs4(rig, { fx: 0.7, bx: -0.7, z: 0.28, hipF: 0.95, r: 0.13, mat: c, hoof: white });
  return { root, height: 2.0, animate: gallop(rig, legs, 0.75, 0.2) };
}
function buildRabbit() {
  const { root, rig } = base(), c = M('#f5f5f5'), pink = M('#f2a7b5');
  part(rig, G.sph, c, [0, 0.95, 0], [0.75, 0.6, 0.55]);
  part(rig, G.sph, c, [0.75, 1.45, 0], [0.38, 0.36, 0.34]);
  for (const s of [1, -1]) {
    part(rig, G.sph, c, [0.6, 2.05, 0.13 * s], [0.09, 0.45, 0.13], [0.15 * s, 0, 0.15]);
    part(rig, G.sph, pink, [0.66, 2.05, 0.13 * s], [0.04, 0.36, 0.08], [0.15 * s, 0, 0.15]);
  }
  part(rig, G.sph, pink, [1.12, 1.42, 0], [0.05, 0.05, 0.06]);
  eyes(rig, 1.0, 1.55, 0.2, 0.05, '#c0392b');
  part(rig, G.sph, c, [-0.78, 1.05, 0], [0.2, 0.2, 0.2]);
  const legs = legs4(rig, { fx: 0.45, bx: -0.4, z: 0.25, hipF: 0.55, r: 0.12, mat: c });
  return { root, height: 2.5, animate: gallop(rig, legs, 0.9, 0.38) };
}
function buildDragon() {
  const { root, rig } = base(), c = M('#2f9e5b'), belly = M('#e9d27a'), gold = M('#f4c542', { metalness: 0.4 }), spike = M('#f08a24');
  part(rig, G.sph, c, [0, 1.32, 0], [1.2, 0.5, 0.5]);
  part(rig, G.sph, belly, [0.1, 1.2, 0], [1.0, 0.4, 0.44]);
  part(rig, G.cyl, c, [1.2, 1.72, 0], [0.2, 0.8, 0.2], [0, 0, -0.93]);
  part(rig, G.sph, c, [1.6, 2.0, 0], [0.38, 0.28, 0.3]);
  part(rig, G.box, c, [1.95, 1.93, 0], [0.4, 0.2, 0.28]);
  eyes(rig, 1.7, 2.12, 0.22, 0.055, '#ffdd00');
  for (const s of [1, -1]) part(rig, G.cone, gold, [1.45, 2.3, 0.15 * s], [0.06, 0.45, 0.06], [0.25 * s, 0, 0.64]);
  for (let i = 0; i < 7; i++) {
    const x = 0.95 - i * 0.32, top = 1.32 + 0.5 * Math.sqrt(Math.max(0, 1 - (x / 1.2) ** 2));
    part(rig, G.cone, spike, [x, top + 0.08, 0], [0.1, 0.28, 0.1]);
  }
  part(rig, G.cone, c, [-1.85, 1.1, 0], [0.3, 1.55, 0.3], [0, 0, 1.83]);
  const wings = [1, -1].map(s => {
    const p = group(rig, [-0.1, 1.75, 0.3 * s]);
    part(p, G.box, M('#7fd1a0'), [0, 0, 0.45 * s], [0.9, 0.04, 0.85]);
    return { p, s };
  });
  const legs = legs4(rig, { fx: 0.7, bx: -0.7, z: 0.3, hipF: 0.9, r: 0.14, mat: c, hoof: M('#ffffff') });
  const run = gallop(rig, legs, 0.6, 0.15);
  return { root, height: 2.6, animate: (ph, a) => { run(ph, a); for (const { p, s } of wings) p.rotation.x = -s * (0.4 + 0.45 * Math.sin(ph * 0.7)); } };
}
function buildSnake() {
  const { root, rig } = base(), g1 = M('#5a9e3a'), g2 = M('#e2c94a');
  const segs = [];
  for (let i = 0; i < 11; i++) {
    const r = 0.3 * (1 - i / 13);
    segs.push(part(rig, G.sph, i % 2 ? g2 : g1, [0.8 - i * 0.3, r, 0], [0.24, r, r]));
  }
  const head = group(rig, [1.2, 0, 0]);
  part(head, G.sph, g1, [0, 0.3, 0], [0.36, 0.22, 0.28]);
  eyes(head, 0.15, 0.42, 0.17, 0.05, '#ffdd00');
  part(head, G.box, M('#d62828'), [0.42, 0.27, 0], [0.3, 0.03, 0.05]);
  return { root, height: 0.9, animate: (ph, a) => {
    const w = 0.25 + 0.75 * a;
    segs.forEach((s, i) => { s.position.z = Math.sin(ph * 0.7 - (i + 1) * 0.7) * 0.32 * w; });
    head.position.z = Math.sin(ph * 0.7) * 0.22 * w;
  } };
}
function buildHorse() {
  const { root, rig } = base(), c = M('#8b5a2b'), d = M('#2a1d14');
  part(rig, new THREE.CapsuleGeometry(0.45, 1.3, 6, 12), c, [0, 1.55, 0], [1, 1, 1], [0, 0, PI / 2]);
  part(rig, G.cyl, c, [0.95, 2.05, 0], [0.28, 1.05, 0.28], [0, 0, -0.75]);
  part(rig, G.box, d, [0.82, 2.18, 0], [0.1, 0.9, 0.08], [0, 0, -0.75]);
  part(rig, G.box, c, [1.45, 2.42, 0], [0.72, 0.3, 0.32], [0, 0, -0.55]);
  for (const s of [1, -1]) part(rig, G.cone, c, [1.22, 2.72, 0.09 * s], [0.06, 0.2, 0.06]);
  eyes(rig, 1.42, 2.55, 0.165, 0.045);
  part(rig, G.cone, d, [-1.28, 1.38, 0], [0.14, 1.0, 0.14], [0, 0, 2.6]);
  part(rig, G.box, M('#5a3a22'), [-0.05, 1.99, 0], [0.75, 0.05, 0.98]);
  const legs = legs4(rig, { fx: 0.68, bx: -0.68, z: 0.22, hipF: 1.3, r: 0.09, mat: c, hoof: d });
  return { root, height: 2.9, animate: gallop(rig, legs, 0.7, 0.18) };
}
function buildSheep() {
  const { root, rig } = base(), wool = M('#f4f1ea', { roughness: 1 }), dark = M('#3a3a3a');
  part(rig, G.sph, wool, [0, 1.2, 0], [0.95, 0.6, 0.6]);
  for (const [x, y, z] of [[0.5, 1.55, 0.25], [0.5, 1.55, -0.25], [-0.1, 1.65, 0.3], [-0.1, 1.65, -0.3], [-0.6, 1.5, 0.25], [-0.6, 1.5, -0.25], [0.1, 1.75, 0], [-0.9, 1.25, 0]])
    part(rig, G.sph, wool, [x, y, z], [0.38, 0.38, 0.38]);
  part(rig, G.sph, dark, [1.0, 1.45, 0], [0.28, 0.3, 0.24]);
  part(rig, G.sph, wool, [0.95, 1.72, 0], [0.2, 0.15, 0.2]);
  for (const s of [1, -1]) part(rig, G.sph, dark, [0.95, 1.48, 0.3 * s], [0.16, 0.06, 0.1]);
  eyes(rig, 1.18, 1.52, 0.14, 0.045, '#f5f5f5');
  const legs = legs4(rig, { fx: 0.5, bx: -0.5, z: 0.28, hipF: 0.85, r: 0.09, mat: dark });
  return { root, height: 2.2, animate: gallop(rig, legs, 0.6, 0.2) };
}
function buildMonkey() {
  const { root, rig } = base(), c = M('#7b4a2a'), face = M('#e8c39e');
  part(rig, G.sph, c, [0, 1.25, 0], [0.65, 0.48, 0.42], [0, 0, 0.3]);
  part(rig, G.sph, c, [0.7, 1.78, 0], [0.34, 0.34, 0.34]);
  part(rig, G.sph, face, [0.92, 1.72, 0], [0.18, 0.25, 0.26]);
  for (const s of [1, -1]) part(rig, G.sph, face, [0.66, 1.84, 0.37 * s], [0.06, 0.13, 0.13]);
  eyes(rig, 1.07, 1.82, 0.1, 0.045);
  part(rig, new THREE.TorusGeometry(0.35, 0.05, 6, 20, PI * 1.6), c, [-0.8, 1.6, 0]);
  const legs = legs4(rig, { fx: 0.4, bx: -0.4, z: 0.25, hipF: 1.15, hipB: 0.85, r: 0.1, mat: c, hoof: face });
  return { root, height: 2.3, animate: gallop(rig, legs, 0.8, 0.25) };
}
function buildRooster() {
  const { root, rig } = base(), white = M('#fbfbf6'), red = M('#d62828'), yellow = M('#f4b400'), tail = M('#1f3b2b', { metalness: 0.3 });
  part(rig, G.sph, white, [0, 1.3, 0], [0.55, 0.48, 0.42]);
  part(rig, G.sph, white, [0.38, 1.92, 0], [0.24, 0.27, 0.24]);
  for (const [x, y] of [[0.3, 2.2], [0.42, 2.23], [0.53, 2.17]]) part(rig, G.sph, red, [x, y, 0], [0.08, 0.1, 0.05]);
  part(rig, G.sph, red, [0.56, 1.75, 0], [0.06, 0.11, 0.05]);
  part(rig, G.cone, yellow, [0.68, 1.93, 0], [0.07, 0.2, 0.07], [0, 0, -PI / 2]);
  eyes(rig, 0.55, 2.0, 0.15, 0.04);
  for (const z of [-0.12, 0, 0.12]) part(rig, G.sph, tail, [-0.55, 1.75, z], [0.12, 0.45, 0.06], [z * 2, 0, 0.6]);
  for (const s of [1, -1]) part(rig, G.sph, white, [-0.05, 1.32, 0.4 * s], [0.4, 0.25, 0.05]);
  const legs = [1, -1].map((s, i) => {
    const p = group(rig, [0, 0.9, 0.15 * s]);
    part(p, G.cyl, yellow, [0, -0.45, 0], [0.05, 0.9, 0.05]);
    part(p, G.box, yellow, [0.1, -0.88, 0], [0.3, 0.05, 0.14]);
    return { p, off: i * PI };
  });
  return { root, height: 2.4, animate: (ph, a) => {
    for (const { p, off } of legs) p.rotation.z = Math.sin(ph + off) * 0.8 * a;
    rig.position.y = Math.abs(Math.sin(ph)) * 0.12 * a;
    rig.rotation.z = Math.sin(ph * 2) * 0.06 * a;
  } };
}
function buildDog() {
  const { root, rig } = base(), c = M('#d9893b'), white = M('#f7f0e3'), black = M('#151515');
  part(rig, G.sph, c, [0, 1.05, 0], [0.85, 0.42, 0.4]);
  part(rig, G.sph, white, [0.55, 0.98, 0], [0.35, 0.32, 0.3]);
  part(rig, G.sph, c, [0.9, 1.4, 0], [0.32, 0.3, 0.3]);
  part(rig, G.sph, white, [1.18, 1.32, 0], [0.17, 0.13, 0.15]);
  part(rig, G.sph, black, [1.34, 1.36, 0], [0.05, 0.05, 0.05]);
  for (const s of [1, -1]) part(rig, G.cone, c, [0.85, 1.72, 0.16 * s], [0.1, 0.22, 0.08]);
  eyes(rig, 1.13, 1.5, 0.15, 0.045);
  part(rig, new THREE.TorusGeometry(0.2, 0.06, 6, 16, PI * 1.5), c, [-0.85, 1.45, 0]);
  const legs = legs4(rig, { fx: 0.55, bx: -0.55, z: 0.22, hipF: 0.8, r: 0.1, mat: c, hoof: white });
  return { root, height: 1.9, animate: gallop(rig, legs, 0.75, 0.2) };
}
function buildPig() {
  const { root, rig } = base(), c = M('#f4a6b5'), dark = M('#b5647a');
  part(rig, G.sph, c, [0, 0.95, 0], [0.95, 0.6, 0.6]);
  part(rig, G.sph, c, [0.95, 1.05, 0], [0.4, 0.38, 0.38]);
  part(rig, G.cyl, c, [1.35, 0.98, 0], [0.17, 0.12, 0.17], [0, 0, PI / 2]);
  for (const s of [1, -1]) {
    part(rig, G.sph, dark, [1.42, 0.98, 0.06 * s], [0.02, 0.04, 0.03]);
    part(rig, G.cone, c, [0.9, 1.45, 0.2 * s], [0.12, 0.2, 0.07], [0, 0, -0.4]);
  }
  eyes(rig, 1.25, 1.18, 0.18, 0.045);
  part(rig, new THREE.TorusGeometry(0.12, 0.03, 6, 16, PI * 1.7), c, [-0.98, 1.08, 0]);
  const legs = legs4(rig, { fx: 0.5, bx: -0.5, z: 0.3, hipF: 0.5, r: 0.12, mat: c, hoof: dark });
  return { root, height: 1.7, animate: gallop(rig, legs, 0.9, 0.14) };
}
function buildArmadillo() {
  const { root, rig } = base(), shell = M('#9b8466'), band = M('#7d6a50'), skin = M('#c9a98a');
  part(rig, G.sph, shell, [0, 0.78, 0], [0.9, 0.5, 0.5]);
  for (let i = 0; i < 7; i++) {
    const x = -0.66 + i * 0.22, rr = 0.53 * Math.sqrt(1 - (x / 0.95) ** 2);
    part(rig, G.sph, band, [x, 0.78, 0], [0.09, rr, rr]);
  }
  part(rig, G.sph, shell, [0.82, 0.82, 0], [0.2, 0.2, 0.2]);
  part(rig, G.cone, skin, [1.12, 0.72, 0], [0.15, 0.5, 0.15], [0, 0, -PI / 2]);
  for (const s of [1, -1]) part(rig, G.cone, skin, [0.82, 1.06, 0.1 * s], [0.05, 0.16, 0.05], [0.3 * s, 0, 0]);
  eyes(rig, 0.98, 0.86, 0.12, 0.035);
  part(rig, G.cone, band, [-1.25, 0.55, 0], [0.1, 0.7, 0.1], [0, 0, PI / 2 + 0.3]);
  const legs = legs4(rig, { fx: 0.45, bx: -0.45, z: 0.3, hipF: 0.45, r: 0.1, mat: skin });
  return { root, height: 1.4, animate: gallop(rig, legs, 1.0, 0.1) };
}
function buildPenguin() {
  const { root, rig } = base(), black = M('#1b1f2a'), white = M('#fafafa'), orange = M('#f39c12');
  part(rig, G.sph, black, [0, 1.15, 0], [0.5, 0.85, 0.48]);
  part(rig, G.sph, white, [0.18, 1.05, 0], [0.38, 0.7, 0.36]);
  part(rig, G.sph, black, [0.05, 2.0, 0], [0.34, 0.33, 0.33]);
  for (const s of [1, -1]) part(rig, G.sph, white, [0.25, 2.02, 0.13 * s], [0.12, 0.12, 0.1]);
  eyes(rig, 0.36, 2.06, 0.13, 0.04);
  part(rig, G.cone, orange, [0.44, 1.95, 0], [0.06, 0.2, 0.06], [0, 0, -PI / 2]);
  const flips = [1, -1].map(s => { const p = group(rig, [0, 1.6, 0.45 * s]); part(p, G.sph, black, [0, -0.4, 0], [0.15, 0.45, 0.05]); return { p, s }; });
  const feet = [1, -1].map((s, i) => { const p = group(rig, [0.05, 0.35, 0.18 * s]); part(p, G.box, orange, [0.1, -0.3, 0], [0.35, 0.08, 0.18]); return { p, off: i * PI }; });
  return { root, height: 2.5, animate: (ph, a) => {
    for (const { p, off } of feet) p.rotation.z = Math.sin(ph + off) * 0.6 * a;
    rig.rotation.x = Math.sin(ph) * 0.18 * (0.3 + a);
    for (const { p, s } of flips) p.rotation.x = -s * (0.2 + 0.6 * Math.abs(Math.sin(ph)) * a);
  } };
}
function buildCapybara() {
  const { root, rig } = base(), c = M('#8a6240'), dark = M('#6b4a30'), black = M('#151515');
  part(rig, G.sph, c, [0, 0.95, 0], [0.9, 0.55, 0.55]);
  part(rig, G.sph, c, [0.95, 1.15, 0], [0.4, 0.32, 0.3]);
  part(rig, G.box, dark, [1.25, 1.05, 0], [0.3, 0.3, 0.34]);
  part(rig, G.box, black, [1.41, 1.12, 0], [0.03, 0.06, 0.14]);
  for (const s of [1, -1]) part(rig, G.sph, dark, [0.72, 1.42, 0.18 * s], [0.07, 0.08, 0.06]);
  eyes(rig, 1.05, 1.3, 0.24, 0.045);
  part(rig, G.sph, M('#f6a623'), [0.85, 1.55, 0], [0.15, 0.14, 0.15]);
  part(rig, G.sph, M('#4caf50'), [0.85, 1.71, 0.05], [0.08, 0.03, 0.05]);
  const legs = legs4(rig, { fx: 0.55, bx: -0.55, z: 0.3, hipF: 0.5, r: 0.12, mat: c });
  return { root, height: 1.9, animate: gallop(rig, legs, 0.8, 0.12) };
}
function buildGiraffe() {
  const { root, rig } = base(), spot = spotMat('#f0c35a', '#9b5a24'), c = M('#f0c35a'), dark = M('#6b3e1a');
  part(rig, G.sph, spot, [0, 2.1, 0], [0.85, 0.5, 0.45]);
  part(rig, G.cyl, spot, [0.9, 3.0, 0], [0.16, 1.5, 0.16], [0, 0, -0.343]);
  part(rig, G.box, dark, [0.82, 3.05, 0], [0.06, 1.4, 0.06], [0, 0, -0.343]);
  part(rig, G.sph, c, [1.3, 3.8, 0], [0.32, 0.18, 0.17]);
  for (const s of [1, -1]) {
    part(rig, G.cyl, dark, [1.18, 4.02, 0.08 * s], [0.03, 0.2, 0.03]);
    part(rig, G.sph, dark, [1.18, 4.12, 0.08 * s], [0.05, 0.05, 0.05]);
    part(rig, G.cone, c, [1.12, 3.9, 0.17 * s], [0.05, 0.15, 0.05], [1.2 * s, 0, 0]);
  }
  eyes(rig, 1.38, 3.88, 0.15, 0.04);
  part(rig, G.cyl, dark, [-0.95, 1.8, 0], [0.03, 0.8, 0.03], [0, 0, -0.3]);
  const legs = legs4(rig, { fx: 0.55, bx: -0.55, z: 0.25, hipF: 1.75, r: 0.09, mat: c, hoof: dark });
  return { root, height: 4.3, animate: gallop(rig, legs, 0.5, 0.15) };
}

function buildCat() {
  const { root, rig } = base(), c = M('#9aa0a8'), white = M('#f7f7f7'), pink = M('#f2a7b5');
  part(rig, G.sph, stripeMat('#9aa0a8', '#5b6068', 6), [0, 1.0, 0], [0.38, 0.85, 0.38], [0, 0, PI / 2]);
  part(rig, G.sph, c, [0.88, 1.32, 0], [0.32, 0.3, 0.32]);
  part(rig, G.sph, white, [1.12, 1.22, 0], [0.13, 0.1, 0.17]);
  part(rig, G.sph, pink, [1.22, 1.27, 0], [0.035, 0.03, 0.045]);
  for (const s of [1, -1]) {
    part(rig, G.cone, c, [0.82, 1.62, 0.17 * s], [0.1, 0.24, 0.07], [0.2 * s, 0, 0]);
    part(rig, G.cone, pink, [0.84, 1.6, 0.17 * s], [0.05, 0.15, 0.04], [0.2 * s, 0, 0]);
    for (const dy of [0.03, -0.03]) part(rig, G.box, white, [1.15, 1.22 + dy, 0.24 * s], [0.02, 0.01, 0.3], [0, 0.25 * s, 0]);
  }
  eyes(rig, 1.1, 1.4, 0.15, 0.05, '#6bbf3a');
  part(rig, G.cyl, stripeMat('#9aa0a8', '#5b6068', 4), [-1.0, 1.6, 0], [0.06, 1.1, 0.06], [0, 0, 0.45]);
  const legs = legs4(rig, { fx: 0.5, bx: -0.5, z: 0.2, hipF: 0.8, r: 0.08, mat: c, hoof: white });
  return { root, height: 2.2, animate: gallop(rig, legs, 0.8, 0.2) };
}

function buildSprinter() {
  const { root, rig } = base(), skin = M('#5a3825'), jersey = M('#ffd100'), shorts = M('#009b3a'), shoe = M('#1a1a1a');
  part(rig, G.box, jersey, [0.05, 1.58, 0], [0.3, 0.7, 0.42], [0, 0, -0.15]);
  part(rig, G.box, shorts, [0, 1.17, 0], [0.32, 0.26, 0.44]);
  part(rig, G.cyl, skin, [0.12, 1.98, 0], [0.07, 0.16, 0.07]);
  part(rig, G.sph, skin, [0.16, 2.17, 0], [0.16, 0.19, 0.16]);
  part(rig, G.sph, shoe, [0.12, 2.25, 0], [0.15, 0.13, 0.155]);
  eyes(rig, 0.3, 2.2, 0.07, 0.025);
  const limbs = [1, -1].map((s, i) => {
    const leg = group(rig, [0, 1.12, 0.13 * s]);
    part(leg, G.cyl, shorts, [0, -0.15, 0], [0.11, 0.3, 0.11]);
    part(leg, G.cyl, skin, [0, -0.6, 0], [0.075, 0.95, 0.075]);
    part(leg, G.box, shoe, [0.08, -1.06, 0], [0.28, 0.1, 0.13]);
    const arm = group(rig, [0.1, 1.85, 0.27 * s]);
    part(arm, G.cyl, jersey, [0, -0.08, 0], [0.08, 0.16, 0.08]);
    part(arm, G.cyl, skin, [0, -0.42, 0], [0.055, 0.6, 0.055]);
    return { leg, arm, off: i * PI };
  });
  return { root, height: 2.5, animate: (ph, a) => {
    for (const { leg, arm, off } of limbs) {
      leg.rotation.z = Math.sin(ph + off) * 0.9 * a;
      arm.rotation.z = -Math.sin(ph + off) * 0.9 * a;
    }
    rig.position.y = Math.abs(Math.sin(ph)) * 0.1 * a;
  } };
}

export const ANIMALS = [
  { name: '쥐', coat: '#8d8d95', build: buildRat },
  { name: '소', coat: '#8a5a2e', build: buildOx },
  { name: '호랑이', coat: '#e8862a', build: buildTiger },
  { name: '토끼', coat: '#f5f5f5', build: buildRabbit },
  { name: '용', coat: '#2f9e5b', build: buildDragon },
  { name: '뱀', coat: '#5a9e3a', build: buildSnake },
  { name: '말', coat: '#8b5a2b', build: buildHorse },
  { name: '양', coat: '#f4f1ea', build: buildSheep },
  { name: '원숭이', coat: '#7b4a2a', build: buildMonkey },
  { name: '닭', coat: '#d62828', build: buildRooster },
  { name: '개', coat: '#d9893b', build: buildDog },
  { name: '돼지', coat: '#f4a6b5', build: buildPig },
  { name: '아르마딜로', coat: '#9b8466', build: buildArmadillo },
  { name: '펭귄', coat: '#1b1f2a', build: buildPenguin },
  { name: '카피바라', coat: '#8a6240', build: buildCapybara },
  { name: '기린', coat: '#f0c35a', build: buildGiraffe },
  { name: '고양이', coat: '#9aa0a8', build: buildCat },
  { name: '우사인 볼트', coat: '#ffd100', build: buildSprinter },
];

// 그림자를 켠 새 모델을 만든다. 다 쓰면 disposeTree(model.root)로 정리한다.
export function makeAnimal(i) {
  const m = ANIMALS[i].build();
  m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return m;
}
