# ☕ 커피 내기 게임

꼴찌가 커피를 사는 브라우저 게임 모음입니다. 기본 게임은 **경마**입니다.

**플레이:** https://coffee-race.dream-montage-web.workers.dev

## 게임

| 게임 | 주소 | 설명 |
|---|---|---|
| 🏇 경마 (기본) | `/games/horse-race/` | 참가자마다 동물을 하나씩 골라 3D 트랙에서 경주시킵니다. 꼴찌로 들어온 동물의 주인이 커피를 삽니다. |

첫 화면(`/`)은 기본 게임으로 바로 넘어갑니다. 주소의 `?p=...` 값도 함께 넘기므로 예전에 공유한 링크도 그대로 동작합니다.

## 폴더 구조

```
public/                       ← 이 폴더를 그대로 배포 (빌드 단계 없음)
  index.html                  첫 화면 → 기본 게임으로 이동
  shared/                     모든 게임이 같이 쓰는 코드
    base.css                  패널, 버튼, 카운트다운, 배너, 소리 버튼
    util.js                   $, esc, sleep, shuffle, store(localStorage 안전하게)
    three-utils.js            canvasTex, disposeTree
    animals.js                동물 18종 3D 모델 (ANIMALS, makeAnimal)
    audio.js                  Web Audio 소리 엔진, 삐 소리, 음소거 버튼
    animal-sounds.js          동물 울음소리, 꼴찌 울음 + 트롬본
    roster.js                 참가자 목록 ↔ 주소창(?p=), 참가자 색
  games/
    horse-race/               경마
      index.html, style.css
      main.js                 장면, 경주 진행, 카메라, 순위표, 결과
      setup.js                설정 화면 (참가자, 동물 고르기, 미리보기)
      track.js                트랙 모양과 배경
      race-plan.js            등수와 속도 곡선 (출발 순간 결과 확정)
tests/                        Node 테스트 (three.js·DOM이 없는 순수 로직)
```

- 3D는 three.js(unpkg CDN), 소리는 Web Audio로 직접 합성합니다. 음원·모델 파일은 없습니다.
- 각 게임 페이지가 `importmap`으로 three.js 버전을 정합니다.

## 새 게임 추가하기

1. `public/games/<게임-이름>/` 폴더를 만듭니다. `games/horse-race/index.html`을 복사해서 시작하면 편합니다.
2. `index.html`에서 `../../shared/base.css`와 게임 전용 `style.css`, `main.js`를 불러옵니다.
3. 공용 기능은 `../../shared/...`에서 가져와 씁니다. 예:
   ```js
   import { ANIMALS, makeAnimal } from '../../shared/animals.js';
   import { playCall, playLoserCry } from '../../shared/animal-sounds.js';
   import { loadRosterFromUrl, saveRosterToUrl, PLAYER_COLORS } from '../../shared/roster.js';
   import { bindMuteButton } from '../../shared/audio.js';
   ```
4. 여러 게임이 같이 쓸 코드가 생기면 `shared/`로 옮깁니다. 한 게임만 쓰면 그 게임 폴더에 둡니다.
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

경주 계획(등수, 결승 시각, 진행률이 뒤로 가지 않는지)과 참가자 주소 저장/읽기를 검사합니다.

## 배포 (Cloudflare)

`main`에 올리면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트를 돌린 뒤 `public/` 폴더를 자동으로 배포합니다.
Actions 탭에서 **Deploy → Run workflow**로 직접 실행할 수도 있습니다.

저장소 **Settings → Secrets and variables → Actions**에 아래 두 값이 있어야 합니다.

| 이름 | 값 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → Workers → coffee-race → 설정 → 빌드 → 외부 CI/CD용 API 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID |

내 컴퓨터에서 직접 배포하려면 `./deploy.sh`를 실행합니다. 설정은 `wrangler.jsonc`에 있습니다.
