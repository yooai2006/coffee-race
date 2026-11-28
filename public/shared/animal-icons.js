// 동물 18종의 2D 스티커 얼굴 (SVG 문자열). ANIMALS(animals.js)와 같은 순서다.
// 흰 테두리와 그림자는 index.html의 SVG 필터 #stk 가 그린다.
// three.js를 쓰지 않아 어디서든 가볍게 불러올 수 있다.

const K = '#3b2c52';   // 외곽선(잉크) 색
const ln = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const L = ln(), L2 = ln(2.4);
const F = c => `fill="${c}" ${L}`;

const eyes = (y, dx = 12, r = 4.3) => [50 - dx, 50 + dx].map(x =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.35}" fill="#fff"/>`).join('');
const blush = (y, dx = 21, c = '#ff8fab') =>
  `<ellipse cx="${50 - dx}" cy="${y}" rx="6" ry="3.6" fill="${c}" opacity=".55"/><ellipse cx="${50 + dx}" cy="${y}" rx="6" ry="3.6" fill="${c}" opacity=".55"/>`;
const mouthW = y => `<path d="M43 ${y} q3.5 4 7 0 q3.5 4 7 0" fill="none" ${L2}/>`;
const whiskers = (y, w = 14) => `<path d="M${30 - w} ${y - 3} l${w} 3 M${30 - w} ${y + 4} l${w} -1 M${70 + w} ${y - 3} l-${w} 3 M${70 + w} ${y + 4} l-${w} -1" fill="none" ${ln(2)}/>`;
// 겹친 도형들의 바깥 테두리만 그린다: 먼저 테두리 있는 것을 모두 그리고, 그 위에 테두리 없이 한 번 더 칠한다
const union = (shapes, fill) => shapes.map(s => s.replace('/>', ` ${F(fill)}/>`)).join('') + shapes.map(s => s.replace('/>', ` fill="${fill}"/>`)).join('');

