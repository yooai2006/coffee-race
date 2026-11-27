// 러시안 룰렛 계획: 시작하는 순간 몇 번째에 커피콩이 나갈지, 누가 누구를 겨눌지 모두 정한다.
// three.js·DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.
//
// 규칙
// - 총은 CHAMBERS(8)칸, 커피콩은 1발. 몇 번째 방아쇠에 나갈지는 시작할 때 정한다.
// - 처음 쏠 사람은 랜덤. 쏠 사람은 자기 말고 다른 사람 하나를 랜덤으로 겨눈다.
// - 나가면 맞은 사람이 커피를 산다. 안 나가면 남은 칸이 1 줄고, 맞을 뻔한 사람이 다음에 쏜다.

export const CHAMBERS = 8;

// turns[k] = { shooter, target, left(이번 방아쇠 전 남은 칸 수), fired }
export function planRoulette(n, chambers = CHAMBERS, rand = Math.random) {
  const fireAt = Math.floor(rand() * chambers);   // 0부터 센 방아쇠 순번
  const pickOther = me => { const k = Math.floor(rand() * (n - 1)); return k >= me ? k + 1 : k; };
  const turns = [];
  let shooter = Math.floor(rand() * n);
  for (let k = 0; k <= fireAt; k++) {
    const target = pickOther(shooter);
    turns.push({ shooter, target, left: chambers - k, fired: k === fireAt });
    shooter = target;
  }
  return { chambers, turns, loser: turns[turns.length - 1].target };
}
