// 게임 목록. 설정 화면의 게임 고르기 버튼 순서이고, 첫 번째가 기본값이다.
// 새 게임은 games/<이름>/game.js 를 만들고 여기에 추가한다 (형식은 app.js 맨 위 설명 참고).
import race from './horse-race/game.js';
import roulette from './roulette/game.js';
import plinko from './plinko/game.js';
import bomb from './bomb/game.js';
import skijump from './skijump/game.js';

export const GAMES = [race, roulette, plinko, bomb, skijump];
