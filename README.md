# ☕ 커피 내기 경마

참가자마다 동물을 하나씩 골라 3D 트랙에서 경주시키는 브라우저 게임입니다. 꼴찌로 들어온 동물의 주인이 커피를 삽니다.

**플레이:** https://coffee-race.dream-montage-web.workers.dev

## 특징

- HTML 파일 하나(`horse-race.html`)로 동작합니다. 3D는 three.js(unpkg CDN), 소리는 Web Audio로 직접 합성합니다.
- 순위는 출발하는 순간 정해지지만, 막판까지 접전이 되도록 속도 곡선을 만듭니다.
- 동물 18종(십이지 + 아르마딜로, 펭귄, 카피바라, 기린, 고양이, 우사인 볼트)이 각자 다른 모습과 울음소리를 가집니다.
- 참가자와 고른 동물이 주소의 `?p=민수:고양이,영희:호랑이` 값에 저장됩니다. 링크를 공유하면 같은 멤버로 바로 시작할 수 있습니다.

## 로컬에서 실행

`horse-race.html`을 브라우저로 열면 됩니다. three.js를 CDN에서 받으므로 인터넷 연결이 필요합니다.

## 배포 (Cloudflare)

```sh
./deploy.sh
```

`horse-race.html`을 `site/index.html`로 복사한 뒤 `wrangler deploy`로 올립니다. 설정은 `wrangler.jsonc`에 있습니다.
