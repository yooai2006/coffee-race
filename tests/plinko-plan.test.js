import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPlinko, pingpong, markerAt, slotM, SLOTS, ROWS, M_MAX } from '../public/games/plinko/plan.js';

test('정확히 한 마리만 ☕ 칸에 들어간다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 300; k++) {
      const p = planPlinko(n);
      const hits = p.T.map((t, i) => Math.abs(markerAt(p, t) - p.slots[i]) < 0.5);
      assert.equal(hits.filter(Boolean).length, 1, `n=${n}`);
      assert.ok(hits[p.loser]);
      assert.ok(Math.abs(markerAt(p, p.freezeT) - p.loserSlot) < 1e-9);   // 당첨 순간 ☕는 칸 한가운데
    }
  }
});

test('경로: 출발 위치가 겹치지 않고, 벽 안에서 움직여 정해진 칸에 닿는다', () => {
  for (let k = 0; k < 300; k++) {
    const p = planPlinko(8);
    assert.equal(new Set(p.starts).size, 8);
    assert.equal(new Set(p.slots).size, 8);   // 서로 다른 칸
    p.moves.forEach((mv, i) => {
      assert.equal(mv.length, ROWS);
      let m = p.starts[i];
      for (let r = 0; r < ROWS; r++) {
        assert.ok(Math.abs(m) <= M_MAX);
        assert.equal(((m - r - 1) % 2 + 2) % 2, 0);   // 못 줄 r의 못 위치
        m += mv[r];
      }
      assert.equal(m, slotM(p.slots[i]));
      assert.ok(p.slots[i] >= 0 && p.slots[i] < SLOTS);
    });
  }
});

test('☕ 표시는 0과 7 사이를 오간다', () => {
  assert.equal(pingpong(0), 0);
  assert.equal(pingpong(7), 7);
  assert.equal(pingpong(10), 4);
  assert.equal(pingpong(-3), 3);
  assert.equal(pingpong(14), 0);
});
