import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planJenga, canRemove, startTurn, LAYERS } from '../public/games/jenga/plan.js';

test('빼는 블록이 규칙에 맞고, 올리는 자리가 차례대로 채워진다', () => {
  for (let n = 2; n <= 8; n++) {
    for (let k = 0; k < 300; k++) {
      const p = planJenga(n);
      const tower = Array.from({ length: LAYERS }, () => [true, true, true]);
      p.moves.forEach((m, i) => {
        assert.equal(m.player, (p.first + i) % n);
        assert.ok(canRemove(tower[m.layer], m.slot), `n=${n} 턴 ${i}`);
        // 맨 위 두 층(덜 찬 층 포함)에서는 빼지 않는다
        const top = tower.length - 1, full = tower[top].every(Boolean);
        assert.ok(m.layer <= (full ? top - 1 : top - 2));
        tower[m.layer][m.slot] = false;
        if (m.collapse) return;
        if (full) tower.push([false, false, false]);
        assert.equal(m.toLayer, tower.length - 1);
        assert.equal(m.toSlot, tower[m.toLayer].filter(Boolean).length);
        tower[m.toLayer][m.toSlot] = true;
      });
      assert.ok(p.moves.at(-1).collapse);
      assert.equal(p.moves.length, p.K);
      assert.ok(p.K >= startTurn(n) && p.K < startTurn(n) + n);
      assert.ok(p.K > n && p.K >= 4);   // 무너지기 전에 모두 최소 한 번은 안전하게 뺀다
    }
  }
});

test('층 규칙: 가운데가 남거나 양쪽이 남아야 버틴다', () => {
  assert.ok(canRemove([true, true, true], 0));
  assert.ok(canRemove([true, true, true], 1));
  assert.ok(canRemove([false, true, true], 2));    // 가운데만 남음
  assert.ok(!canRemove([true, false, true], 0));   // 한쪽만 남으면 쓰러진다
  assert.ok(!canRemove([false, true, true], 1));
  assert.ok(!canRemove([false, true, false], 1));
});

test('무너뜨리는 사람은 고르게 나온다 (5명, 5000번)', () => {
  const count = [0, 0, 0, 0, 0];
  for (let k = 0; k < 5000; k++) count[planJenga(5).loser]++;
  for (const c of count) assert.ok(c > 850 && c < 1150, count.join(','));
});
