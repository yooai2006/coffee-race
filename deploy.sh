#!/bin/sh
# public/ 폴더를 Cloudflare(coffee-race)에 그대로 배포한다. 빌드 단계는 없다.
# wrangler 버전을 고정해서, 새 버전이 나와도 배포가 갑자기 깨지지 않게 한다.
set -e
cd "$(dirname "$0")"
npm test
npx --yes wrangler@4.168.0 deploy
