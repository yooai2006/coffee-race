import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, lastDigit, createMatch, current, submit, product } from '../public/games/kongkong/plan.js';

// 끝자리가 d가 되는 밀리초
const ms = d => 1000 + d * 10 + 3;

test('보이는 시간과 쓰는 끝자리가 같다 (1/100초, 버림)', () => {
  assert.equal(formatTime(13209), '13.20'); assert.equal(lastDigit(13209), 0);
  assert.equal(formatTime(7469), '7.46'); assert.equal(lastDigit(7469), 6);
  assert.equal(formatTime(0), '0.00'); assert.equal(formatTime(999), '0.99');
  for (let t = 0; t < 30000; t += 7) assert.equal(lastDigit(t), +formatTime(t).slice(-1));
});

test('두 번 굴려 곱이 가장 낮은 사람이 진다', () => {
  const m = createMatch([0, 1, 2]);
  const want = { 0: [3, 4], 1: [2, 5], 2: [9, 9] };   // 12, 10, 81 → 1번이 진다
  let ev;
  while (current(m)) { const c = current(m); ev = submit(m, ms(want[c.id][c.roll])); }
  assert.equal(ev.type, 'done'); assert.equal(m.loser, 1);
});

test('끝자리 0이 나오면 첫 굴림이어도 그 자리에서 지고 끝난다', () => {
  const m = createMatch([0, 1, 2, 3]);
  const first = current(m).id;
  submit(m, ms(7)); submit(m, ms(8));
  const second = current(m).id;
  const ev = submit(m, ms(0));
  assert.deepEqual(ev, { type: 'zero', digit: 0, loser: second });
  assert.equal(current(m), null); assert.notEqual(first, second);
  assert.throws(() => submit(m, ms(5)));
});

test('최하위 동점이면 동점자끼리만 재대결한다', () => {
  const m = createMatch([0, 1, 2]);
  const want = { 0: [2, 3], 1: [3, 2], 2: [5, 5] };   // 6, 6, 25 → 0, 1 재대결
  let ev;
  while (m.rounds.length === 1) { const c = current(m); ev = submit(m, ms(want[c.id][c.roll])); }
  assert.equal(ev.type, 'tie'); assert.deepEqual([...ev.ids].sort(), [0, 1]);
  assert.deepEqual([...m.rounds[1].order].sort(), [0, 1]);
  const again = { 0: [4, 4], 1: [1, 9] };   // 16, 9 → 1번이 진다
  while (current(m)) { const c = current(m); ev = submit(m, ms(again[c.id][c.roll])); }
  assert.equal(ev.type, 'done'); assert.equal(m.loser, 1);
});

test('순서는 섞이고 모두 한 번씩 들어간다', () => {
  const seen = new Set();
  for (let k = 0; k < 200; k++) {
    const o = createMatch([0, 1, 2, 3, 4]).rounds[0].order;
    assert.deepEqual([...o].sort(), [0, 1, 2, 3, 4]); seen.add(o.join());
  }
  assert.ok(seen.size > 20);
  assert.equal(product([3, 4]), 12); assert.equal(product([0]), 0); assert.equal(product([5]), null);
});
