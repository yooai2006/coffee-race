// 모든 게임이 같이 쓰는 화면 요소: 배너, 큰 글자(카운트다운), 섬광, 상단 정보판(HUD), 결과표
import { $, esc, sleep } from './util.js';
import { beep } from './audio.js';

export const ui = {
  banner(text) { const b = $('#banner'); b.textContent = text; b.classList.add('show'); },
  hideBanner() { $('#banner').classList.remove('show'); },

  // 화면 가운데에 큰 글자를 튀어나오게 보여 준다 (0.8초)
  // mid: 긴 글자(예: '112.5m')는 조금 작게
  pop(text, { mid = false } = {}) {
    const cd = $('#countdown');
    cd.textContent = text; cd.classList.toggle('mid', mid);
    cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
  },
  // 3, 2, 1, GO! 중간에 alive()가 false가 되면(처음으로 돌아가면) false를 돌려준다
  async countdown(alive) {
    for (const s of ['3', '2', '1', 'GO!']) {
      ui.pop(s); beep(s === 'GO!' ? 880 : 440);
      await sleep(500);
      if (!alive()) return false;
    }
    return true;
  },

  flash() {
    const f = $('#flash'); f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  },

  hud(title, html) {
    $('#hudTitle').textContent = title; $('#hudList').innerHTML = html;
    $('#hud').classList.remove('hidden');
  },

  // head: 열 제목 배열, rows: [[칸 HTML, ...], ...] (칸 내용은 호출한 쪽에서 esc 처리)
  showResult({ title, head, rows }) {
    $('#resultTitle').textContent = title;
    $('#resultHead').innerHTML = `<tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
    $('#resultBody').innerHTML = rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="rk"' : ''}>${c}</td>`).join('')}</tr>`).join('');
    $('#result').classList.remove('hidden');
  },

  // 설정 화면으로 돌아갈 때 게임 화면 요소를 모두 숨긴다
  reset() {
    ['#result', '#hud'].forEach(s => $(s).classList.add('hidden'));
    ui.hideBanner();
  },
};
