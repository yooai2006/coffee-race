// 러시안 룰렛 배경 음악: Web Audio로 실시간 합성한다 (음원 파일 없음).
// 구성: 낮은 드론 + 단조 베이스 반복 + 째깍 소리 + 긴장할수록 부푸는 불협 현악
//   setTension(0..1): 빨라지고, 현악과 높은 떨림이 커진다
//   duck(true): 방아쇠 직전처럼 음악을 거의 꺼서 심장 소리만 들리게 한다
// 소리는 audio.out(음소거 버튼이 조절하는 출력)으로 나가므로 음소거가 그대로 적용된다.
import { audio, audioCtx } from '../../shared/audio.js';

const A1 = 55;
// 8분음표 16개 = 2마디. 반음(Bb) 부딪힘으로 불안하게. 0은 쉼표
const BASS = [1, 0, 1, 1, 16 / 15, 0, 1, 0, 1, 0, 1, 1, 6 / 5, 0, 16 / 15, 0];
const PAD = [4, 4 * 16 / 15, 6];   // A3, Bb3, E4 (A1 배수) — 반음이 부딪히는 화음

export function createBgm() {
  let ctx = null, bus = null, drone = [], timer = 0, step = 0, nextT = 0, tension = 0, running = false;

  // 짧은 음 하나: 바로 켜지고 dur 동안 줄어든다. attack을 길게 주면 부풀어 오르는 소리가 된다
  function note({ t, f, dur, wave = 'sawtooth', gain = 0.3, cutoff = 1200, q = 1, attack = 0.005, type = 'lowpass', trem = 0 }) {
    const src = f ? ctx.createOscillator() : ctx.createBufferSource();
    if (f) { src.type = wave; src.frequency.value = f; } else { src.buffer = noiseBuffer(); src.loop = true; }
    const filt = ctx.createBiquadFilter(); filt.type = type; filt.frequency.value = cutoff; filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g);
    let out = g;
    if (trem) {   // 빠른 떨림 (현악기 트레몰로)
      const tg = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      tg.gain.value = 0.5; lfo.frequency.value = trem; depth.gain.value = 0.5;
      lfo.connect(depth); depth.connect(tg.gain); g.connect(tg); out = tg;
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    out.connect(bus);
    src.start(t); src.stop(t + dur + 0.05);
  }
  function noiseBuffer() {
    if (!audio.noise) {
      audio.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = audio.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return audio.noise;
  }

  // 0.2초 앞까지 미리 예약한다 (setInterval은 정확하지 않아서)
  function schedule() {
    const bpm = 78 + 52 * tension, eighth = 60 / bpm / 2;
    while (nextT < ctx.currentTime + 0.2) {
      const s = step % 16, t = nextT;
      if (BASS[s]) note({ t, f: A1 * BASS[s], dur: eighth * 1.6, gain: 0.32, cutoff: 260 + 500 * tension, q: 6 });
      if (s % 2 === 0) note({ t, f: 0, dur: 0.035, gain: s % 4 === 0 ? 0.12 : 0.06, cutoff: 7000, type: 'highpass' });
      if (s === 0) {   // 2마디마다 불협 현악이 천천히 부푼다
        const len = eighth * 16, g = 0.025 + 0.06 * tension;
        for (const m of PAD) note({ t, f: A1 * m * (1 + (Math.random() - 0.5) * 0.004), dur: len, gain: g, cutoff: 700 + 900 * tension, attack: len * 0.6 });
        if (tension > 0.5) note({ t, f: A1 * 32, wave: 'sine', dur: len, gain: 0.02 * tension, cutoff: 5000, attack: len * 0.7, trem: 11 });
      }
      step++; nextT += eighth;
    }
  }

  function start() {
    stop(0);
    ctx = audioCtx(); running = true; tension = 0; step = 0;
    bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 2.5);
    bus.connect(audio.out);
    // 드론: 살짝 다른 높이의 저음 둘이 맥놀이를 만들고, 필터가 천천히 열렸다 닫힌다
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; lp.Q.value = 3;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12; lfoGain.gain.value = 90; lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    const dg = ctx.createGain(); dg.gain.value = 0.22; lp.connect(dg); dg.connect(bus);
    drone = [lfo];
    for (const f of [A1, A1 * 1.007, A1 / 2]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); drone.push(o); }
    drone.forEach(o => o.start());
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 50);
  }

  // fade 초 동안 줄이고 멈춘다 (0이면 바로)
  function stop(fade = 0.4) {
    if (!running) return;
    running = false; clearInterval(timer);
    const t = ctx.currentTime, b = bus, d = drone;
    b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), t);
    b.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, fade));
    setTimeout(() => { d.forEach(o => { try { o.stop(); } catch { /* 이미 멈춤 */ } }); b.disconnect(); }, (fade + 0.3) * 1000);
  }

  function setTension(x) { tension = Math.min(1, Math.max(0, x)); }

  function duck(on) {
    if (!running) return;
    const t = ctx.currentTime;
    bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    bus.gain.exponentialRampToValueAtTime(on ? 0.04 : 0.55, t + (on ? 0.6 : 0.4));
  }

  return { start, stop, setTension, duck };
}
