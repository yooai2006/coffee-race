// 콩콩팥팥 규칙 (DOM·three.js 없음 → Node 테스트에서 바로 검사)
//
// - 시작할 때 순서를 섞는다. 차례마다 스톱워치를 2번 굴린다 (탭 시작 → 탭 멈춤).
// - 멈춘 시간의 1/100초 끝자리를 쓴다. 예: 13.20초 → 0, 7.46초 → 6
// - 두 숫자를 곱해서 가장 낮은 사람이 커피를 산다.
// - 끝자리가 0이면 곱이 0이므로 그 자리에서 패배하고 게임이 바로 끝난다 (첫 번째 굴림이어도).
// - 가장 낮은 곱이 같은 사람이 2명 이상이면 그 사람들끼리 순서를 다시 섞어 재대결한다.
//
// 다른 게임과 달리 결과는 시작할 때 정해지지 않고, 사람이 누르는 순간 정해진다.

// 화면에 보이는 시간과 쓰는 숫자가 항상 같도록 둘 다 1/100초 단위로 버림한다
const hundredths = ms => Math.floor(Math.max(0, ms) / 10);
export const formatTime = ms => { const h = hundredths(ms); return `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}`; };
export const lastDigit = ms => hundredths(ms) % 10;

export function shuffled(a, rand = Math.random) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 경기 상태. ids: 참가자 번호 목록
export function createMatch(ids, rand = Math.random) {
  return { rand, rounds: [{ order: shuffled(ids, rand), rolls: {} }], turn: 0, loser: null, zero: false };
}
export const currentRound = m => m.rounds[m.rounds.length - 1];
// 지금 굴릴 사람과 몇 번째 굴림(0, 1)인지. 끝났으면 null
export function current(m) {
  if (m.loser !== null) return null;
  const r = currentRound(m), id = r.order[m.turn];
  return { id, roll: (r.rolls[id] || []).length, round: m.rounds.length };
}
export const product = digits => digits.length === 2 ? digits[0] * digits[1] : digits.includes(0) ? 0 : null;

// 굴린 결과(밀리초)를 넣는다. 돌려주는 값:
//   { type: 'roll', digit }            첫 번째 굴림 (다음은 같은 사람 두 번째)
//   { type: 'turn', digit, score }     두 번째 굴림까지 끝 (다음 사람)
//   { type: 'zero', digit, loser }     끝자리 0 → 그 자리에서 패배, 게임 끝
//   { type: 'tie', digit, score, ids } 한 바퀴 끝났는데 최하위 동점 → ids끼리 재대결
//   { type: 'done', digit, score, loser } 한 바퀴 끝, 최하위 확정
export function submit(m, ms) {
  const cur = current(m);
  if (!cur) throw new Error('경기가 이미 끝났다');
  const r = currentRound(m), digit = lastDigit(ms);
  (r.rolls[cur.id] ||= []).push(digit);
  if (digit === 0) { m.loser = cur.id; m.zero = true; return { type: 'zero', digit, loser: cur.id }; }
  if (r.rolls[cur.id].length < 2) return { type: 'roll', digit };
  const score = product(r.rolls[cur.id]);
  m.turn++;
  if (m.turn < r.order.length) return { type: 'turn', digit, score };
  const scores = r.order.map(id => product(r.rolls[id])), low = Math.min(...scores);
  const lowest = r.order.filter((_, i) => scores[i] === low);
  if (lowest.length === 1) { m.loser = lowest[0]; return { type: 'done', digit, score, loser: m.loser }; }
  m.rounds.push({ order: shuffled(lowest, m.rand), rolls: {} });
  m.turn = 0;
  return { type: 'tie', digit, score, ids: lowest };
}
