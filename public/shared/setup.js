// 설정 화면 (모든 게임 공용). 2단계로 나뉜다.
//   1단계: 게임 카드를 좌우로 넘겨 고른다 → [다음]
//   2단계: 참가자 탭(＋로 추가) + 동물 그리드 + 작은 3D 미리보기 → [랜덤 배정] [시작]
// 동물을 고르면 아직 안 고른 다음 사람 탭으로 자동으로 넘어간다.
import * as THREE from 'three';
import { $, esc, shuffle } from './util.js';
import { disposeTree } from './three-utils.js';
import { ANIMALS, makeAnimal } from './animals.js';
import { animalSvg, animalChip } from './animal-icons.js';
import { gameArt } from './game-art.js';
import { playCall } from './animal-sounds.js';
import { ui } from './ui.js';
import { MAX_PLAYERS, PLAYER_COLORS, splitNames, addPlayers, loadRosterFromUrl, saveRosterToUrl } from './roster.js';

const ANIMAL_NAMES = ANIMALS.map(a => a.name);
export const players = [];   // { name, animal: ANIMALS 인덱스 | null }
let games = [], gameId = null, onGameChange = () => {};
let step = 1, cur = 0, adding = false;
export const currentGame = () => games.find(g => g.id === gameId);
const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── 동물 미리보기 (2단계 위쪽 동그라미, 별도 렌더러로 회전) ──
const pvRenderer = new THREE.WebGLRenderer({ canvas: $('#pv'), antialias: true, alpha: true });
pvRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const pvScene = new THREE.Scene();
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 1.3));
{ const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(3, 6, 4); pvScene.add(l); }
const pvCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
let pvModel = null, pvIndex = -1, pvPhase = 0;

// hi: 보여 줄 동물 (-1이면 비운다)
function setPreviewModel(hi) {
  if (hi === pvIndex) return;
  const rot = pvModel ? pvModel.root.rotation.y : 0.6;
  if (pvModel) { disposeTree(pvModel.root); pvModel = null; }
  pvIndex = hi;
  if (hi < 0) return;
  pvModel = makeAnimal(hi); pvModel.root.rotation.y = rot;
  pvScene.add(pvModel.root);
  const s = Math.max(pvModel.height, 2.6) / 2.6;   // 기린처럼 큰 동물은 카메라를 뒤로
  const k = 1.35 * s;   // 작은 동그라미에 몸 전체가 들어오도록 조금 멀리
  pvCamera.position.set(3.4 * k, 1.0 + 1.5 * k, 5.2 * k); pvCamera.lookAt(0, pvModel.height * 0.45, 0);
}

// 설정 화면이 보이는 동안 매 프레임 부른다 (2단계가 아니면 캔버스 크기가 0이라 바로 끝난다)
export function renderPreview(dt) {
  const c = $('#pv'), w = c.clientWidth, hgt = c.clientHeight;
  if (!w) return;
  if (pvRenderer.domElement.width !== Math.round(w * pvRenderer.getPixelRatio())) {
    pvRenderer.setSize(w, hgt, false); pvCamera.aspect = w / hgt; pvCamera.updateProjectionMatrix();
  }
  if (pvModel) {
    pvModel.root.rotation.y += dt * 0.7;
    pvPhase += dt * 7;
    pvModel.animate(pvPhase, 0.7);
  }
  pvRenderer.render(pvScene, pvCamera);
}

// 미리보기 글자: 지금 탭의 참가자와 그 동물. hover: 마우스를 올린 동물 (PC)
function renderPreviewText(hover = -1) {
  const p = players[cur];
  const hi = hover >= 0 ? hover : p?.animal ?? -1;
  setPreviewModel(hi);
  if (hi >= 0) {
    const owner = players.find(q => q.animal === hi);
    const color = owner ? PLAYER_COLORS[players.indexOf(owner)] : '#cfc6e0';
    $('#pvName').innerHTML = `<i style="background:${color}"></i>${ANIMALS[hi].name}`;
    $('#pvOwner').textContent = owner ? `${owner.name}의 동물` : p ? `${p.name}에게 줄까요?` : '';
  } else if (p) {
    $('#pvName').innerHTML = `<i style="background:${PLAYER_COLORS[cur]}"></i>${esc(p.name)}`;
    $('#pvOwner').textContent = '아래에서 동물을 골라 주세요';
  } else {
    $('#pvName').textContent = '참가자를 넣어 주세요';
    $('#pvOwner').textContent = `2명 이상, 최대 ${MAX_PLAYERS}명`;
  }
}

