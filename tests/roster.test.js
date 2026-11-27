import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNames, addPlayers, parseRoster, serializeRoster } from '../public/shared/roster.js';

const NAMES = ['쥐', '소', '호랑이', '고양이'];

test('주소 형식으로 저장했다가 그대로 다시 읽는다', () => {
  const players = [{ name: '민수', animal: 3 }, { name: '영희', animal: 2 }, { name: '민기', animal: null }];
  const q = serializeRoster(players, NAMES);
  assert.equal(q, '민수:고양이,영희:호랑이,민기');
  assert.deepEqual(parseRoster(q, NAMES, 8), players);
});

test('잘못된 주소 값: 빈 이름, 중복 이름, 같은 동물, 없는 동물, 정원 초과', () => {
  assert.deepEqual(parseRoster(null, NAMES, 8), []);
  assert.deepEqual(parseRoster(' ,a:소,a:쥐,b:소,c:용,d', NAMES, 3), [
    { name: 'a', animal: 1 }, { name: 'b', animal: null }, { name: 'c', animal: null },
  ]);
});

test('입력창: 쉼표로 나누고 콜론을 지우며, 중복과 정원 초과는 넣지 않는다', () => {
  assert.deepEqual(splitNames(' 민수, 영:희 ,, 민기 '), ['민수', '영희', '민기']);
  const players = [{ name: '민수', animal: null }];
  assert.equal(addPlayers(players, ['민수', '영희', '민기'], 2), 1);
  assert.deepEqual(players.map(p => p.name), ['민수', '영희']);
});
