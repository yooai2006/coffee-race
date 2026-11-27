// 참가자 이름표 (3D 장면 위에 뜨는 이름 + 색 점)
// 이름표는 거리와 상관없이 화면에서 LABEL_PX 높이로 보인다 (sizeAttenuation: false).
// 가로 길이는 이름 길이에 맞춰 캔버스 비율(aspect)로 정한다.
// 주의: 크기가 바뀌는(scale) 부모에 붙이면 이름표도 같이 커진다. 크기가 1인 그룹에 붙인다.
import * as THREE from 'three';
import { canvasTex } from './three-utils.js';

const LABEL_PX = 24;

export function makeLabel(text, color) {
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

// 카메라 시야(fov)나 화면 크기가 바뀌면 다시 부른다
export function sizeLabels(labels, camera) {
  const sy = LABEL_PX / innerHeight * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const l of labels) l.scale.set(sy * l.userData.aspect, sy, 1);
}
