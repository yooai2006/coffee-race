# 작업 지침

## Git
- PR은 만들지 않는다. 작업이 끝나면 `main`에 바로 푸시한다.
- `main`에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트 후 Cloudflare에 자동 배포한다.
  그래서 푸시 전에 `npm test`가 통과하는지 확인한다.
