// 앱 본체: 렌더러 하나를 모든 게임이 같이 쓰고, 설정 화면에서 고른 게임을 실행한다.
//
// 게임 모듈 형식 (games/registry.js 에 등록):
//   export default { id, title, emoji, rule, startLabel, seconds(n), create() }
//   seconds(n): 참가자 n명일 때 평균 걸리는 시간(초). 설정 화면의 게임 버튼에 보여 준다
//   create()가 돌려주는 객체:
//     scene, camera           렌더링할 장면과 카메라
//     start(players)          게임 시작. players[i] = { name, animal }, 색은 PLAYER_COLORS[i]
//                             끝나면 ui.showResult(...)로 결과를 띄운다
//     stop()                  설정 화면으로 돌아갈 때. 진행 중인 것을 모두 멈추고 정리한다
//     update(dt, time)        매 프레임. 설정 화면 동안에는 배경 연출(카메라 회전 등)
//     resize()                화면 크기가 바뀌었을 때
import * as THREE from 'three';
import { $ } from './shared/util.js';
import { ui } from './shared/ui.js';
import { audioCtx, bindMuteButton } from './shared/audio.js';
import { players, initSetup, showStep, renderPreview } from './shared/setup.js';
import { GAMES } from './games/registry.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const made = new Map();   // 게임 id → 만든 게임 (처음 고를 때 한 번만 만든다)
let game = null, playing = false;

function useGame(def) {
  if (!made.has(def.id)) made.set(def.id, def.create());
  game = made.get(def.id);
  game.resize();
  ui.gameTitle = def.title;
  document.title = `☕ 커피 내기 · ${def.title}`;
}

function startGame() {
  $('#setup').classList.add('hidden');
  document.body.classList.remove('in-setup');
  audioCtx();   // 시작 버튼 클릭 안에서 소리 허용
  playing = true;
  game.start(players.map(p => ({ ...p })));
}

// 한 판 더: 같은 멤버·같은 게임으로 바로 다시 (결과는 시작하는 순간 새로 정해진다)
function playAgain() {
  game.stop(); ui.reset();
  startGame();
}

// 게임 바꾸기: 멤버는 그대로 두고 1단계(게임 고르기)로
function toSetup() {
  game.stop(); playing = false;
  ui.reset();
  $('#setup').classList.remove('hidden');
  document.body.classList.add('in-setup');
  showStep(1);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  game.update(dt, time);
  if (!playing) renderPreview(dt);
  else renderer.render(game.scene, game.camera);   // 설정 화면은 불투명해서 뒤의 게임 장면은 그리지 않는다
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  for (const g of made.values()) g.resize();
});
$('#againBtn').onclick = playAgain;
$('#changeBtn').onclick = toSetup;
// 버튼을 누르면 폰에서 짧게 진동한다 (지원하는 기기만)
addEventListener('pointerdown', e => {
  const b = e.target.closest('.tap, .tile');
  if (b && !b.disabled && navigator.vibrate) navigator.vibrate(8);
}, { passive: true });
initSetup({ gameList: GAMES, onStart: startGame, onGame: useGame });
bindMuteButton($('#muteBtn'));
