import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSkiJump, flight, hillY, MIN_D, MAX_D } from '../public/games/skijump/plan.js';

test('꼴찌가 가장 짧고, 마지막 3명 안에서 뛰고, 거리는 0.5m 단위로 서로 다르다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 300; k++) {
      const { order, dist, loser } = planSkiJump(n);
      assert.deepEqual([...order].sort((a, b) => a - b), [...Array(n).keys()]);
      assert.equal(Math.min(...dist), dist[loser]);
      assert.equal(new Set(dist).size, n);
      for (const d of dist) { assert.equal(d * 2, Math.round(d * 2)); assert.ok(d >= MIN_D && d <= MAX_D, String(d)); }
      assert.ok(order.indexOf(loser) >= n - 3);
    }
  }
});

test('비행 궤적은 언덕 위로 날아가 정해진 거리에 정확히 착지한다', () => {
  for (let d = MIN_D; d <= MAX_D; d += 0.5) {
    const f = flight(d);
    for (let t = 0.02; t < f.T - 0.05; t += 0.02) {
      const [x, y] = f.pos(t);
      assert.ok(y > hillY(x), `d=${d} t=${t.toFixed(2)}`);
    }
    const [x, y] = f.pos(f.T);
    assert.ok(Math.abs(x - d) < 1e-9 && Math.abs(y - hillY(d)) < 1e-9);
  }
});