// 게임 시간 표시: 참가자 수(최소 2명)로 계산하고, 5초 단위로 반올림한다
const nForTime = () => Math.max(2, players.length);
function fmtTime(sec) {
  const s = Math.max(5, Math.round(sec / 5) * 5);
  return s < 60 ? `약 ${s}초` : `약 ${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ''}`;
}

// ───────────── 1단계: 게임 카드 ─────────────
const cardsBox = () => $('#gameCards');
let settleTimer = 0;

function buildCards() {
  const box = cardsBox(); box.innerHTML = '';
  $('#dots').innerHTML = '';
  games.forEach((g, i) => {
    const c = el('button', 'gcard tap', `<div class="gtitle">${g.title}</div><div class="gartBox">${gameArt(g.id)}</div><div class="gtime">⏱ <span></span></div><p class="grule">${g.rule}</p>`);
    c.setAttribute('role', 'option');
    c.setAttribute('aria-label', g.title);
    // 가운데 카드를 누르면 다음 단계, 옆 카드를 누르면 그 카드로 넘긴다
    c.onclick = () => { if (gameIndex() === i) showStep(2); else scrollToCard(i); };
    box.appendChild(c);
    const d = el('button', '');
    d.setAttribute('aria-label', `${g.title}로 넘기기`);
    d.onclick = () => scrollToCard(i);
    $('#dots').appendChild(d);
  });
  // 손가락으로 넘기면: 가운데 카드를 바로 표시하고, 멈추면 게임을 바꾼다
  box.addEventListener('scroll', () => {
    markCard(nearestCard());
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => selectGame(nearestCard()), 140);
  }, { passive: true });
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToCard(Math.min(games.length - 1, gameIndex() + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToCard(Math.max(0, gameIndex() - 1)); }
  });
  $('#prevGame').onclick = () => scrollToCard(Math.max(0, gameIndex() - 1));
  $('#nextGame').onclick = () => scrollToCard(Math.min(games.length - 1, gameIndex() + 1));
}

const gameIndex = () => games.findIndex(g => g.id === gameId);
function nearestCard() {
  const box = cardsBox(), mid = box.scrollLeft + box.clientWidth / 2;
  let best = 0, bd = Infinity;
  [...box.children].forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
  return best;
}
function markCard(i) {
  [...cardsBox().children].forEach((c, k) => { c.classList.toggle('sel', k === i); c.setAttribute('aria-selected', k === i); c.tabIndex = k === i ? 0 : -1; });
  [...$('#dots').children].forEach((d, k) => d.setAttribute('aria-current', k === i));
  $('#prevGame').disabled = i === 0;
  $('#nextGame').disabled = i === games.length - 1;
}
function scrollToCard(i, instant = false) {
  const box = cardsBox(), c = box.children[i];
  if (!c) return;
  box.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - box.clientWidth / 2, behavior: instant || reduceMotion() ? 'instant' : 'smooth' });
  markCard(i);
  selectGame(i);
}
function selectGame(i) {
  const g = games[i];
  if (g && g.id !== gameId) { gameId = g.id; onGameChange(g); renderSetup(); }
}

function renderStep1() {
  const n = nForTime();
  [...cardsBox().children].forEach((c, i) => {
    const g = games[i], byPeople = g.seconds(2) !== g.seconds(8);
    c.querySelector('.gtime span').textContent = fmtTime(g.seconds(n)) + (byPeople && players.length >= 2 ? ` (${n}명)` : '');
  });
  markCard(gameIndex());
}

