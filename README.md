# ☕ 커피 내기 게임

커피 살 사람을 정하는 브라우저 게임 모음입니다. 기본 게임은 **동물 레이스**입니다.

**플레이:** https://coffee-race.dream-montage-web.workers.dev

## 게임

두 단계로 시작합니다. 기본값은 동물 레이스입니다.

1. **게임 고르기**: 게임 카드를 좌우로 넘겨 고르고 [다음]을 누릅니다.
2. **동물 고르기**: 위쪽 ＋ 탭으로 참가자를 넣고, 아래 그리드에서 동물을 고릅니다. 고르면 다음 사람 탭으로 자동으로 넘어갑니다. [랜덤 배정]으로 한 번에 정할 수도 있습니다.

결과 화면의 [한 판 더]는 같은 멤버·같은 게임으로 바로 다시 하고, [게임 바꾸기]는 멤버를 그대로 두고 1단계로 갑니다.

| 게임 | 규칙 |
|---|---|
| 🏇 동물 레이스 (기본) | 3D 트랙에서 1바퀴 경주. 꼴찌로 들어온 동물의 주인이 커피를 삽니다. |
| 🔫 러시안 룰렛 | 동물들이 원형 탁자에 둘러앉습니다. 8칸 장난감 총에 커피콩 1발. 랜덤으로 서로 겨누고 쏘다가, 커피콩을 맞은 사람이 커피를 삽니다. 빈 칸이면 남은 칸이 1 줄고, 맞을 뻔한 사람이 다음에 쏩니다. |
| 🎯 핀볼 낙하 | 8마리가 동시에 떨어져 못과 서로에게 부딪혀 튕기며 바닥 칸 8개에 한 마리씩 들어갑니다. 바닥을 좌우로 오가는 ☕ 표시가 있는 칸에 들어간 동물의 주인이 커피를 삽니다. 정확히 한 마리만 당첨됩니다. |
| 💣 폭탄 돌리기 | 동물들이 둥글게 앉아 10초짜리 장난감 커피 폭탄을 아무에게나 던져 넘깁니다. 끝으로 갈수록 빨리 넘기고 음악이 고조됩니다. 펑! 하는 순간 폭탄을 들고 있던 사람이 커피를 삽니다. |
| 🎿 스키점프 | TV 중계처럼 한 마리씩 점프대를 타고 날아갑니다 (선수 소개 → 활강 → 슬로모션 도약 → 비행 → 거리). 가장 짧게 날아간 동물은 착지하다 굴러 눈덩이가 되고, 그 주인이 커피를 삽니다. 꼴찌는 마지막 3명 안에서 뜁니다. |
| 🪵 젠가 | 둥근 탁자에 둘러앉아 자리 순서대로 블록을 하나씩 빼서 맨 위에 올립니다. 탑을 무너뜨린 동물의 주인이 커피를 삽니다. 모두 최소 한 번은 안전하게 빼고, 무너뜨릴 확률은 모두 같습니다. |
| ⏱ 콩콩팥팥 | 폰을 돌려 가며 스톱워치를 두 번씩 멈춥니다. 멈춘 시간의 1/100초 끝자리 두 개를 곱해서, 곱이 가장 낮은 사람이 커피를 삽니다. 끝자리가 0이면 그 자리에서 바로 당첨이고 게임이 끝납니다. 순서는 시작할 때 섞고, 최하위가 동점이면 동점자끼리 재대결합니다. |

- 운 게임의 결과는 모두 **시작하는 순간** 정해지고, 화면은 그 결과를 연출합니다. 콩콩팥팥만 사람이 누르는 순간 결과가 정해집니다.
- 주소에 참가자와 게임이 저장됩니다: `?p=민수:고양이,영희:호랑이&g=roulette` (`g`가 없으면 동물 레이스). 링크를 공유하면 같은 멤버, 같은 게임으로 2단계(동물 고르기)에서 바로 시작합니다. 2단계 오른쪽 위 🔗 버튼이 링크를 복사합니다.
- 예전 주소 `/games/horse-race/`는 첫 화면으로 넘어갑니다.

## 폴더 구조

