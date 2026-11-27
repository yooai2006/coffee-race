// 핀볼 낙하 계획: 시작하는 순간 모든 동물의 경로·착지 시각과 ☕ 표시의 움직임을 정한다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 규칙
// - 동물들이 위에서 동시에 떨어져 못(ROWS줄)에 부딪히며 바닥 칸(SLOTS개) 중 하나에 들어간다.
// - ☕ 표시가 바닥 칸 위를 좌우로 오간다. 동물이 칸에 들어가는 순간 그 칸에 ☕가 있으면 당첨(커피).
// - 정확히 한 마리만 당첨된다. 당첨되면 ☕는 그 칸에 멈춘다. 동물마다 서로 다른 칸에 들어간다.
//
// 좌표: 가로 위치는 m(반 칸 단위 정수). 못 하나를 지날 때마다 m이 ±1 바뀐다.
//   못 줄 r의 위치는 m ≡ r+1 (mod 2), |m| ≤ 7. 바닥 칸 s의 가운데는 m = 2s-7.

export const SLOTS = 8, ROWS = 10, M_MAX = 7;
export const MARKER_SPEED = 2.2;   // ☕ 표시가 1초에 지나가는 칸 수
export const FALL0 = 0.55;          // 출발해서 첫 못까지 걸리는 시간
const SAFE_GAP = 1.2;               // 안전한 동물은 착지할 때 ☕와 이만큼(칸) 떨어져 있다

// 0 → max → 0 → ... 를 오가는 값
export function pingpong(u, max = SLOTS - 1) {
  const p = ((u % (2 * max)) + 2 * max) % (2 * max);
  return p > max ? 2 * max - p : p;
}
// 출발 후 t초에 ☕ 표시의 위치(0..SLOTS-1, 소수). 당첨 뒤에는 그 칸에 멈춘다
export function markerAt(plan, t) {
  return t >= plan.freezeT ? plan.loserSlot : pingpong(MARKER_SPEED * t + plan.phase);
}
export const slotM = s => 2 * s - (SLOTS - 1);

// n마리 계획. 동물 i의 경로: starts[i](출발 m), moves[i](ROWS개의 ±1), hops[i](못→못, 마지막은 못→칸 시간), T[i](착지 시각)
// 동물마다 서로 다른 칸에 들어간다 (바닥에서 겹치지 않게). 조건에 맞는 배치가 안 나오면 처음부터 다시 정한다.
export function planPlinko(n, rand = Math.random) {
  for (let tries = 0; tries < 500; tries++) {
    const p = tryPlan(n, rand);
    if (p) return p;
  }
  throw new Error('계획을 만들지 못했습니다');
}

function tryPlan(n, rand) {
  const ri = k => Math.floor(rand() * k);
  const hops = Array.from({ length: n }, () => Array.from({ length: ROWS }, (_, r) => r === ROWS - 1 ? 0.45 : 0.3 + rand() * 0.22));
  const T = hops.map(h => FALL0 + h.reduce((a, b) => a + b, 0));
  const loser = ri(n), loserSlot = ri(SLOTS), freezeT = T[loser];
  const phase = loserSlot - MARKER_SPEED * freezeT;   // 당첨 순간 ☕가 정확히 그 칸 가운데에 오게

  // 칸 정하기: 착지할 때 ☕와 떨어진 칸 중에서, 아직 아무도 안 쓴 칸
  const slots = Array(n).fill(-1), used = new Set([loserSlot]);
  slots[loser] = loserSlot;
  const others = [...Array(n).keys()].filter(i => i !== loser).sort(() => rand() - 0.5);
  for (const i of others) {
    const t = T[i];
    const ok = [...Array(SLOTS).keys()].filter(s => !used.has(s) &&
      (t < freezeT ? Math.abs(pingpong(MARKER_SPEED * t + phase) - s) >= SAFE_GAP : s !== loserSlot));
    if (!ok.length) return null;
    slots[i] = ok[ri(ok.length)]; used.add(slots[i]);
  }

  // 출발 위치도 서로 다르게 (8칸 = 홀수 m 8개). 칸까지 갈 수 있는 배치가 나올 때까지 섞는다
  const STARTS = Array.from({ length: SLOTS }, (_, s) => slotM(s));
  for (let k = 0; k < 300; k++) {
    const perm = [...STARTS].sort(() => rand() - 0.5).slice(0, n);
    const moves = perm.map((m0, i) => pathFor(m0, slotM(slots[i]), rand));
    if (moves.every(Boolean)) return { n, loser, loserSlot, freezeT, phase, T, hops, slots, starts: perm, moves };
  }
  return null;
}

// m0에서 시작해 ROWS번 ±1 움직여 mEnd에 닿는 경로. 중간에 벽(|m| > M_MAX)을 넘으면 다시 섞는다
function pathFor(m0, mEnd, rand) {
  const d = mEnd - m0, ups = (ROWS + d) / 2;
  if (!Number.isInteger(ups) || ups < 0 || ups > ROWS) return null;
  for (let k = 0; k < 200; k++) {
    const mv = Array.from({ length: ROWS }, (_, i) => i < ups ? 1 : -1).sort(() => rand() - 0.5);
    let m = m0, ok = true;
    for (let r = 0; r < ROWS - 1; r++) { m += mv[r]; if (Math.abs(m) > M_MAX) { ok = false; break; } }
    if (ok) return mv;
  }
  return null;
}
