// 폭탄 돌리기 소리 (Web Audio 합성)
//   start()          음악 + 심지 타는 소리 시작
//   setProgress(p)   0..1 (10초 중 지난 비율). 음악이 빨라지고, 높아지고, 커진다. 0.65부터 상승음이 솟구친다
//   boom()           펑! 음악과 심지 소리를 뚝 끊는다
//   toss() / catch_() / second(n)  던지는 휙, 받는 탁, 남은 초 삐
import { playVoices } from '../../shared/audio.js';
import { midi, noiseBuffer, tone, createBus, createSequencer } from '../../shared/music.js';

// 단조(E) 베이스 반복, 8분음표 8개 = 1마디
const BASS = [40, 40, 52, 40, 43, 40, 50, 40];
const STAB = [[64, 67, 71], [62, 65, 69], [64, 67, 71], [63, 66, 70]];   // 마디마다 바뀌는 짧은 화음 (Em, Dm, Em, Ebm)

export function createBombAudio() {
  let music = null, seq = null, hiss = null, riser = null, p = 0;
  // 템포 96 → 210, 화음은 진행할수록 반음씩 올라간다
  const eighth = () => 60 / (96 + 114 * p ** 1.2) / 2;
  const lift = () => Math.floor(p * 4);

  function onStep(step, t) {
    const s = step % 8, bar = Math.floor(step / 8), ctx = music.ctx, out = music.node, e = eighth(), up = lift();
    tone(ctx, out, { t, f: midi(BASS[s] + up), dur: e * 1.3, gain: 0.34, cutoff: 520 + 1300 * p, q: 5 });
    tone(ctx, out, { t, f: 0, dur: 0.03, gain: s % 2 ? 0.05 : 0.1, cutoff: 7000, type: 'highpass' });       // 째깍
    if (s === 0 || (p > 0.5 && s === 4)) tone(ctx, out, { t, f: 55, wave: 'sine', dur: 0.2, gain: 0.4, cutoff: 300 });   // 큰북
    if (p > 0.3 && s % 2 === 1) tone(ctx, out, { t, f: 0, dur: 0.07, gain: 0.06 + 0.06 * p, cutoff: 1900, type: 'bandpass', q: 0.9 });   // 스네어
    if (p > 0.25 && (s === 0 || s === 3 || (p > 0.6 && s === 6)))
      for (const n of STAB[bar % 4]) tone(ctx, out, { t, f: midi(n + up), wave: 'square', dur: e * 0.8, gain: 0.03 + 0.04 * p, cutoff: 2200 });
    if (p > 0.75) tone(ctx, out, { t, f: midi(88 + up + (s % 2) * 3), wave: 'square', dur: e * 0.5, gain: 0.035, cutoff: 4000 });   // 다급한 높은 음
  }

  // 심지: 소음을 높은 대역으로 걸러 '치이익', 빠르게 떨려 탁탁 튀는 느낌
  function startHiss() {
    const ctx = music.ctx, src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5500; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.06;
    const crackle = ctx.createOscillator(), depth = ctx.createGain(); crackle.frequency.value = 23; depth.gain.value = 0.04;
    crackle.connect(depth); depth.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(music.node); src.start(); crackle.start();
    hiss = { src, crackle, g };
  }
  // 상승음: 남은 시간 동안 낮은 음에서 높은 음으로 솟구친다
  function startRiser(sec) {
    const ctx = music.ctx, t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1800, t + sec);
    o2.frequency.setValueAtTime(182, t); o2.frequency.exponentialRampToValueAtTime(1830, t + sec);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(6000, t + sec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + sec);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(music.node); o.start(); o2.start();
    riser = [o, o2];
  }
  function stopSources() {
    const list = [...(riser || []), ...(hiss ? [hiss.src, hiss.crackle] : [])];
    riser = null; hiss = null;
    return () => list.forEach(o => { try { o.stop(); } catch { /* 이미 멈춤 */ } });
  }

  return {
    start() {
      this.stop(0);
      p = 0; music = createBus(0.6, 0.4);
      seq = createSequencer(music.ctx, eighth, onStep); seq.start(0.05);
      startHiss();
    },
    setProgress(x, secLeft) {
      p = Math.min(1, Math.max(0, x));
      if (hiss) hiss.g.gain.value = 0.06 + 0.1 * p;
      if (music && !riser && p >= 0.65) startRiser(secLeft);
    },
    boom() {
      seq?.stop(); music?.close(0.03, stopSources()); music = null; seq = null;
      playVoices([
        { wave: 'noise', dur: 1.2, filter: ['lowpass', [[0, 8000], [0.15, 1800], [1, 150]], 0.7], gain: 1.8 },
        { wave: 'sine', f: [[0, 120], [1, 30]], dur: 0.9, gain: 1.5 },
        { at: 0.04, wave: 'noise', dur: 0.5, filter: ['highpass', 3000, 0.7], gain: 0.4 },
      ]);
    },
    stop(fade = 0.2) { seq?.stop(); music?.close(fade, stopSources()); music = null; seq = null; },
    toss() { playVoices([{ wave: 'noise', dur: 0.22, filter: ['bandpass', [[0, 600], [1, 2200]], 1.5], gain: 0.25 }]); },
    catch_() { playVoices([{ wave: 'sine', f: [[0, 220], [1, 90]], dur: 0.09, gain: 0.35 }, { wave: 'noise', dur: 0.04, filter: ['lowpass', 900, 1], gain: 0.3 }]); },
    second(n) {
      const urgent = n <= 3;
      playVoices([{ wave: 'square', f: urgent ? 1320 : 990, dur: urgent ? 0.16 : 0.07, filter: ['lowpass', 3500, 1], gain: urgent ? 0.3 : 0.12 }]);
    },
  };
}
