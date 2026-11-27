// 스키점프 소리: 신나는 알프스 느낌 중계 음악, 출발 신호, 활강 바람, 착지, 관중, 구르기 (Web Audio 합성)
import { playVoices } from '../../shared/audio.js';
import { midi, noiseBuffer, tone, createBus, createSequencer } from '../../shared/music.js';

// G장조 쿵짝짝(3/4) 왈츠 느낌. 4마디 x 6(8분음표) = 24걸음. 직접 만든 멜로디, 0은 쉼표
const MELODY = [
  79, 0, 83, 0, 86, 0,   81, 0, 84, 0, 88, 86,
  83, 0, 86, 0, 91, 0,   86, 84, 83, 0, 79, 0,
];
const CHORDS = [[43, 67, 71, 74], [38, 66, 69, 72], [43, 67, 71, 74], [38, 66, 72, 74]];   // G, D7, G, D7

export function createSkiAudio() {
  let music = null, seq = null, wind = null, crowd = null;
  const eighth = () => 60 / 168 / 2;

  function onStep(step, t) {
    const s = step % 24, bar = Math.floor(s / 6), beat = s % 6, ctx = music.ctx, out = music.node, e = eighth();
    const [bass, ...chord] = CHORDS[bar];
    if (beat === 0) tone(ctx, out, { t, f: midi(bass), wave: 'triangle', dur: e * 1.8, gain: 0.32, cutoff: 700 });
    if (beat === 2 || beat === 4) for (const n of chord) tone(ctx, out, { t, f: midi(n), wave: 'square', dur: e * 0.7, gain: 0.03, cutoff: 1600 });
    if (MELODY[s]) tone(ctx, out, { t, f: midi(MELODY[s]), wave: 'sawtooth', dur: e * 1.6, gain: 0.07, cutoff: 2400, trem: 6 });   // 아코디언처럼 살짝 떨림
    if (beat % 2 === 0) tone(ctx, out, { t, f: 0, dur: 0.025, gain: 0.05, cutoff: 8000, type: 'highpass' });
  }

  // 반복 소음 + 필터 + 음량 (바람, 관중)
  function loopNoise(type, freq, q, level) {
    const bus = createBus(level, 0.5), ctx = bus.ctx, src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); f.connect(bus.node); src.start();
    return { bus, src, f };
  }
  const closeLoop = (l, fade) => { if (l) l.bus.close(fade, () => { try { l.src.stop(); } catch { /* 이미 멈춤 */ } }); };

  return {
    start() {
      this.stop(0);
      music = createBus(0.28, 1); seq = createSequencer(music.ctx, eighth, onStep); seq.start();
      crowd = loopNoise('bandpass', 1000, 0.8, 0.05);
    },
    // 출발 신호: 삐 삐 삐잉
    gate() {
      playVoices([0, 0.35, 0.7].map((at, i) => ({ at, wave: 'square', f: i === 2 ? 1320 : 880, dur: i === 2 ? 0.35 : 0.12, filter: ['lowpass', 3000, 1], gain: 0.2 })));
    },
    // 활강 바람: speed 0..1 에 따라 커지고 높아진다
    wind(speed) {
      if (!wind) wind = loopNoise('bandpass', 400, 1.2, 0.0001);
      wind.bus.to(0.02 + 0.3 * speed, 0.1); wind.f.frequency.value = 400 + 1600 * speed;
    },
    windOff(fade = 0.6) { closeLoop(wind, fade); wind = null; },
    takeoff() { playVoices([{ wave: 'noise', dur: 0.5, filter: ['bandpass', [[0, 800], [1, 2500]], 1.5], gain: 0.35 }]); },
    // 착지: 탁 + 관중 함성 (amount 0..1: 멀리 날수록 크게)
    land(amount) {
      playVoices([{ wave: 'noise', dur: 0.12, filter: ['lowpass', 700, 1], gain: 0.6 }, { wave: 'sine', f: [[0, 140], [1, 60]], dur: 0.15, gain: 0.5 }]);
      crowd?.bus.to(0.12 + 0.35 * amount, 0.15);
      setTimeout(() => crowd?.bus.to(0.05, 1.5), 900);
    },
    record() { playVoices([[0, 79], [0.1, 83], [0.2, 86], [0.3, 91]].map(([at, n]) => ({ at, wave: 'square', f: midi(n), dur: 0.22, filter: ['lowpass', 3500, 1], gain: 0.15 }))); },
    // 데굴데굴 + 관중 '어어~'
    tumble() {
      playVoices(Array.from({ length: 8 }, (_, i) => ({ at: i * 0.18, wave: 'noise', dur: 0.08, filter: ['lowpass', 500 - i * 30, 1.5], gain: 0.5 - i * 0.04 })));
      crowd?.bus.to(0.2, 0.2); crowd && (crowd.f.frequency.value = 600);
      setTimeout(() => { if (crowd) { crowd.bus.to(0.05, 1.5); crowd.f.frequency.value = 1000; } }, 1500);
    },
    stopMusic(fade = 0.6) { seq?.stop(); music?.close(fade); music = null; seq = null; },
    stop(fade = 0.2) { this.stopMusic(fade); this.windOff(fade); closeLoop(crowd, fade); crowd = null; },
  };
}