// ───────────── 2단계: 참가자 + 동물 ─────────────
function buildGrid() {
  const grid = $('#animalGrid'); grid.innerHTML = '';
  ANIMALS.forEach((a, hi) => {
    const t = el('button', 'tile', `${animalSvg(hi)}<span class="tname">${a.name}</span><span class="owner hidden"></span>`);
    t.setAttribute('aria-label', a.name);
    t.onclick = () => pickAnimal(hi);
    t.onpointerenter = e => { if (e.pointerType === 'mouse') renderPreviewText(hi); };
    t.onpointerleave = e => { if (e.pointerType === 'mouse') renderPreviewText(); };
    grid.appendChild(t);
  });
}

function pickAnimal(hi) {
  const p = players[cur];
  if (!p) { ui.toast('먼저 참가자 이름을 넣어 주세요'); openAdd(); return; }
  const owner = players.find(q => q !== p && q.animal === hi);
  if (owner) { ui.toast(`이미 ${owner.name}의 동물이에요`); return; }
  if (p.animal === hi) { p.animal = null; renderSetup(); return; }
  p.animal = hi;
  playCall(ANIMALS[hi].name, { vol: 0.8 });
  renderSetup();
  // 아직 안 고른 다음 사람으로 자동 이동 (잠깐 고른 모습을 보여 준 뒤)
  const from = cur;
  setTimeout(() => {
    if (cur !== from || players[cur] !== p) return;
    const next = [...players.keys()].map(k => (from + 1 + k) % players.length).find(k => players[k].animal === null);
    if (next !== undefined) { cur = next; renderSetup(); }
  }, 420);
}

