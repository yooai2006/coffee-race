// 2D 그림 파일이 모두 있는지 (동물 18종, 게임 카드 6장)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { characterUrl, gameCardImg, ICON_COUNT } from '../public/shared/animal-icons.js';

test('동물 스티커 18종 파일이 있다', () => {
  assert.equal(ICON_COUNT, 18);
  for (let i = 0; i < ICON_COUNT; i++) assert.ok(existsSync(fileURLToPath(characterUrl(i))), characterUrl(i));
});

test('게임 카드 그림 파일이 있다', () => {
  for (const id of ['race', 'roulette', 'plinko', 'bomb', 'skijump', 'jenga']) {
    const src = gameCardImg(id).match(/src="([^"]+)"/)[1];
    assert.ok(existsSync(fileURLToPath(src)), src);
  }
  assert.equal(gameCardImg('없는게임'), '');
});
