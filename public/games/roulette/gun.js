// 장난감 리볼버 (8칸). +x 방향을 겨눈다. 손잡이 쪽이 원점 근처.
// 돌려주는 값: { root, drum(약실, x축으로 돈다), hammer(공이), muzzle(총구 위치를 가리키는 빈 그룹), spentHoles }
import * as THREE from 'three';
import { CHAMBERS } from './plan.js';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o });

export function buildGun() {
  const root = new THREE.Group();
  const teal = M('#1fb5a8'), yellow = M('#ffcf3a'), purple = M('#7b4bd6'), orange = M('#ff7a1a'), dark = M('#2b2440', { roughness: 0.8 });
  const add = (parent, geo, mat, p, r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = true; parent.add(m); return m; };
  const alongX = [0, 0, -Math.PI / 2];   // 원기둥(세로축 y)을 x축 방향으로 눕힌다

  add(root, new THREE.CylinderGeometry(0.11, 0.12, 1.15, 16), teal, [0.75, 0.06, 0], alongX);           // 총열
  add(root, new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16), orange, [1.36, 0.06, 0], alongX);         // 주황 총구 (장난감 표시)
  add(root, new THREE.BoxGeometry(0.06, 0.12, 0.05), yellow, [1.15, 0.2, 0]);                            // 가늠쇠
  add(root, new THREE.BoxGeometry(0.62, 0.34, 0.2), yellow, [0.02, 0.04, 0]);                            // 몸통
  add(root, new THREE.BoxGeometry(0.26, 0.66, 0.22), purple, [-0.3, -0.32, 0], [0, 0, 0.32]);            // 손잡이
  add(root, new THREE.TorusGeometry(0.11, 0.025, 8, 20), dark, [0.06, -0.2, 0]);                          // 방아쇠울
  add(root, new THREE.BoxGeometry(0.04, 0.12, 0.04), dark, [0.05, -0.18, 0], [0, 0, 0.3]);               // 방아쇠

  // 약실: 8칸 원통. 칸마다 구멍이 보인다. 방아쇠를 당길 때마다 1/8 바퀴 돈다.
  const drum = new THREE.Group(); drum.position.set(0.08, 0.04, 0); root.add(drum);
  add(drum, new THREE.CylinderGeometry(0.27, 0.27, 0.36, 24), teal, [0, 0, 0], alongX);
  const holeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 10), holeMat = M('#141018', { roughness: 1 });
  const spentHoles = [];
  for (let i = 0; i < CHAMBERS; i++) {
    const a = (i / CHAMBERS) * Math.PI * 2;
    spentHoles.push(add(drum, holeGeo, holeMat, [0.005, Math.cos(a) * 0.17, Math.sin(a) * 0.17], alongX));
  }

  // 공이: 뒤로 젖혔다가 앞으로 내려친다
  const hammer = new THREE.Group(); hammer.position.set(-0.26, 0.18, 0); root.add(hammer);
  add(hammer, new THREE.BoxGeometry(0.08, 0.2, 0.08), dark, [0, 0.08, 0]);

  const muzzle = new THREE.Group(); muzzle.position.set(1.46, 0.06, 0); root.add(muzzle);
  root.scale.setScalar(1.25);
  return { root, drum, hammer, muzzle, spentHoles };
}