```
public/                       ← 이 폴더를 그대로 배포 (빌드 단계 없음)
  index.html, app.css         한 페이지 앱: 설정 1·2단계, 정보판, 결과 화면 (캐주얼 게임 스타일, 폰 세로 화면 기준)
  app.js                      렌더러와 매 프레임 루프, 게임 바꾸기 (게임 모듈 형식 설명이 맨 위에 있음)
  shared/                     모든 게임이 같이 쓰는 코드
    setup.js                  설정 화면 (1단계 게임 카드, 2단계 참가자 탭·동물 그리드·3D 미리보기)
    ui.js                     배너, 카운트다운, 섬광, 정보판, 결과 화면, 짧은 알림(toast)
    animal-icons.js           2D 그림 경로: 동물 스티커(ANIMALS와 같은 순서), 게임 카드 그림(게임 id별)
    labels.js                 3D 이름표
    animals.js                동물 18종 3D 모델 (ANIMALS, makeAnimal)
    audio.js                  Web Audio 소리 엔진, 음소거 버튼
    animal-sounds.js          동물 울음소리, 꼴찌 울음 + 트롬본
    music.js                  배경 음악 도구 (음 예약, 박자 반복기, 음량 버스)
    fx.js                     커피콩·색종이 폭죽, 깜짝 놀란 '!!'
    roster.js                 참가자 목록 ↔ 주소창, 참가자 색, 최대 인원(8)
    base.css                  색·글꼴(Jua)·버튼·제목 스티커 등 공용 스타일
    util.js, three-utils.js
  assets/                     2D 그림 (WebP)
    characters/               동물 18종 스티커 얼굴 256×256, 투명 배경
    game-cards/               게임 카드 그림 720×900
    kongkong/                 콩콩팥팥 배경, 스톱워치, 콩·팥 그림
  games/
    registry.js               게임 목록 (첫 번째가 기본값)
    horse-race/               🏇 동물 레이스: game.js, track.js, race-plan.js, sound.js(음악·관중·발소리)
    roulette/                 🔫 러시안 룰렛: game.js, gun.js, plan.js, bgm.js(긴장 음악)
    plinko/                   🎯 핀볼 낙하: game.js, plan.js, sound.js
    bomb/                     💣 폭탄 돌리기: game.js, plan.js, sound.js(고조되는 음악)
    skijump/                  🎿 스키점프: game.js, plan.js(언덕 모양·비행 궤적), sound.js
    jenga/                    🪵 젠가: game.js, plan.js(뺄 수 있는 블록 규칙), sound.js
    kongkong/                 ⏱ 콩콩팥팥: game.js(2D 화면), plan.js(끝자리·곱·동점 규칙), style.css
tests/                        Node 테스트 (three.js·DOM이 없는 순수 로직)
```

- 3D는 three.js(unpkg CDN), 소리는 Web Audio로 직접 합성합니다. 음원·모델 파일은 없습니다.

## 새 게임 추가하기

1. `public/games/<게임-이름>/game.js`를 만듭니다. 형식은 `public/app.js` 맨 위 설명을 따릅니다.
   ```js
   export default { id, title, emoji, rule, startLabel, seconds(n), create() }   // seconds: n명일 때 평균 시간(초)
   // create()는 { scene, camera, start(players), stop(), update(dt, time), resize() }를 돌려준다
   ```
2. `public/games/registry.js`의 `GAMES`에 추가합니다. 설정 화면에 버튼이 생깁니다.
3. 공용 기능은 `../../shared/...`에서 가져옵니다 (`ANIMALS`, `makeAnimal`, `playCall`, `playLoserCry`, `ui`, `makeLabel`, `PLAYER_COLORS`, `animalChip` 등).
   - 결과: `ui.showResult({ loser: { name, animal, color }, rows: [{ rank 또는 mark, name, animal, color, note, loser }] })`
   - 정보판: `ui.hud(제목, html, { ranked })`. 순위 줄은 `<div class="r"><b>1</b>${animalChip(animal, color)}이름</div>` 형식
   - 게임 카드 그림은 `public/assets/game-cards/<이름>.webp`(720×900, 세로 4:5)로 넣고 `shared/animal-icons.js`의 `CARD_FILES`에 게임 id를 추가합니다 (없으면 게임 이모지).
4. 결과를 정하는 로직은 DOM 없는 파일(`plan.js`처럼)로 나누고 `tests/`에 테스트를 넣습니다.
5. 위 표에 게임을 추가합니다.

## 로컬에서 실행

ES 모듈을 쓰므로 파일을 더블클릭해서는 열리지 않습니다. 작은 서버로 엽니다.

```sh
npm run dev                      # 또는: python3 -m http.server -d public
```

three.js를 CDN에서 받으므로 인터넷 연결이 필요합니다.

## 테스트

```sh
npm test
```

경주 계획(등수, 결승 시각, 진행률이 뒤로 가지 않는지), 룰렛 계획(규칙대로 도는지), 핀볼 계획(정확히 한 마리만 ☕ 칸에 들어가는지), 폭탄 계획(터질 때 누군가 들고 있는지, 꼴찌가 고른지), 스키점프 계획(꼴찌가 가장 짧은지, 궤적이 언덕을 뚫지 않는지), 젠가 계획(블록 규칙, 무너뜨릴 확률이 고른지), 참가자 주소 저장/읽기를 검사합니다.

## 배포 (Cloudflare)

`main`에 올리면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트를 돌린 뒤 `public/` 폴더를 자동으로 배포합니다.
Actions 탭에서 **Deploy → Run workflow**로 직접 실행할 수도 있습니다.

저장소 **Settings → Secrets and variables → Actions**에 아래 두 값이 있어야 합니다.

| 이름 | 값 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → Workers → coffee-race → 설정 → 빌드 → 외부 CI/CD용 API 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID |

내 컴퓨터에서 직접 배포하려면 `./deploy.sh`를 실행합니다. 설정은 `wrangler.jsonc`에 있습니다.
