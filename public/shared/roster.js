// 참가자 목록 ↔ 주소창 (?p=민수:고양이,영희:호랑이,민기)
// 설정이 바뀔 때마다 주소를 갱신하므로, 그 링크를 공유하거나 북마크하면 같은 멤버로 바로 시작할 수 있다.
// 참가자: { name, animal: ANIMALS 인덱스 | null }
export const MAX_PLAYERS = 8;
// 참가자 순서대로 쓰는 색 (최대 8명)
export const PLAYER_COLORS = ['#e63946', '#1d4ed8', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// parseRoster / serializeRoster는 DOM을 쓰지 않아 Node 테스트에서 바로 검사할 수 있다.

// 입력창 글자 → 이름 목록. 쉼표로 여러 명을 한 번에 넣고, ':'는 주소 형식과 겹쳐서 지운다.
export const splitNames = text => text.split(',').map(s => s.replace(/:/g, '').trim()).filter(Boolean);

// 이미 있는 이름이나 정원(max)을 넘는 사람은 넣지 않는다. 실제로 넣은 수를 돌려준다.
export function addPlayers(players, names, max) {
  let added = 0;
  for (const name of names) {
    if (players.length >= max || players.some(p => p.name === name)) continue;
    players.push({ name, animal: null }); added++;
  }
  return added;
}

export function serializeRoster(players, animalNames) {
  return players.map(p => p.animal === null ? p.name : `${p.name}:${animalNames[p.animal]}`).join(',');
}

// 같은 동물을 두 명이 고르면 뒤 사람은 고르지 않은 상태가 된다
export function parseRoster(q, animalNames, max) {
  const players = [];
  if (!q) return players;
  for (const tok of q.split(',')) {
    const [rawName, animalName] = tok.split(':'), name = rawName.trim();
    if (!name || players.length >= max || players.some(p => p.name === name)) continue;
    const ai = animalNames.indexOf(animalName?.trim());
    players.push({ name, animal: ai >= 0 && !players.some(p => p.animal === ai) ? ai : null });
  }
  return players;
}

export function loadRosterFromUrl(animalNames, max) {
  return parseRoster(new URLSearchParams(location.search).get('p'), animalNames, max);
}
// extra: 함께 저장할 다른 주소 값 (예: { g: 'roulette' }). 값이 null이면 주소에서 뺀다.
export function saveRosterToUrl(players, animalNames, extra = {}) {
  const url = new URL(location.href), q = serializeRoster(players, animalNames);
  for (const [k, v] of Object.entries({ ...extra, p: q || null })) {
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  }
  try { history.replaceState(null, '', url); } catch { /* 일부 브라우저는 file:// 에서 주소 변경을 막는다 */ }
}
