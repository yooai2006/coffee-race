// 게임 고르기 카드의 SVG 그림 (게임 id → <svg>). 동물은 animal-icons.js 의 스티커를 쓴다.
import { animalArt } from './animal-icons.js';

const K = '#3b2c52';
const L = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// 동물 스티커 하나: (x, y) 왼쪽 위, s 배율 (1 = 100px), r 기울기
const ani = (i, x, y, s, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r} ${50 * s} ${50 * s}) scale(${s})">${animalArt(i)}</g>`;
const bean = (x, y, r = 0, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><ellipse rx="9" ry="12" fill="#6b3f1f" ${L(2.4)}/><path d="M0 -10 q-5 10 0 20" fill="none" stroke="#3a1f0c" stroke-width="2.4" stroke-linecap="round"/></g>`;
const cup = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-16 -14 h32 l-4 26 q-1 6 -7 6 h-10 q-6 0 -7 -6 Z" fill="#fff" ${L(3)}/>
  <path d="M16 -8 q12 0 10 10 q-2 8 -12 6" fill="none" ${L(3)}/>
  <ellipse cx="0" cy="-12" rx="13" ry="3" fill="#7a4a24"/>
  <path d="M-6 -22 q-4 -5 0 -10 M5 -22 q-4 -5 0 -10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;

const SCENES = {
  race: () => `
    <defs><linearGradient id="gaSky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#eef9ff"/></linearGradient></defs>
    <rect width="300" height="210" fill="url(#gaSky1)"/>
    <circle cx="250" cy="34" r="16" fill="#fff3b0"/>
    <path d="M0 110 Q60 70 130 98 T300 86 V210 H0 Z" fill="#9ad874"/>
    <path d="M0 130 Q90 104 170 126 T300 118 V210 H0 Z" fill="#7cc45a"/>
    <g fill="#5fae45" ${L(0)}><circle cx="34" cy="104" r="14"/><circle cx="52" cy="100" r="17"/><circle cx="70" cy="106" r="12"/><circle cx="236" cy="98" r="15"/><circle cx="254" cy="94" r="18"/></g>
    <path d="M-10 210 Q120 120 310 140 L310 175 Q150 160 40 210 Z" fill="#e2b47a" ${L(3)}/>
    <path d="M40 170 q30 -14 60 -22 M150 152 q40 -4 80 -2" fill="none" stroke="#c99659" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
    <g ${L(2.5)}><path d="M262 140 V70" fill="none"/><path d="M262 72 h30 v22 h-30 Z" fill="#fff"/></g>
    <g fill="${K}"><rect x="262" y="72" width="7.5" height="5.5"/><rect x="277" y="72" width="7.5" height="5.5"/><rect x="269.5" y="77.5" width="7.5" height="5.5"/><rect x="284.5" y="77.5" width="7.5" height="5.5"/><rect x="262" y="83" width="7.5" height="5.5"/><rect x="277" y="83" width="7.5" height="5.5"/><rect x="269.5" y="88.5" width="7.5" height="5.5"/><rect x="284.5" y="88.5" width="7.5" height="5.5"/></g>
    ${ani(16, 170, 66, 0.72, 8)}${ani(3, 20, 86, 0.8, -8)}${ani(10, 92, 100, 0.98, 4)}`,

  roulette: () => `
    <defs><radialGradient id="gaR" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#7b55c9"/><stop offset="1" stop-color="#3e2a78"/></radialGradient></defs>
    <rect width="300" height="210" fill="url(#gaR)"/>
    <g fill="#ffd35a" opacity=".85"><circle cx="30" cy="30" r="3"/><circle cx="270" cy="40" r="2.5"/><circle cx="250" cy="180" r="3"/><circle cx="40" cy="170" r="2.5"/></g>
    <ellipse cx="150" cy="150" rx="128" ry="46" fill="#8a5a3a" ${L(3)}/>
    <ellipse cx="150" cy="144" rx="112" ry="36" fill="#2f9e6a"/>
    ${ani(2, 8, 66, 0.78, -10)}${ani(11, 214, 66, 0.78, 10)}${ani(13, 112, 8, 0.72)}
    <g transform="translate(150 140) rotate(-12)">
      <rect x="-46" y="-12" width="62" height="20" rx="8" fill="#ff9f1c" ${L(3)}/>
      <rect x="14" y="-8" width="40" height="12" rx="5" fill="#c9ced8" ${L(3)}/>
      <path d="M-40 6 q-6 26 8 30 h14 q4 -14 -2 -30 Z" fill="#ff6b8b" ${L(3)}/>
      <circle cx="-10" cy="-2" r="14" fill="#e7eaf0" ${L(3)}/>
      <g fill="${K}"><circle cx="-10" cy="-10" r="2.6"/><circle cx="-2.5" cy="-5" r="2.6"/><circle cx="-2.5" cy="3" r="2.6"/><circle cx="-10" cy="7" r="2.6"/><circle cx="-17.5" cy="3" r="2.6"/><circle cx="-17.5" cy="-5" r="2.6"/></g>
    </g>
    ${bean(214, 150, 25, 1.1)}`,

  plinko: () => `
    <rect width="300" height="210" fill="#ffe7a3"/>
    <rect x="34" y="8" width="232" height="198" rx="18" fill="#7a5ad6" ${L(3)}/>
    ${[0, 1, 2, 3, 4].map(r => Array.from({ length: r % 2 ? 6 : 7 }, (_, c) =>
      `<circle cx="${(r % 2 ? 76 : 58) + c * 31}" cy="${52 + r * 24}" r="5" fill="#ffd35a" ${L(2)}/>`).join('')).join('')}
    <rect x="44" y="166" width="212" height="32" rx="8" fill="#5b3fb5"/>
    ${[1, 2, 3, 4, 5].map(c => `<rect x="${44 + c * 35.3 - 2}" y="160" width="4" height="38" rx="2" fill="#fff"/>`).join('')}
    <rect x="150" y="166" width="31" height="32" fill="#ff6b8b"/>
    ${cup(166, 186, 0.62)}
    ${ani(8, 98, 8, 0.56, -12)}${ani(9, 176, 70, 0.5, 14)}
    <path d="M222 30 q6 -8 14 -4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,

  bomb: () => `
    <defs><radialGradient id="gaB" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#ff9f43"/></radialGradient></defs>
    <rect width="300" height="210" fill="url(#gaB)"/>
    <g stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"><path d="M150 18 v-14 M200 30 l10 -10 M100 30 l-10 -10 M230 70 l14 -4 M70 70 l-14 -4"/></g>
    ${ani(7, 4, 92, 0.86, -10)}${ani(10, 210, 96, 0.84, 10)}
    <circle cx="150" cy="122" r="56" fill="#2b2440" ${L(3)}/>
    <ellipse cx="130" cy="96" rx="14" ry="9" fill="#fff" opacity=".35" transform="rotate(-30 130 96)"/>
    <rect x="138" y="56" width="24" height="16" rx="4" fill="#6e6a80" ${L(3)}/>
    <path d="M150 58 q6 -24 30 -28" fill="none" stroke="#c49a6c" stroke-width="5" stroke-linecap="round"/>
    <path d="M186 16 l5 10 l11 -2 l-7 9 l7 9 l-11 -2 l-5 10 l-4 -11 l-11 -1 l9 -7 l-4 -11 Z" fill="#ffd35a" ${L(2.5)}/>
    <circle cx="150" cy="128" r="22" fill="#fff" ${L(3)}/>
    ${cup(149, 132, 0.62)}`,

  skijump: () => `
    <defs><linearGradient id="gaS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fcfff"/><stop offset="1" stop-color="#dff2ff"/></linearGradient></defs>
    <rect width="300" height="210" fill="url(#gaS)"/>
    <path d="M-10 150 L60 70 L110 120 L170 50 L250 130 L310 90 V210 H-10 Z" fill="#c9e3f7"/>
    <path d="M60 70 L46 86 L58 82 L68 90 L76 86 Z M170 50 L154 68 L168 62 L178 72 L188 66 Z" fill="#fff"/>
    <path d="M-10 210 V120 Q60 120 120 170 L150 176 V210 Z" fill="#fff" ${L(3)}/>
    <path d="M-10 128 Q60 128 118 176" fill="none" stroke="#9ec9ea" stroke-width="3"/>
    <path d="M140 210 Q220 160 310 170 V210 Z" fill="#fff" ${L(3)}/>
    <g transform="translate(188 98) rotate(-18)">
      <rect x="-50" y="38" width="100" height="7" rx="3.5" fill="#e63946" ${L(2.5)}/>
      <rect x="-46" y="50" width="100" height="7" rx="3.5" fill="#e63946" ${L(2.5)}/>
    </g>
    ${ani(13, 148, 20, 0.88, -14)}
    <g fill="#fff"><circle cx="40" cy="30" r="3"/><circle cx="90" cy="20" r="2.4"/><circle cx="120" cy="44" r="2.8"/><circle cx="270" cy="30" r="2.6"/><circle cx="20" cy="70" r="2.4"/></g>
    <path d="M120 120 q-30 -6 -50 4 M130 104 q-26 -10 -48 -4" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>`,

  jenga: () => {
    const blocks = [];
    for (let r = 0; r < 7; r++) {
      const y = 166 - r * 16, sx = r * 0.8;
      if (r % 2 === 0) blocks.push(`<rect x="${110 + sx}" y="${y}" width="80" height="16" rx="3" fill="${r === 4 ? '#e8b46c' : '#f0c88a'}" ${L(2.5)}/>`);
      else for (let c = 0; c < 3; c++) blocks.push(`<rect x="${110 + sx + c * 26.7}" y="${y}" width="26.7" height="16" rx="3" fill="#e9bd7c" ${L(2.5)}/>`);
    }
    return `
    <rect width="300" height="210" fill="#ffe8c7"/>
    <g fill="#ffd6a0">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${20 + i * 52}" cy="${24 + (i % 2) * 18}" r="6"/>`).join('')}</g>
    <rect x="10" y="180" width="280" height="40" rx="10" fill="#a7693b" ${L(3)}/>
    ${blocks.join('')}
    <rect x="186" y="118" width="38" height="16" rx="3" fill="#f7d6a3" ${L(2.5)}/>
    ${ani(14, 6, 94, 0.88, -6)}${ani(16, 218, 98, 0.78, 8)}
    <path d="M232 104 l6 -8 M242 110 l9 -4" fill="none" ${L(3)}/>`;
  },
};

// 게임 id → 카드 그림 <svg>. 모르는 게임이면 커피잔 그림
export function gameArt(id) {
  const body = SCENES[id] ? SCENES[id]() : `<rect width="300" height="210" fill="#ffe7a3"/>${cup(150, 112, 2.4)}`;
  return `<svg class="gart" viewBox="0 0 300 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
}