const ART = [
  // 0 쥐
  () => `
    <circle cx="23" cy="30" r="17" ${F('#a3a3ad')}/><circle cx="23" cy="30" r="9.5" fill="#f6b8c6"/>
    <circle cx="77" cy="30" r="17" ${F('#a3a3ad')}/><circle cx="77" cy="30" r="9.5" fill="#f6b8c6"/>
    <ellipse cx="50" cy="60" rx="32" ry="28" ${F('#a3a3ad')}/>
    <ellipse cx="50" cy="72" rx="15" ry="10" fill="#c9c9d1"/>
    ${eyes(56)}${blush(67)}
    <ellipse cx="50" cy="68" rx="4.5" ry="3.4" fill="#f27d97" ${L2}/>
    <path d="M46 74 q4 3 8 0" fill="none" ${L2}/>${whiskers(70, 12)}`,
  // 1 소
  () => `
    <path d="M28 30 Q16 24 18 10 Q26 20 36 24 Z" ${F('#f6e7c8')}/><path d="M72 30 Q84 24 82 10 Q74 20 64 24 Z" ${F('#f6e7c8')}/>
    <ellipse cx="15" cy="46" rx="13" ry="7" transform="rotate(-18 15 46)" ${F('#a8703f')}/>
    <ellipse cx="85" cy="46" rx="13" ry="7" transform="rotate(18 85 46)" ${F('#a8703f')}/>
    <ellipse cx="50" cy="52" rx="30" ry="30" ${F('#a8703f')}/>
    <path d="M38 26 Q44 34 50 26 Q56 34 62 26 Q56 22 50 22 Q44 22 38 26 Z" fill="#7a4c26"/>
    <ellipse cx="50" cy="72" rx="23" ry="15" ${F('#f6c0ad')}/>
    <ellipse cx="42" cy="72" rx="3.4" ry="4.5" fill="${K}"/><ellipse cx="58" cy="72" rx="3.4" ry="4.5" fill="${K}"/>
    ${eyes(48, 13)}`,
  // 2 호랑이
  () => `
    <circle cx="25" cy="28" r="12" ${F('#f28c2e')}/><circle cx="25" cy="28" r="6" fill="#fff1dc"/>
    <circle cx="75" cy="28" r="12" ${F('#f28c2e')}/><circle cx="75" cy="28" r="6" fill="#fff1dc"/>
    <ellipse cx="50" cy="56" rx="35" ry="31" ${F('#f28c2e')}/>
    <path d="M50 27 v9 M41 29 l2.5 8 M59 29 l-2.5 8 M15 52 l10 2 M16 61 l9 -1 M85 52 l-10 2 M84 61 l-9 -1" fill="none" ${ln(3.2)}/>
    <ellipse cx="42" cy="70" rx="11" ry="9" fill="#fff8ee"/><ellipse cx="58" cy="70" rx="11" ry="9" fill="#fff8ee"/>
    ${eyes(53, 13)}
    <path d="M45 63 h10 l-5 5 Z" fill="#f27d97" ${L2}/>
    <path d="M50 68 v3 M43 72 q3.5 4 7 0 q3.5 4 7 0" fill="none" ${L2}/>`,
  // 3 토끼
  () => `
    <ellipse cx="36" cy="26" rx="9.5" ry="23" transform="rotate(-8 36 26)" ${F('#fbfbfb')}/>
    <ellipse cx="36" cy="27" rx="4.5" ry="15" transform="rotate(-8 36 27)" fill="#f8bccb"/>
    <ellipse cx="64" cy="26" rx="9.5" ry="23" transform="rotate(8 64 26)" ${F('#fbfbfb')}/>
    <ellipse cx="64" cy="27" rx="4.5" ry="15" transform="rotate(8 64 27)" fill="#f8bccb"/>
    <ellipse cx="50" cy="64" rx="32" ry="27" ${F('#fbfbfb')}/>
    ${eyes(61, 12)}${blush(70)}
    <path d="M47 67 h6 l-3 3 Z" fill="#f27d97" ${L2}/>${mouthW(71)}`,
  // 4 용
  () => `
    <path d="M31 30 L24 6 L41 24 Z" ${F('#ffd35a')}/><path d="M69 30 L76 6 L59 24 Z" ${F('#ffd35a')}/>
    <path d="M20 44 L4 36 L14 52 Z" ${F('#2f9e5b')}/><path d="M80 44 L96 36 L86 52 Z" ${F('#2f9e5b')}/>
    <path d="M44 24 l6 -9 l6 9" ${F('#ffd35a')}/>
    <ellipse cx="50" cy="52" rx="32" ry="29" ${F('#3fb36d')}/>
    <ellipse cx="50" cy="71" rx="22" ry="14" ${F('#b6e8b0')}/>
    <ellipse cx="43" cy="68" rx="2.6" ry="3.4" fill="${K}"/><ellipse cx="57" cy="68" rx="2.6" ry="3.4" fill="${K}"/>
    <path d="M42 77 q8 5 16 0" fill="none" ${L2}/>
    ${eyes(47, 13)}${blush(58, 23)}`,
  // 5 뱀
  () => `
    <ellipse cx="50" cy="86" rx="34" ry="10" ${F('#5a9e3a')}/>
    <ellipse cx="50" cy="52" rx="35" ry="27" ${F('#6cbb4a')}/>
    <circle cx="38" cy="33" r="4" fill="#4c8a30"/><circle cx="50" cy="30" r="4.5" fill="#4c8a30"/><circle cx="62" cy="33" r="4" fill="#4c8a30"/>
    <ellipse cx="50" cy="66" rx="20" ry="9" fill="#c6eba0"/>
    ${eyes(50, 14)}${blush(60, 25)}
    <path d="M42 66 q8 5 16 0" fill="none" ${L2}/>
    <path d="M50 70 v10 l-4 5 M50 80 l4 5" fill="none" stroke="#e63946" stroke-width="2.6" stroke-linecap="round"/>`,
  // 6 말
  () => `
    <path d="M33 26 L30 6 L45 20 Z" ${F('#a86a35')}/><path d="M67 26 L70 6 L55 20 Z" ${F('#a86a35')}/>
    <ellipse cx="50" cy="54" rx="27" ry="35" ${F('#a86a35')}/>
    <path d="M36 22 Q50 8 64 22 Q58 30 50 26 Q42 32 36 22 Z" ${F('#4e2c14')}/>
    <path d="M50 30 Q46 44 50 56 Q54 44 50 30 Z" fill="#fff4e4"/>
    <ellipse cx="50" cy="76" rx="21" ry="14" ${F('#e9c39d')}/>
    <ellipse cx="42" cy="75" rx="2.6" ry="3.6" fill="${K}"/><ellipse cx="58" cy="75" rx="2.6" ry="3.6" fill="${K}"/>
    <path d="M44 83 q6 3 12 0" fill="none" ${L2}/>
    ${eyes(50, 13)}`,
  // 7 양
  () => `
    ${union(['<circle cx="34" cy="30" r="13"/>', '<circle cx="50" cy="24" r="14"/>', '<circle cx="66" cy="30" r="13"/>',
      '<circle cx="24" cy="46" r="12"/>', '<circle cx="76" cy="46" r="12"/>', '<circle cx="26" cy="64" r="11"/>', '<circle cx="74" cy="64" r="11"/>',
      '<circle cx="36" cy="78" r="11"/>', '<circle cx="64" cy="78" r="11"/>', '<circle cx="50" cy="56" r="28"/>'], '#f7f3ea')}
    <ellipse cx="14" cy="54" rx="11" ry="6" transform="rotate(20 14 54)" ${F('#e8cba8')}/>
    <ellipse cx="86" cy="54" rx="11" ry="6" transform="rotate(-20 86 54)" ${F('#e8cba8')}/>
    <ellipse cx="50" cy="60" rx="21" ry="24" ${F('#f1d7b8')}/>
    ${union(['<circle cx="42" cy="38" r="7"/>', '<circle cx="50" cy="35" r="7.5"/>', '<circle cx="58" cy="38" r="7"/>'], '#f7f3ea')}
    ${eyes(56, 9, 3.8)}${blush(68, 15)}
    <path d="M47 66 h6 l-3 3 Z" fill="${K}"/>${mouthW(71)}`,
  // 8 원숭이
  () => `
    <circle cx="16" cy="54" r="12" ${F('#8a5530')}/><circle cx="16" cy="54" r="6.5" fill="#f2c59b"/>
    <circle cx="84" cy="54" r="12" ${F('#8a5530')}/><circle cx="84" cy="54" r="6.5" fill="#f2c59b"/>
    <circle cx="50" cy="52" r="33" ${F('#8a5530')}/>
    <path d="M44 20 q6 -8 10 2" fill="none" ${L2}/>
    ${union(['<circle cx="39" cy="50" r="13"/>', '<circle cx="61" cy="50" r="13"/>', '<ellipse cx="50" cy="68" rx="22" ry="15"/>'], '#f2c59b')}
    ${eyes(51, 11)}${blush(64, 20)}
    <ellipse cx="46.5" cy="63" rx="1.8" ry="2.4" fill="${K}"/><ellipse cx="53.5" cy="63" rx="1.8" ry="2.4" fill="${K}"/>
    <path d="M42 70 q8 6 16 0" fill="none" ${L2}/>`,
  // 9 닭
  () => `
    ${union(['<circle cx="39" cy="24" r="9"/>', '<circle cx="50" cy="18" r="10"/>', '<circle cx="61" cy="24" r="9"/>'], '#e63946')}
    <ellipse cx="50" cy="58" rx="30" ry="32" ${F('#fff8ea')}/>
    ${eyes(52, 13)}${blush(64, 21)}
    <ellipse cx="50" cy="78" rx="5.5" ry="8" ${F('#e63946')}/>
    <path d="M41 63 L59 63 L50 74 Z" ${F('#ffbf2e')}/>`,
  // 10 개
  () => `
    <ellipse cx="50" cy="55" rx="32" ry="30" ${F('#e3a364')}/>
    <path d="M24 30 Q6 34 10 66 Q20 68 28 52 Z" ${F('#8a5126')}/>
    <path d="M76 30 Q94 34 90 66 Q80 68 72 52 Z" ${F('#8a5126')}/>
    <ellipse cx="50" cy="70" rx="18" ry="13" ${F('#fff1de')}/>
    ${eyes(52, 13)}${blush(64, 22)}
    <ellipse cx="50" cy="64" rx="6.5" ry="4.6" fill="${K}"/>
    <path d="M50 68 v4 M43 73 q3.5 3.5 7 0 q3.5 3.5 7 0" fill="none" ${L2}/>
    <path d="M47 75 q3 7 6 0" ${F('#f27d97')}/>`,
  // 11 돼지
  () => `
    <path d="M22 36 L20 12 L40 26 Z" ${F('#f6a9b8')}/><path d="M78 36 L80 12 L60 26 Z" ${F('#f6a9b8')}/>
    <ellipse cx="50" cy="56" rx="34" ry="30" ${F('#f6a9b8')}/>
    ${eyes(50, 15)}${blush(64, 24, '#ff6b8b')}
    <ellipse cx="50" cy="66" rx="14" ry="10" ${F('#f2869c')}/>
    <ellipse cx="45" cy="66" rx="2.6" ry="3.8" fill="${K}"/><ellipse cx="55" cy="66" rx="2.6" ry="3.8" fill="${K}"/>
    <path d="M45 80 q5 3 10 0" fill="none" ${L2}/>`,
  // 12 아르마딜로
  () => `
    <ellipse cx="24" cy="28" rx="6" ry="11" transform="rotate(-20 24 28)" ${F('#e0b9a4')}/>
    <ellipse cx="76" cy="28" rx="6" ry="11" transform="rotate(20 76 28)" ${F('#e0b9a4')}/>
    <ellipse cx="50" cy="60" rx="30" ry="25" ${F('#d9c09b')}/>
    <path d="M14 54 Q14 16 50 16 Q86 16 86 54 Q50 44 14 54 Z" ${F('#9c7f5b')}/>
    <path d="M24 48 Q30 24 50 22 M40 46 Q42 28 50 22 M60 46 Q58 28 50 22 M76 48 Q70 24 50 22" fill="none" ${ln(2.2)}/>
    ${eyes(60, 12)}${blush(70, 20)}
    <ellipse cx="50" cy="78" rx="9" ry="7" ${F('#e9b4a2')}/>
    <circle cx="50" cy="76" r="2.6" fill="${K}"/>`,
  // 13 펭귄
  () => `
    <circle cx="50" cy="54" r="35" ${F('#263043')}/>
    <circle cx="38" cy="58" r="15" fill="#fff"/><circle cx="62" cy="58" r="15" fill="#fff"/><ellipse cx="50" cy="72" rx="22" ry="14" fill="#fff"/>
    ${eyes(56, 11)}${blush(67, 20)}
    <path d="M42 64 Q50 60 58 64 Q50 75 42 64 Z" ${F('#ffa32e')}/>`,
  // 14 카피바라 (머리에 귤)
  () => `
    <circle cx="25" cy="28" r="7" ${F('#8a5d33')}/><circle cx="75" cy="28" r="7" ${F('#8a5d33')}/>
    <rect x="17" y="24" width="66" height="64" rx="27" ${F('#a8763f')}/>
    <rect x="26" y="56" width="48" height="30" rx="15" fill="#946234"/>
    <ellipse cx="50" cy="62" rx="12" ry="6" fill="${K}"/>
    <path d="M28 44 q5 -4 10 0 M62 44 q5 -4 10 0" fill="none" ${ln(3)}/>
    ${blush(54, 25)}
    <path d="M44 74 q6 4 12 0" fill="none" ${L2}/>
    <circle cx="50" cy="18" r="9" ${F('#ffa52e')}/><path d="M50 9 q6 -6 10 -2 q-5 4 -10 2 Z" fill="#4caf50" ${ln(2)}/>`,
  // 15 기린
  () => `
    <path d="M38 26 L35 9 M62 26 L65 9" ${ln(4.5)}/>
    <circle cx="35" cy="8" r="5.5" ${F('#b9772f')}/><circle cx="65" cy="8" r="5.5" ${F('#b9772f')}/>
    <ellipse cx="16" cy="38" rx="13" ry="6" transform="rotate(-25 16 38)" ${F('#f2c45a')}/>
    <ellipse cx="84" cy="38" rx="13" ry="6" transform="rotate(25 84 38)" ${F('#f2c45a')}/>
    <ellipse cx="50" cy="52" rx="28" ry="32" ${F('#f2c45a')}/>
    <path d="M30 34 q6 -4 9 2 q-3 6 -9 -2 Z M62 30 q8 -2 8 5 q-6 3 -8 -5 Z M24 54 q5 -3 6 3 q-4 3 -6 -3 Z M73 52 q5 0 4 6 q-5 0 -4 -6 Z" fill="#c4823a"/>
    <ellipse cx="50" cy="74" rx="21" ry="14" ${F('#f8de9f')}/>
    <ellipse cx="43" cy="72" rx="2.4" ry="3.4" fill="${K}"/><ellipse cx="57" cy="72" rx="2.4" ry="3.4" fill="${K}"/>
    <path d="M44 80 q6 4 12 0" fill="none" ${L2}/>
    ${eyes(50, 12)}`,
  // 16 고양이
  () => `
    <path d="M18 44 L20 10 L44 28 Z" ${F('#a5abb4')}/><path d="M24 36 L25 20 L36 29 Z" fill="#f8bccb"/>
    <path d="M82 44 L80 10 L56 28 Z" ${F('#a5abb4')}/><path d="M76 36 L75 20 L64 29 Z" fill="#f8bccb"/>
    <ellipse cx="50" cy="58" rx="35" ry="29" ${F('#a5abb4')}/>
    <path d="M50 30 v9 M42 31 l2 7 M58 31 l-2 7 M16 54 l9 1 M84 54 l-9 1" fill="none" stroke="#6e7480" stroke-width="3.2" stroke-linecap="round"/>
    <ellipse cx="50" cy="71" rx="15" ry="9" fill="#e6e9ee"/>
    ${eyes(55, 14)}${blush(66, 24)}
    <path d="M47 64 h6 l-3 3 Z" fill="#f27d97" ${L2}/>${mouthW(68)}${whiskers(68, 13)}`,
  // 17 우사인 볼트 (사람: 노란 셔츠)
  () => `
    <path d="M18 100 Q18 80 50 80 Q82 80 82 100 Z" ${F('#ffd100')}/><path d="M38 81 L50 94 L62 81" fill="none" stroke="#009b3a" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="20" cy="54" r="7" ${F('#8b5a3c')}/><circle cx="80" cy="54" r="7" ${F('#8b5a3c')}/>
    <ellipse cx="50" cy="52" rx="29" ry="32" ${F('#8b5a3c')}/>
    <path d="M21 46 Q20 18 50 18 Q80 18 79 46 Q72 32 50 32 Q28 32 21 46 Z" ${F('#1f1a1a')}/>
    ${eyes(52, 11, 4)}
    <path d="M47 56 q3 4 6 0" fill="none" ${L2}/>
    <path d="M38 66 Q50 78 62 66 Z" fill="#fff" ${L2}/>
    <path d="M84 12 l-7 11 h6 l-4 10 l11 -14 h-6 l4 -7 Z" fill="#ffd100" ${ln(2)}/>`,
];

// 동물 얼굴만 (<g>) — 다른 SVG 안에 넣을 때 쓴다. sticker: 흰 테두리 필터 (자주 다시 그리는 곳에서는 끈다)
export const animalArt = (i, sticker = true) => `<g${sticker ? ' filter="url(#stk)"' : ''}>${ART[i]()}</g>`;
// 완성된 <svg>
export const animalSvg = (i, cls = 'ani', sticker = true) => `<svg class="${cls}" viewBox="-8 -8 116 116" aria-hidden="true">${animalArt(i, sticker)}</svg>`;
// 정보판·결과표용 작은 동그라미 아이콘. color: 참가자 색 (테두리)
export const animalChip = (i, color) => `<span class="achip" style="--c:${color}">${animalSvg(i, 'ani', false)}</span>`;
export const ICON_COUNT = ART.length;
