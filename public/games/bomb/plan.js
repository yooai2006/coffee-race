// 폭탄 돌리기 계획: 시작하는 순간 누가 언제 누구에게 던질지 모두 정한다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 규칙
// - 폭탄은 DURATION(10)초 뒤에 터진다. 그때 폭탄을 들고 있던 사람이 커피를 산다.
// - 들고 있던 사람은 자기 말고 아무에게나 랜덤으로 던진다.
// - 처음엔 오래 들고 있다가(약 1초) 끝으로 갈수록 빨리 넘긴다(약 0.2초).
// - 터지는 순간 폭탄은 반드시 누군가의 손에 있다 (날아가는 중에 터지지 않는다).

export const DURATION = 10;
const LAST_HOLD = 0.2;   // 터지기 전에 마지막으로 받은 사람이 최소한 들고 있는 시간

// 진행률 p(0..1)에서 한 번 들고 있는 시간과 날아가는 시간
export const holdTime = p => 0.95 - 0.75 * p ** 1.3;
export const flightTime = p => 0.45 - 0.2 * p;

// passes[k] = { from, to, at(던지는 시각), land(받는 시각) }
export function planBomb(n, rand = Math.random) {
  const ri = k => Math.floor(rand() * k);
  const start = ri(n), passes = [];
  let holder = start, t = 0;
  for (;;) {
    const p = t / DURATION;
    const at = t + holdTime(p) * (0.75 + rand() * 0.5), land = at + flightTime(p);
    if (land > DURATION - LAST_HOLD) break;
    const k = ri(n - 1), to = k >= holder ? k + 1 : k;
    passes.push({ from: holder, to, at, land });
    holder = to; t = land;
  }
  return { start, passes, loser: holder };
}

// 시각 t에 폭탄이 어디 있는지: { holder } 또는 { from, to, k(0..1 날아간 정도) }
export function bombAt(plan, t) {
  let holder = plan.start;
  for (const ps of plan.passes) {
    if (t < ps.at) break;
    if (t < ps.land) return { from: ps.from, to: ps.to, k: (t - ps.at) / (ps.land - ps.at) };
    holder = ps.to;
  }
  return { holder };
}
