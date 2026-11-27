import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRoulette, firePercent, CHAMBERS } from '../public/games/roulette/plan.js';

test('규칙대로 진행된다: 자기 자신은 안 겨누고, 맞을 뻔한 사람이 다음에 쏜다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 200; k++) {
      const { turns, loser } = planRoulette(n);
      assert.ok(turns.length >= 1 && turns.length <= CHAMBERS);
      turns.forEach((t, i) => {
        assert.notEqual(t.shooter, t.target);
        assert.ok(t.target >= 0 && t.target < n && t.shooter >= 0 && t.shooter < n);
        assert.equal(t.left, CHAMBERS - i);
        assert.equal(t.fired, i === turns.length - 1);
        if (i > 0) assert.equal(t.shooter, turns[i - 1].target);
      });
      assert.equal(loser, turns.at(-1).target);
    }
  }
});

test('커피콩은 1번째부터 8번째 방아쇠까지 모두 나올 수 있다', () => {
  const seen = new Set();
  for (let k = 0; k < 2000; k++) seen.add(planRoulette(4).turns.length);
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('2명이면 둘이 번갈아 쏜다', () => {
  const { turns } = planRoulette(2);
  turns.forEach((t, i) => assert.equal(t.shooter, (turns[0].shooter + i) % 2));
});

test('발사 확률(%)', () => {
  assert.deepEqual([8, 7, 6, 5, 4, 3, 2, 1].map(firePercent), [12.5, 14.3, 16.7, 20, 25, 33.3, 50, 100]);
});
