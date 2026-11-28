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
// vy0: 처음 위로 뜨는 속도. 클수록 높이 솟구쳤다가 내려온다 (거리는 같다)
export function flight(d, vy0 = FLIGHT_VY0) {
  const drop = LIP_Y - hillY(d);
  const T = (vy0 + Math.sqrt(vy0 ** 2 + 2 * FLIGHT_G * drop)) / FLIGHT_G;
  const vx = d / T;
  return { T, vx, pos: t => [vx * t, LIP_Y + vy0 * t - FLIGHT_G * t * t / 2] };
}

// 공중 기술. high: 높이 뜬 점프(vy0 >= HIGH_VY0)에서만 나온다
export const TRICKS = {
  v: { name: '✌️ V자 비행' },
  backflip: { name: '🔄 백플립!' },
  frontflip: { name: '🔃 프론트플립!' },
  doubleflip: { name: '🔄🔄 더블 백플립!', high: true },
  spin: { name: '⛸️ 트리플 스핀!' },
  cork: { name: '🌀 콕스크류!' },
  cheer: { name: '🙌 만세 점프!' },
};
export const VY0_MIN = 1.5, VY0_MAX = 9, HIGH_VY0 = 6;

const half = x => Math.round(x * 2) / 2;

// 처음 위로 뜨는 속도: 멀리 가는 점프일수록 높이 뜬다 (짧은 점프가 멀리 간 것처럼 보이지 않게).
// 같은 거리라도 조금씩 다르도록 ±HEIGHT_JITTER(비율)만큼 흔든다.
export const HEIGHT_JITTER = 0.12;
export function jumpHeight(d, rand = Math.random) {
  const t = (d - MIN_D) / (MAX_D - MIN_D);
  const k = Math.min(1, Math.max(0, 0.1 + 0.8 * t + (rand() - 0.5) * 2 * HEIGHT_JITTER));
  return VY0_MIN + k * (VY0_MAX - VY0_MIN);
}

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

  // 점프마다 높이와 기술: 바로 앞 사람과 같은 기술은 피한다
  const vy0 = Array(n).fill(0), trick = Array(n).fill('v');
  let prev = '';
  for (const i of order) {
    vy0[i] = jumpHeight(dist[i], rand);
    const ok = Object.keys(TRICKS).filter(k => k !== prev && (!TRICKS[k].high || vy0[i] >= HIGH_VY0));
    trick[i] = prev = ok[Math.floor(rand() * ok.length)];
  }
  return { order, dist, loser, vy0, trick };
}
