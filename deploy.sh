#!/bin/sh
# horse-race.html 을 Cloudflare(coffee-race)에 배포한다. 게임을 고친 뒤 다시 실행하면 새 버전이 올라간다.
set -e
cd "$(dirname "$0")"
rm -rf site && mkdir site
cp horse-race.html site/index.html
npx --yes wrangler@latest deploy
