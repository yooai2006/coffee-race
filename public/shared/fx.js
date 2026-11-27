// 공용 3D 연출: 커피콩·색종이 폭죽, 머리 위 '!!' 느낌표
import * as THREE from 'three';
import { canvasTex } from './three-utils.js';

const beanGeo = new THREE.SphereGeometry(1, 10, 8), beanMat = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.35 });
const confGeo = new THREE.PlaneGeometry(0.16, 0.09);
const CONF_COLORS = [0xffd166, 0xef476f, 0x06d6a0, 0x118ab2, 0xffffff, 0xf78c6b];

// 폭죽: burst(위치, 방향, 세기)로 터뜨리고 매 프레임 update(dt), 정리할 때 clear().
// floorAt(x, z): 그 자리 바닥 높이 (탁자 위면 탁자 높이). 콩과 색종이가 거기서 튕기다 멈춘다
export function createBurst(scene, floorAt = () => 0) {
  let group = null, parts = [];
  function burst(origin, dir, { speed = 7, spread = 4.5, beans = 70, confetti = 90 } = {}) {
    if (!group) { group = new THREE.Group(); scene.add(group); }
    const add = (mesh, sp, spr, drag) => {
      mesh.position.copy(origin); mesh.castShadow = true; group.add(mesh);
      const v = dir.clone().multiplyScalar(sp * (0.6 + Math.random() * 0.6))
        .add(new THREE.Vector3((Math.random() - 0.5) * spr, Math.random() * spr * 0.8, (Math.random() - 0.5) * spr));
      parts.push({ mesh, v, spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), drag, rest: false });
    };
    for (let i = 0; i < beans; i++) { const m = new THREE.Mesh(beanGeo, beanMat); m.scale.set(0.11, 0.075, 0.065); add(m, speed, spread, 0.4); }
    for (let i = 0; i < confetti; i++) {
      const m = new THREE.Mesh(confGeo, new THREE.MeshStandardMaterial({ color: CONF_COLORS[i % CONF_COLORS.length], side: THREE.DoubleSide, roughness: 0.6 }));
      add(m, speed * 0.7, spread * 1.3, 2.2);
    }
  }
  function update(dt) {
    for (const p of parts) {
      if (p.rest) continue;
      p.v.y -= 9.8 * dt * (p.drag > 1 ? 0.35 : 1);
      p.v.multiplyScalar(Math.exp(-p.drag * dt));
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt;
      const pos = p.mesh.position, floorY = floorAt(pos.x, pos.z) + 0.03;
      if (pos.y < floorY && p.v.y < 0) {
        pos.y = floorY; p.v.y *= -0.35; p.v.x *= 0.6; p.v.z *= 0.6; p.spin.multiplyScalar(0.5);
        if (Math.abs(p.v.y) < 0.4) { p.rest = true; p.mesh.rotation.x = -Math.PI / 2 + (p.drag > 1 ? 0 : 0.3); }
      }
    }
  }
  function clear() {
    if (group) { group.children.forEach(m => { if (m.material !== beanMat) m.material.dispose(); }); scene.remove(group); group = null; }
    parts = [];
  }
  return { burst, update, clear };
}

// 깜짝 놀랐을 때 머리 위에 뜨는 '!!'. 크기 1인 그룹에 붙이고, 매 프레임 animateExclaim을 부른다
export function makeExclaim() {
  const tex = canvasTex(128, 128, (x, w, h) => {
    x.font = 'bold 110px -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 12; x.strokeStyle = '#3a2200'; x.strokeText('!!', w / 2, h / 2 + 4);
    x.fillStyle = '#ffd23f'; x.fillText('!!', w / 2, h / 2 + 4);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 11; sp.scale.setScalar(0.01); sp.userData.age = 0;
  return sp;
}
// baseY: 머리 위 높이
export function animateExclaim(sp, dt, time, baseY, size = 0.75) {
  const age = sp.userData.age += dt;
  sp.scale.setScalar(Math.min(1, age * 6) * (size + Math.sin(time * 9) * size * 0.08));
  sp.position.y = baseY + Math.abs(Math.sin(time * 5)) * 0.12;
}
