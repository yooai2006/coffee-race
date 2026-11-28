// 젠가 계획: 시작하는 순간 순서, 무너지는 턴, 턴마다 뺄 블록을 모두 정한다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 규칙
// - 자리 순서대로 돌아가며 블록 하나를 빼서 맨 위에 올린다. K번째 턴에 탑이 무너지고, 그 턴의 사람이 커피를 산다.
// - K는 연속된 n개 [s, s+n) 에서 고르게 뽑는다 (s = max(n+1, 4)). 그래서 모두 최소 한 번은 안전하게 빼고, 꼴찌 확률은 모두 같다.
// - 탑: 층마다 블록 3칸 [0,1,2]. 맨 위의 덜 찬 층과 그 바로 아래의 다 찬 층에서는 빼지 않는다.
//   한 층에서 블록을 뺀 뒤에는 '가운데가 남아 있거나, 양쪽이 둘 다 남아 있어야' 버틴다.

export const LAYERS = 18;

// 층 상태 [왼, 가운데, 오른] 에서 slot을 빼도 버티는지
export function canRemove(layer, slot) {
  if (!layer[slot]) return false;
  const next = [...layer]; next[slot] = false;
  return next[1] || (next[0] && next[2]);
}

// 무너지는 턴의 범위 시작: n+1 이상(모두 한 번은 안전하게 뺀 뒤)이고 4 이상
export function startTurn(n) { return Math.max(n + 1, 4); }

// moves[k] = { player, layer, slot, toLayer, toSlot } — k번째 턴에 player가 (layer, slot)을 빼서 (toLayer, toSlot)에 올린다.
// 마지막 턴(collapse)은 빼는 도중 무너지므로 toLayer/toSlot이 없다.
export function planJenga(n, rand = Math.random) {
  const ri = k => Math.floor(rand() * k);
  const first = ri(n), s = startTurn(n), K = s + ri(n);   // K번째(1부터) 턴에 무너진다
  const tower = Array.from({ length: LAYERS }, () => [true, true, true]);
  let top = LAYERS - 1, topCount = 3;   // 맨 위 층과 그 층의 블록 수
  const moves = [];
  for (let k = 0; k < K; k++) {
    const player = (first + k) % n;
    // 뺄 수 있는 층: 맨 위가 다 찼으면 그 아래부터, 덜 찼으면 그 층과 바로 아래 층을 빼고
    const maxLayer = topCount === 3 ? top - 1 : top - 2;
    const options = [];
    for (let l = 0; l <= maxLayer; l++) for (let sl = 0; sl < 3; sl++) if (canRemove(tower[l], sl)) options.push([l, sl]);
    const [layer, slot] = options[ri(options.length)];
    tower[layer][slot] = false;
    if (k === K - 1) { moves.push({ player, layer, slot, collapse: true }); break; }
    if (topCount === 3) { tower.push([false, false, false]); top++; topCount = 0; }
    const toSlot = topCount; tower[top][toSlot] = true; topCount++;
    moves.push({ player, layer, slot, toLayer: top, toSlot });
  }
  return { first, K, moves, loser: moves[moves.length - 1].player };
}
