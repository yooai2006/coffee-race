// 2D 그림: 동물 18종 스티커 얼굴과 게임 카드 그림 (public/assets/ 의 WebP 파일)
// three.js를 쓰지 않아 어디서든 가볍게 불러올 수 있다.

// ANIMALS(animals.js)와 같은 순서의 파일 이름
const CHARACTER_FILES = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep', 'monkey',
  'rooster', 'dog', 'pig', 'armadillo', 'penguin', 'capybara', 'giraffe', 'cat', 'usain-bolt'];
// 게임 id → 카드 그림 파일 이름
const CARD_FILES = { race: 'horse-race', roulette: 'roulette', plinko: 'plinko', bomb: 'bomb', skijump: 'skijump', jenga: 'jenga', kongkong: 'kongkong' };

const asset = p => new URL(`../assets/${p}`, import.meta.url).href;
export const characterUrl = i => asset(`characters/${CHARACTER_FILES[i]}.webp`);

// 동물 스티커 <img> (흰 테두리가 그림에 들어 있다)
export const animalImg = (i, cls = 'ani') =>
  `<img class="${cls}" src="${characterUrl(i)}" alt="" width="256" height="256" draggable="false" decoding="async">`;
// 정보판·결과표·탭용 작은 동그라미 아이콘. color: 참가자 색 (테두리)
export const animalChip = (i, color) => `<span class="achip" style="--c:${color}">${animalImg(i)}</span>`;

// 게임 카드 그림 <img> (세로 4:5). 모르는 게임이면 빈 문자열
export const gameCardImg = id => CARD_FILES[id]
  ? `<img class="gart" src="${asset(`game-cards/${CARD_FILES[id]}.webp`)}" alt="" width="720" height="900" draggable="false" decoding="async">`
  : '';
export const ICON_COUNT = CHARACTER_FILES.length;
