// 경주 계획: 출발하는 순간 등수와 각자의 결승 시각을 정하고, 막판까지 접전이 되는 속도 곡선을 만든다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 진행률 f(u) = u + Σ a_k (sin(2πk·u + φ_k) − sin φ_k) / (2πk),  u = warp(t)/warp(T)
// f(0)=0, f(1)=1 이고 Σ|a_k| < 1 이라 항상 앞으로만 달린다. 결승 도착 시각은 정확히 T.
import { shuffle } from '../../shared/util.js';

const TAU = 0.5;                      // 출발 가속 시간 상수
const warp = t => t - TAU * (1 - Math.exp(-t / TAU));
const AMPS = [0.26, 0.2, 0.14];

function makeProfile(T) {
  return { T, W: warp(T), terms: AMPS.map((m, i) => ({ k: i + 1, a: (Math.random() * 2 - 1) * m, phi: Math.random() * Math.PI * 2 })) };
}

// 시각 t에 코스를 몇 %(0..1) 달렸는지
export function frac(p, t) {
  const u = warp(Math.max(0, t)) / p.W;
  let f = u;
  for (const { k, a, phi } of p.terms) f += a * (Math.sin(2 * Math.PI * k * u + phi) - Math.sin(phi)) / (2 * Math.PI * k);
  return f;
}

// n명 경주 계획. order[등수] = 주자 인덱스, T[주자] = 결승 시각(초), profs[주자] = 속도 곡선
export function planRace(n) {
  const order = shuffle([...Array(n).keys()]);
  const T = new Array(n);
  let t = 6 + Math.random() * 0.8;
  order.forEach((ri, rank) => { if (rank > 0) t += 0.08 + Math.random() * (rank === n - 1 ? 0.12 : 0.2); T[ri] = t; });

  // 막판까지 승부를 모르게: 85% 지점에서 꼴찌와 그 앞 주자가 붙어 있고, 중반엔 꼴찌가 꼴찌가 아니도록
  const loser = order[n - 1], prev = order[n - 2], Tmin = T[order[0]];
  let profs;
  for (let tries = 0; tries < 500; tries++) {
    profs = T.map(makeProfile);
    const f85 = profs.map(p => frac(p, 0.85 * Tmin));
    if (Math.abs(f85[loser] - f85[prev]) > 0.025) continue;
    if (n >= 3) { const f60 = profs.map(p => frac(p, 0.6 * Tmin)); if (f60[loser] === Math.min(...f60)) continue; }
    break;
  }
  return { order, T, profs };
}
