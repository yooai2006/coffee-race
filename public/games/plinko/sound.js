// 핀볼 낙하 소리: 오락실 느낌 배경 음악, 못에 부딪히는 '띵', 칸에 들어가는 소리, ☕ 표시가 움직이는 째깍 (Web Audio 합성)
import { audio, audioCtx, playVoices } from '../../shared/audio.js';
import { midi, tone, createBus, createSequencer } from '../../shared/music.js';

// 4마디 (C - G - Am - F), 8분음표 8개씩. 베이스와 통통 튀는 화음 펼치기
const PROG = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]];
const ARP = [1, 2, 3, 2, 1, 2, 3, 2];

export function createPlinkoAudio() {
  let music = null, seq = null;
  const eighth = () => 60 / 138 / 2;

  function onStep(step, t) {
    const s = step % 32, [bass, ...chord] = PROG[Math.floor(s / 8)], b = s % 8, ctx = music.ctx, out = music.node, e = eighth();
    if (b % 4 === 0) tone(ctx, out, { t, f: midi(bass), wave: 'triangle', dur: e * 1.8, gain: 0.3, cutoff: 800 });
    if (b % 4 === 2) tone(ctx, out, { t, f: midi(bass + 12), wave: 'triangle', dur: e * 0.9, gain: 0.18, cutoff: 800 });
    tone(ctx, out, { t, f: midi(chord[ARP[b] - 1] + 12), wave: 'square', dur: e * 0.6, gain: 0.04, cutoff: 2600 });
    if (b % 2 === 1) tone(ctx, out, { t, f: 0, dur: 0.03, gain: 0.05, cutoff: 8000, type: 'highpass' });
  }

  return {
    start() { this.stop(); music = createBus(0.38, 0.8); seq = createSequencer(music.ctx, eighth, onStep); seq.start(); },
    stop(fade = 0.3) { seq?.stop(); music?.close(fade); music = null; seq = null; },
    // 못에 부딪힘: 줄이 내려갈수록 낮은 음. pan: -1..1
    peg(row, pan) {
      const f = midi(96 - row * 2 + Math.floor(Math.random() * 3));
      playVoices([{ wave: 'sine', f, dur: 0.09, gain: 0.12 }, { wave: 'triangle', f: f * 2.01, dur: 0.05, gain: 0.03 }], { vol: 1, ...panOpt(pan) });
    },
    // 동물끼리 부딪힘: 뿅!
    bump(pan) {
      playVoices([{ wave: 'sine', f: [[0, 260], [0.4, 620], [1, 420]], dur: 0.14, gain: 0.22 }, { wave: 'noise', dur: 0.03, filter: ['bandpass', 1500, 2], gain: 0.15 }], panOpt(pan));
    },
    safe() {
      playVoices([[0, 76], [0.08, 79], [0.16, 84]].map(([at, n]) => ({ at, wave: 'square', f: midi(n), dur: 0.1, filter: ['lowpass', 3000, 1], gain: 0.14 })));
    },
    hit() {
      playVoices([
        ...[0, 0.12, 0.24, 0.36].map(at => ({ at, wave: 'square', f: [[0, 880], [1, 660]], dur: 0.1, filter: ['lowpass', 2500, 1], gain: 0.25 })),
        { wave: 'noise', dur: 0.4, filter: ['bandpass', 1200, 0.8], gain: 0.4 },
      ]);
    },
    tick() { playVoices([{ wave: 'noise', dur: 0.02, filter: ['bandpass', 5000, 5], gain: 0.25 }]); },
    gate() { playVoices([{ wave: 'noise', dur: 0.25, filter: ['lowpass', [[0, 3000], [1, 400]], 1], gain: 0.5 }, { wave: 'sine', f: [[0, 300], [1, 120]], dur: 0.2, gain: 0.4 }]); },
  };
}

// playVoices는 dest를 받으므로, 좌우 위치가 있으면 그 자리에서 패너를 만든다
function panOpt(pan) {
  if (!pan || audio.muted) return {};
  const ctx = audioCtx(), p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(audio.out);
  return { dest: p };
}
