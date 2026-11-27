// 모든 게임이 같이 쓰는 작은 도구들. three.js와 상관없어서 Node 테스트에서도 불러올 수 있다.

export const $ = s => document.querySelector(s);
export const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// localStorage는 막힌 브라우저(사생활 보호 모드 등)에서 예외를 던진다. 실패해도 게임은 그대로 돈다.
export const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* 저장 못 해도 괜찮다 */ } },
};
