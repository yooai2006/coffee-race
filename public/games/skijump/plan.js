// 스키점프 계획: 시작하는 순간 뛰는 순서와 모든 거리를 정한다. 언덕 모양과 비행 궤적도 여기서 계산한다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 규칙
// - 한 마리씩 뛴다. 가장 짧게 날아간 동물이 꼴찌(커피)이고, 꼴찌는 착지할 때 눈밭에 굴러 눈덩이가 된다.
// - 꼴찌는 마지막 3명 안에서 뛴다 (끝까지 누가 꼴찌일지 모르게).
// - 거리는 0.5m 단위이고 서로 다르다.
//
// 좌표 (미터): x = 점프대 끝에서 언덕 아래쪽으로 간 거리, y = 높이. 점프대 끝은 (0, LIP_Y).

export const LIP_Y = 4.5;
export const HILL_LEN = 150, HILL_DROP = 70, OUTRUN_X = 200;
export const FLIGHT_G = 10, FLIGHT_VY0 = 2;   // 비행: 위로 2m/s로 떠올라 중력 10으로 떨어진다 (공기 덕분에 실제보다 약하게)
export const MIN_D = 76, MAX_D = 134;

// 착지 언덕 높이: 처음엔 완만하다가 가운데가 가장 가파르고(약 35°) 다시 완만해져 평지(정리 구간)로 이어진다
export function hillY(x) {
  if (x <= 0) return LIP_Y - 0.5;
  const u = Math.min(1, x / HILL_LEN);
  return 4 - HILL_DROP * (3 * u * u - 2 * u * u * u);
}

// 거리 d에 착지하는 비행: 걸리는 시간 T와 가로 속도 vx. pos(t)로 위치를 얻는다
export function flight(d) {
  const drop = LIP_Y - hillY(d);
  const T = (FLIGHT_VY0 + Math.sqrt(FLIGHT_VY0 ** 2 + 2 * FLIGHT_G * drop)) / FLIGHT_G;
  const vx = d / T;
  return { T, vx, pos: t => [vx * t, LIP_Y + FLIGHT_VY0 * t - FLIGHT_G * t * t / 2] };
}

const half = x => Math.round(x * 2) / 2;

// order[k] = k번째로 뛰는 참가자, dist[i] = 참가자 i의 거리
export function planSkiJump(n, rand = Math.random) {
  const dist = Array(n).fill(0), used = new Set();
  const pick = (lo, hi) => { for (;;) { const d = half(lo + rand() * (hi - lo)); if (!used.has(d)) { used.add(d); return d; } } };
  const loser = Math.floor(rand() * n);
  for (let i = 0; i < n; i++) if (i !== loser) dist[i] = pick(92, MAX_D);
  const best = Math.min(...dist.filter((_, i) => i !== loser));
  dist[loser] = pick(Math.max(MIN_D, best - 9), best - 1.5);   // 가끔은 아슬아슬하게 짧다

  // 순서: 꼴찌는 마지막 3자리 중 하나
  const others = [...Array(n).keys()].filter(i => i !== loser).sort(() => rand() - 0.5);
  const slot = n - 1 - Math.floor(rand() * Math.min(3, n));
  const order = [...others.slice(0, slot), loser, ...others.slice(slot)];
  return { order, dist, loser };
}
