// 설정 화면: 참가자 입력, 동물 고르기, 3D 미리보기, 링크 복사, 랜덤 배정
import * as THREE from 'three';
import { $, esc, shuffle } from '../../shared/util.js';
import { disposeTree } from '../../shared/three-utils.js';
import { ANIMALS, makeAnimal } from '../../shared/animals.js';
import { playCall } from '../../shared/animal-sounds.js';
import { splitNames, addPlayers, loadRosterFromUrl, saveRosterToUrl } from '../../shared/roster.js';
import { MAX_PLAYERS } from './track.js';

const ANIMAL_NAMES = ANIMALS.map(a => a.name);
export const players = [];   // { name, animal: ANIMALS 인덱스 | null }

// ── 동물 미리보기 (설정 화면 오른쪽, 별도 렌더러로 회전) ──
const pvRenderer = new THREE.WebGLRenderer({ canvas: $('#pv'), antialias: true, alpha: true });
pvRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const pvScene = new THREE.Scene();
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 1.3));
{ const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(3, 6, 4); pvScene.add(l); }
{ const g = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshStandardMaterial({ color: 0x63a64b })); g.rotation.x = -Math.PI / 2; pvScene.add(g); }
const pvCamera = new THREE.PerspectiveCamera(32, 240 / 260, 0.1, 50);
pvCamera.position.set(3.6, 2.6, 5.4); pvCamera.lookAt(0, 1.4, 0);
let pvModel = null, pvIndex = -1, pvPhase = 0, pvPinned = 0;   // pvPinned: 마지막으로 클릭한 동물

function setPreview(hi) {
  const h = ANIMALS[hi], owner = players.find(p => p.animal === hi)?.name;
  if (hi !== pvIndex) {
    const rot = pvModel ? pvModel.root.rotation.y : 0.6;
    if (pvModel) disposeTree(pvModel.root);
    pvModel = makeAnimal(hi); pvModel.root.rotation.y = rot; pvIndex = hi;
    pvScene.add(pvModel.root);
    const s = Math.max(pvModel.height, 2.6) / 2.6;   // 기린처럼 큰 동물은 카메라를 뒤로
    pvCamera.position.set(3.4 * s, 1.0 + 1.5 * s, 5.2 * s); pvCamera.lookAt(0, pvModel.height * 0.45, 0);
  }
  $('#pvName').innerHTML = `<i style="background:${h.coat}"></i>${h.name}`;
  $('#pvOwner').textContent = owner ? `${owner}의 동물` : '동물을 골라보세요';
}

// 설정 화면이 보이는 동안 매 프레임 부른다
export function renderPreview(dt) {
  const w = $('#pv').clientWidth, hgt = $('#pv').clientHeight;
  if (!w || !pvModel) return;
  if (pvRenderer.domElement.width !== Math.round(w * pvRenderer.getPixelRatio())) {
    pvRenderer.setSize(w, hgt, false); pvCamera.aspect = w / hgt; pvCamera.updateProjectionMatrix();
  }
  pvModel.root.rotation.y += dt * 0.7;
  pvPhase += dt * 7;
  pvModel.animate(pvPhase, 0.7);
  pvRenderer.render(pvScene, pvCamera);
}

// ── 참가자 목록 ──
function addFromInput() {
  const names = splitNames($('#nameInput').value);
  const added = addPlayers(players, names, MAX_PLAYERS);
  $('#nameInput').value = '';
  renderSetup();
  if (added < names.length) $('#hint').textContent = `이미 있는 이름이나 ${MAX_PLAYERS}명을 넘는 이름은 빼고 넣었어요`;
}

export function renderSetup() {
  const list = $('#pickList'); list.innerHTML = '';
  players.forEach((p, pi) => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<div class="pname"><span>${esc(p.name)}</span><button class="x" title="삭제">×</button></div><div class="horses"></div>`;
    const hs = row.querySelector('.horses');
    ANIMALS.forEach((h, hi) => {
      const b = document.createElement('button');
      b.className = 'hbtn' + (p.animal === hi ? ' sel' : '');
      b.disabled = players.some((q, qi) => qi !== pi && q.animal === hi);
      b.innerHTML = `<i style="background:${h.coat}"></i>${h.name}`;
      b.onclick = () => {
        p.animal = p.animal === hi ? null : hi;
        if (p.animal === hi) playCall(h.name, { vol: 0.8 });
        pvPinned = hi;
        renderSetup();
      };
      b.onmouseenter = () => setPreview(hi);
      b.onmouseleave = () => setPreview(pvPinned);
      hs.appendChild(b);
    });
    row.querySelector('.x').onclick = () => { players.splice(pi, 1); renderSetup(); };
    list.appendChild(row);
  });
  const allPicked = players.length > 0 && players.every(p => p.animal !== null), ready = players.length >= 2 && allPicked;
  $('#randBtn').textContent = allPicked ? '🎲 다시 랜덤 배정' : '🎲 랜덤 배정';
  $('#startBtn').disabled = !ready;
  setPreview(pvPinned);
  $('#hint').textContent = players.length < 2 ? `참가자를 2명 이상 입력하세요 (최대 ${MAX_PLAYERS}명)` : ready ? '준비 완료!' : '각 참가자의 동물을 골라주세요';
  saveRosterToUrl(players, ANIMAL_NAMES);
}

// 설정 화면 버튼을 연결하고 주소창의 참가자를 불러온다. onStart: 경주 시작 버튼을 눌렀을 때
export function initSetup({ onStart }) {
  players.push(...loadRosterFromUrl(ANIMAL_NAMES, MAX_PLAYERS));
  const first = players.find(p => p.animal !== null);
  if (first) pvPinned = first.animal;

  $('#shareBtn').onclick = async () => {
    saveRosterToUrl(players, ANIMAL_NAMES);
    try { await navigator.clipboard.writeText(location.href); $('#hint').textContent = '🔗 링크를 복사했어요'; }
    catch { prompt('이 링크를 복사하세요', location.href); }
  };
  $('#addBtn').onclick = addFromInput;
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) addFromInput(); });
  // 아직 안 고른 사람이 있으면 그 사람만 채우고(직접 고른 건 유지), 모두 정해졌으면 전원을 새로 섞는다
  $('#randBtn').onclick = () => {
    const allSet = players.length > 0 && players.every(p => p.animal !== null);
    if (allSet) players.forEach(p => { p.animal = null; });
    const free = shuffle(ANIMALS.map((_, i) => i).filter(i => !players.some(p => p.animal === i)));
    players.forEach(p => { if (p.animal === null) pvPinned = p.animal = free.pop(); });
    renderSetup();
  };
  $('#startBtn').onclick = onStart;
  renderSetup();
}
