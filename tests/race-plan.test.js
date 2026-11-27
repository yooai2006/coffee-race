import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRace, frac } from '../public/games/horse-race/race-plan.js';

test('등수는 모든 주자를 한 번씩 담고, 결승 시각은 등수 순서대로 늘어난다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 50; k++) {
      const { order, T } = planRace(n);
      assert.deepEqual([...order].sort((a, b) => a - b), [...Array(n).keys()]);
      for (let r = 1; r < n; r++) assert.ok(T[order[r]] > T[order[r - 1]], `n=${n} 등수 ${r}`);
    }
  }
});

test('진행률은 0에서 시작해 결승 시각에 정확히 1이 되고, 뒤로 가지 않는다', () => {
  for (let k = 0; k < 30; k++) {
    const { T, profs } = planRace(6);
    profs.forEach((p, i) => {
      assert.equal(frac(p, 0), 0);
      assert.ok(Math.abs(frac(p, T[i]) - 1) < 1e-9);
      let prev = 0;
      for (let t = 0.01; t <= T[i]; t += 0.01) { const f = frac(p, t); assert.ok(f >= prev); prev = f; }
    });
  }
});
