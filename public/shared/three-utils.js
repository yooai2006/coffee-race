// three.js 공용 도우미: 캔버스 텍스처, 장면 정리
import * as THREE from 'three';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// 장면에서 떼어 내고 도형·재질·텍스처를 해제한다. userData.shared 도형(동물 공용 도형)은 남긴다.
export function disposeTree(root) {
  root.parent?.remove(root);
  root.traverse(o => {
    if (!o.geometry?.userData.shared) o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose(); m?.dispose(); });
  });
}
