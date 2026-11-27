import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBomb, bombAt, DURATION, holdTime } from '../public/games/bomb/plan.js';

test('넘기기가 이어지고, 터질 때 폭탄은 누군가의 손에 있다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 300; k++) {
      const p = planBomb(n);
      let holder = p.start, t = 0;
      for (const ps of p.passes) {
        assert.equal(ps.from, holder);
        assert.notEqual(ps.to, ps.from);
        assert.ok(ps.to >= 0 && ps.to < n);
        assert.ok(ps.at > t && ps.land > ps.at);
        holder = ps.to; t = ps.land;
      }
      assert.ok(t < DURATION);
      assert.equal(p.loser, holder);
      assert.deepEqual(bombAt(p, DURATION), { holder: p.loser });
      assert.ok(p.passes.length >= 9, `넘기기 ${p.passes.length}번`);
    }
  }
});

test('끝으로 갈수록 빨리 넘긴다', () => {
  assert.ok(holdTime(0) > 0.9);
  assert.ok(holdTime(1) < 0.25);
  for (let p = 0.1; p <= 1; p += 0.1) assert.ok(holdTime(p) < holdTime(p - 0.1));
});

test('꼴찌는 고르게 나온다 (4명, 4000번)', () => {
  const count = [0, 0, 0, 0];
  for (let k = 0; k < 4000; k++) count[planBomb(4).loser]++;
  for (const c of count) assert.ok(c > 850 && c < 1150, count.join(','));
});
