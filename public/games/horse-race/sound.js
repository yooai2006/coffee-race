// 동물 레이스 소리: 출발 총, 신나는 경주 음악, 다그닥 발소리, 관중 함성, 1위 종소리 (Web Audio 합성)
//   crowd()       카운트다운 동안 관중이 웅성거린다
//   go()          탕! 출발 + 음악 시작
//   setExcite(x)  0..1 선두의 진행률. 음악이 빨라지고 함성이 커진다
//   firstIn()     1위 골인: 종소리 + 환호
//   end()         모두 골인: 음악을 멈춘다 (그다음 꼴찌 울음이 나온다)
//   stop()        설정 화면으로 돌아갈 때 모두 끈다
import { playVoices } from '../../shared/audio.js';
import { midi, noiseBuffer, tone, createBus, createSequencer } from '../../shared/music.js';

// 8분음표 32개 = 4마디 (C - F - G - C). 0은 쉼표. 직접 만든 아르페지오 멜로디
const MELODY = [
  72, 0, 76, 79, 84, 0, 79, 76,
  77, 0, 81, 84, 81, 0, 77, 72,
  74, 0, 79, 83, 86, 84, 83, 79,
  84, 0, 79, 0, 72, 0, 76, 79,
];
const CHORDS = [[48, 64, 67, 72], [41, 65, 69, 72], [43, 62, 67, 71], [48, 64, 67, 72]];   // [베이스, 화음 3음]

export function createRaceAudio() {
  let music = null, seq = null, crowdBus = null, crowdSrc = null, crowdFilter = null, excite = 0;
  const eighth = () => 60 / (152 + 28 * excite) / 2;

  function onStep(step, t) {
    const s = step % 32, bar = Math.floor(s / 8), beat = s % 8, ctx = music.ctx, out = music.node, e = eighth();
    const [bass, ...chord] = CHORDS[bar];
    // 쿵짝: 정박에 베이스(근음/5음 번갈아), 엇박에 화음
    if (beat % 2 === 0) tone(ctx, out, { t, f: midi(beat % 4 === 0 ? bass : bass + 7), wave: 'triangle', dur: e * 1.4, gain: 0.32, cutoff: 900 });
    else for (const n of chord) tone(ctx, out, { t, f: midi(n), wave: 'square', dur: e * 0.7, gain: 0.035, cutoff: 1800 });
    if (MELODY[s]) tone(ctx, out, { t, f: midi(MELODY[s]), wave: 'square', dur: e * 0.9, gain: 0.07 + 0.03 * excite, cutoff: 3200 });
    // 북: 엇박에 스네어, 마디 첫 박에 큰북
    if (beat % 2 === 1) tone(ctx, out, { t, f: 0, dur: 0.08, gain: 0.09, cutoff: 1800, type: 'bandpass', q: 0.8 });
    if (beat === 0) tone(ctx, out, { t, f: 60, wave: 'sine', dur: 0.18, gain: 0.35, cutoff: 400 });
    // 다그닥 발소리 (한 박에 세 번)
    if (beat % 2 === 0) for (const [k, g] of [[0, 0.16], [0.33, 0.1], [0.66, 0.13]])
      tone(ctx, out, { t: t + k * e * 2, f: 0, dur: 0.05, gain: g * (0.6 + 0.6 * excite), cutoff: 420, q: 2 });
  }

  // 관중: 반복 소음을 사람 목소리 대역으로 걸러 웅성거림을 만든다
  function crowd() {
    stop();
    crowdBus = createBus(0.1, 1.2);
    const ctx = crowdBus.ctx;
    crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuffer(ctx); crowdSrc.loop = true;
    crowdFilter = ctx.createBiquadFilter(); crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 900; crowdFilter.Q.value = 0.9;
    const wobble = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    wobble.gain.value = 0.7; lfo.frequency.value = 0.7; depth.gain.value = 0.3; lfo.connect(depth); depth.connect(wobble.gain);
    crowdSrc.connect(crowdFilter); crowdFilter.connect(wobble); wobble.connect(crowdBus.node);
    crowdSrc.start(); lfo.start();
    crowdSrc.userData = { lfo };
  }

  function go() {
    // 탕!
    playVoices([
      { wave: 'noise', dur: 0.35, filter: ['lowpass', [[0, 7000], [0.3, 1200], [1, 300]], 0.7], gain: 1.3 },
      { wave: 'sine', f: [[0, 160], [1, 45]], dur: 0.3, gain: 0.9 },
    ]);
    crowdBus?.to(0.35, 0.3);
    setTimeout(() => crowdBus?.to(0.16, 1.5), 600);
    music = createBus(0.5, 0.3);
    seq = createSequencer(music.ctx, eighth, onStep); seq.start(0.15);
  }

  function setExcite(x) {
    excite = Math.min(1, Math.max(0, x));
    // 결승이 가까울수록 함성이 커지고 목소리가 높아진다
    if (crowdBus) { crowdBus.to(0.14 + 0.4 * excite ** 2, 0.3); crowdFilter.frequency.value = 900 + 700 * excite; }
  }

  function firstIn() {
    playVoices([0, 0.18, 0.36].map(at => ({ at, wave: 'sine', f: 1568, dur: 0.6, gain: 0.35 }))
      .concat([0, 0.18, 0.36].map(at => ({ at, wave: 'sine', f: 3136, dur: 0.3, gain: 0.12 }))));
    crowdBus?.to(0.7, 0.2);
  }

  function end() {
    seq?.stop(); music?.close(0.3); music = null; seq = null;
    crowdBus?.to(0.06, 1.2);
  }

  function stop() {
    seq?.stop(); music?.close(0.2); music = null; seq = null;
    if (crowdBus) {
      const src = crowdSrc;
      crowdBus.close(0.3, () => { try { src.stop(); src.userData.lfo.stop(); } catch { /* 이미 멈춤 */ } });
      crowdBus = null;
    }
    excite = 0;
  }

  return { crowd, go, setExcite, firstIn, end, stop };
}