function renderTabs() {
  const box = $('#tabs'); box.innerHTML = '';
  players.forEach((p, i) => {
    const color = PLAYER_COLORS[i];
    const t = el('button', 'tab tap' + (i === cur ? ' cur' : ''),
      `${p.animal === null ? `<span class="q" style="--c:${color}">?</span>` : animalChip(p.animal, color)}<span>${esc(p.name)}</span>${i === cur ? '<span class="x" aria-label="삭제">×</span>' : ''}`);
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', i === cur);
    t.onclick = e => {
      if (e.target.closest('.x')) { removePlayer(i); return; }
      cur = i; renderSetup();
    };
    box.appendChild(t);
  });
  if (players.length < MAX_PLAYERS && !(adding || players.length === 0)) {
    const a = el('button', 'tab add tap', '<b>＋</b>추가');
    a.setAttribute('aria-label', '참가자 추가');
    a.onclick = openAdd;
    box.appendChild(a);
  }
  box.children[cur]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function removePlayer(i) {
  const name = players[i].name;
  players.splice(i, 1);
  cur = Math.max(0, Math.min(cur, players.length - 1));
  ui.toast(`${name}을(를) 뺐어요`);
  renderSetup();
}

function openAdd() {
  adding = true; renderSetup();
  $('#nameInput').focus();
}
function closeAdd() { adding = false; renderSetup(); }

function addFromInput() {
  const names = splitNames($('#nameInput').value);
  if (!names.length) { $('#nameInput').focus(); return; }
  const before = players.length;
  const added = addPlayers(players, names, MAX_PLAYERS);
  $('#nameInput').value = '';
  if (added < names.length) ui.toast(`이미 있는 이름이나 ${MAX_PLAYERS}명을 넘는 이름은 뺐어요`);
  // 지금 탭이 이미 동물을 골랐으면, 새로 들어온 첫 사람으로
  if (added && (players[cur]?.animal ?? null) !== null) cur = before;
  if (players.length >= MAX_PLAYERS) adding = false;
  renderSetup();
  if (adding) $('#nameInput').focus();
}

function renderStep2() {
  const g = currentGame();
  $('#gameTag').innerHTML = `${g.emoji} ${g.title} · ${fmtTime(g.seconds(nForTime()))} <em>바꾸기</em>`;
  const showForm = (adding || players.length === 0) && players.length < MAX_PLAYERS;
  $('#addForm').classList.toggle('hidden', !showForm);
  $('#addDone').classList.toggle('hidden', players.length === 0);
  renderTabs();
  [...$('#animalGrid').children].forEach((t, hi) => {
    const owner = players.find(q => q.animal === hi), mine = owner && owner === players[cur];
    t.classList.toggle('sel', !!mine);
    t.classList.toggle('taken', !!owner && !mine);
    t.setAttribute('aria-pressed', !!mine);
    const ob = t.querySelector('.owner');
    ob.classList.toggle('hidden', !owner || mine);
    ob.textContent = owner ? owner.name : '';
  });
  renderPreviewText();
  const allPicked = players.length > 0 && players.every(p => p.animal !== null), ready = players.length >= 2 && allPicked;
  $('#randBtn').textContent = allPicked ? '다시 섞기' : '랜덤 배정';
  $('#randBtn').disabled = players.length === 0;
  $('#startBtn').disabled = !ready;
  $('#startBtn').textContent = g.startLabel;
  const left = players.filter(p => p.animal === null).length;
  $('#hint').textContent = players.length < 2 ? `참가자를 2명 이상 넣어 주세요 (최대 ${MAX_PLAYERS}명)`
    : ready ? '준비 완료! 시작을 눌러요 🎉' : `${left}명이 아직 동물을 안 골랐어요`;
}

// ───────────── 공통 ─────────────
export function showStep(n) {
  step = n;
  $('#step1').classList.toggle('hidden', n !== 1);
  $('#step2').classList.toggle('hidden', n !== 2);
  if (n === 1) { adding = false; renderSetup(); requestAnimationFrame(() => scrollToCard(gameIndex(), true)); }
  else { if (players.length === 0) adding = true; renderSetup(); }
}

export function renderSetup() {
  if (cur >= players.length) cur = Math.max(0, players.length - 1);
  renderStep1();
  renderStep2();
  saveRosterToUrl(players, ANIMAL_NAMES, { g: gameId === games[0].id ? null : gameId });
}

// 설정 화면 버튼을 연결하고 주소창의 게임·참가자를 불러온다.
// gameList: 게임 목록 (첫 번째가 기본값), onStart: 시작 버튼, onGame: 게임을 바꿨을 때 (처음에도 한 번 부른다)
export function initSetup({ gameList, onStart, onGame }) {
  games = gameList; onGameChange = onGame;
  const g = new URLSearchParams(location.search).get('g');
  gameId = games.some(x => x.id === g) ? g : games[0].id;
  onGameChange(currentGame());
  players.push(...loadRosterFromUrl(ANIMAL_NAMES, MAX_PLAYERS));
  const firstFree = players.findIndex(p => p.animal === null);
  cur = firstFree >= 0 ? firstFree : 0;

  buildCards();
  buildGrid();
  $('#nextBtn').onclick = () => showStep(2);
  $('#backBtn').onclick = () => showStep(1);
  $('#gameTag').onclick = () => showStep(1);
  $('#shareBtn').onclick = async () => {
    renderSetup();   // 주소를 최신으로
    try { await navigator.clipboard.writeText(location.href); ui.toast('🔗 링크를 복사했어요. 친구에게 보내 보세요'); }
    catch { prompt('이 링크를 복사하세요', location.href); }
  };
  $('#addForm').onsubmit = e => { e.preventDefault(); addFromInput(); };
  // 한글 입력 중 Enter는 글자를 확정하는 키라서 추가하지 않는다
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); });
  $('#addDone').onclick = closeAdd;
  // 아직 안 고른 사람이 있으면 그 사람만 채우고(직접 고른 건 유지), 모두 정해졌으면 전원을 새로 섞는다
  $('#randBtn').onclick = () => {
    const allSet = players.length > 0 && players.every(p => p.animal !== null);
    if (allSet) players.forEach(p => { p.animal = null; });
    const free = shuffle(ANIMALS.map((_, i) => i).filter(i => !players.some(p => p.animal === i)));
    players.forEach(p => { if (p.animal === null) p.animal = free.pop(); });
    adding = false;
    renderSetup();
  };
  $('#startBtn').onclick = onStart;
  // 공유 링크로 멤버가 이미 정해져 있으면 바로 2단계
  showStep(players.length ? 2 : 1);
}

export const currentStep = () => step;
