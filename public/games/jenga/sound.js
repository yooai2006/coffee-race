// 젠가 소리: 조용히 긴장되는 음악, 블록 미는 소리, 삐걱, 톡, 와르르 (Web Audio 합성)
import { playVoices } from '../../shared/audio.js';
import { midi, noiseBuffer, tone, createBus, createSequencer } from '../../shared/music.js';

// 단조 5음계로 띄엄띄엄 떨어지는 마림바 소리 (8분음표 16걸음, 0은 쉼)
const PLUCK = [69, 0, 0, 72, 0, 76, 0, 0, 74, 0, 0, 72, 0, 0, 67, 0];
const BASS = [45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0];

export function createJengaAudio() {
  let music = null, seq = null, tension = 0, slide = null;
  const eighth = () => 60 / (84 + 40 * tension) / 2;

  function onStep(step, t) {
    const s = step % 16, ctx = music.ctx, out = music.node, e = eighth();
    if (PLUCK[s]) {
      tone(ctx, out, { t, f: midi(PLUCK[s]), wave: 'sine', dur: 0.5, gain: 0.12, cutoff: 3000 });
      tone(ctx, out, { t, f: midi(PLUCK[s]) * 4, wave: 'sine', dur: 0.08, gain: 0.025, cutoff: 6000 });   // 나무 때리는 느낌의 높은 배음
    }
    if (BASS[s]) tone(ctx, out, { t, f: midi(BASS[s] - 12), wave: 'triangle', dur: e * 14, gain: 0.18, cutoff: 400, attack: e * 4 });
    if (s % 4 === 0) tone(ctx, out, { t, f: 0, dur: 0.03, gain: 0.04 + 0.05 * tension, cutoff: 6000, type: 'highpass' });
    if (tension > 0.55 && (s === 0 || s === 8)) {   // 후반: 심장 소리
      tone(ctx, out, { t, f: 70, wave: 'sine', dur: 0.12, gain: 0.35 * tension, cutoff: 300 });
      tone(ctx, out, { t: t + 0.2, f: 58, wave: 'sine', dur: 0.14, gain: 0.25 * tension, cutoff: 300 });
    }
  }

  return {
    start() { this.stop(0); tension = 0; music = createBus(0.5, 1.5); seq = createSequencer(music.ctx, eighth, onStep); seq.start(); },
    setTension(x) { tension = Math.min(1, Math.max(0, x)); },
    duck(on) { music?.to(on ? 0.15 : 0.5, 0.4); },
    // 블록을 미는 동안: 나무끼리 쓸리는 소리 + 가끔 삐걱
    slideStart(sec, creak) {
      const bus = createBus(0.0001), ctx = bus.ctx, src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx); src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5;
      src.connect(f); f.connect(bus.node); src.start();
      bus.to(0.12, 0.15);
      slide = { bus, src };
      const n = Math.round(1 + creak * 3);
      playVoices(Array.from({ length: n }, (_, i) => ({ at: (i + 0.5) * sec / n, wave: 'sawtooth', f: [[0, 95 + Math.random() * 40], [1, 70]], dur: 0.35, filter: ['bandpass', 600, 6], vib: [17, 8], gain: 0.25 + 0.3 * creak })));
    },
    slideStop() { const s = slide; slide = null; s?.bus.close(0.1, () => { try { s.src.stop(); } catch { /* 이미 멈춤 */ } }); },
    tok(vol = 1) {
      playVoices([{ wave: 'sine', f: [[0, 1100], [1, 600]], dur: 0.07, gain: 0.35 * vol }, { wave: 'noise', dur: 0.03, filter: ['bandpass', 2200, 3], gain: 0.4 * vol }]);
    },
    crash() {
      playVoices([
        { wave: 'sine', f: [[0, 110], [1, 40]], dur: 0.5, gain: 1 },
        ...Array.from({ length: 26 }, (_, i) => ({ at: i * 0.06 + Math.random() * 0.05, wave: 'sine', f: [[0, 700 + Math.random() * 700], [1, 400]], dur: 0.06, gain: 0.45 - i * 0.012 })),
        ...Array.from({ length: 14 }, (_, i) => ({ at: i * 0.11, wave: 'noise', dur: 0.05, filter: ['bandpass', 1800, 2], gain: 0.4 - i * 0.02 })),
      ]);
    },
    stopMusic(fade = 0.1) { seq?.stop(); music?.close(fade); music = null; seq = null; },
    stop(fade = 0.2) { this.stopMusic(fade); this.slideStop(); },
  };
}
