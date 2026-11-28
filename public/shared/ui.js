// 모든 게임이 같이 쓰는 화면 요소: 배너, 큰 글자(카운트다운), 섬광, 상단 정보판(HUD), 결과 화면, 짧은 알림
import { $, esc, sleep } from './util.js';
import { beep } from './audio.js';
import { animalImg, animalChip } from './animal-icons.js';

// 결과 화면의 큰 커피잔
const CUP = `<svg class="cupBig" viewBox="0 0 100 100" aria-hidden="true"><g stroke="#3b2c52" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M30 22 q-6 -8 0 -16 M46 22 q-6 -8 0 -16 M62 22 q-6 -8 0 -16" fill="none" stroke="#fff" stroke-width="5"/>
  <path d="M74 44 q20 -2 18 16 q-2 16 -22 14" fill="none"/>
  <path d="M12 32 h64 l-6 46 q-2 12 -14 12 h-24 q-12 0 -14 -12 Z" fill="#fff"/>
  <ellipse cx="44" cy="34" rx="30" ry="5" fill="#7a4a24" stroke="none"/>
  <g transform="translate(44 62) rotate(25)"><ellipse rx="11" ry="15" fill="#8a5126"/><path d="M0 -13 q-6 13 0 26" fill="none" stroke-width="3.5"/></g>
</g></svg>`;

let toastTimer = 0, lastHud = '';

export const ui = {
  gameTitle: '',   // 결과 화면 제목 ("○○ 결과"). app.js가 게임을 고를 때 넣는다

  banner(text) { const b = $('#banner'); b.textContent = text; b.classList.add('show'); },
  hideBanner() { $('#banner').classList.remove('show'); },

  // 화면 아래쪽에 잠깐 뜨는 알림
  toast(text) {
    const t = $('#toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  },

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

  // html: 순위 줄(<div class="r">…)들, 또는 자유 내용(종이 카드 한 장에 담는다)
  // ranked: 위 3줄에 금·은·동 색을 칠한다
  hud(title, html, { ranked = false } = {}) {
    const key = `${title}|${ranked}|${html}`;
    if (key !== lastHud) {
      lastHud = key;
      $('#hudTitle').textContent = title;
      $('#hudList').innerHTML = html.includes('class="r') ? html : `<div class="box">${html}</div>`;
      $('#hud').classList.toggle('ranked', ranked);
    }
    $('#hud').classList.remove('hidden');
  },

  // loser: 커피 살 사람 { name, animal(ANIMALS 인덱스), color }
  // rows: 위에서부터 보여 줄 줄 [{ rank(숫자) 또는 mark(이모지), name, animal, color, note, loser }]
  showResult({ loser, rows }) {
    $('#resultTitle').textContent = ui.gameTitle ? `${ui.gameTitle} 결과` : '결과';
    $('#resultHero').innerHTML = `${CUP}<div class="who"><div class="lbl">오늘의 커피는</div><div class="nm">${esc(loser.name)}</div></div>${animalImg(loser.animal)}`;
    $('#resultList').innerHTML = rows.map(r => `
      <li class="${r.rank && r.rank <= 3 ? `r${r.rank}` : ''}${r.loser ? ' loser' : ''}">
        <span class="rk">${r.rank ?? r.mark ?? ''}</span>${animalChip(r.animal, r.color)}
        <div class="who"><div class="nm">${esc(r.name)}${r.loser ? ' ☕' : ''}</div><div class="sub">${esc(r.note || '')}</div></div>
      </li>`).join('');
    const res = $('#result'); res.classList.remove('hidden'); res.scrollTop = 0;
    $('#hud').classList.add('hidden');
  },

  // 설정 화면으로 돌아갈 때 게임 화면 요소를 모두 숨긴다
  reset() {
    ['#result', '#hud'].forEach(s => $(s).classList.add('hidden'));
    ui.hideBanner(); lastHud = '';
  },
};
