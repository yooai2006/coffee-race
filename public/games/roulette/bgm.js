// 러시안 룰렛 배경 음악: Web Audio로 실시간 합성한다 (음원 파일 없음).
// 구성: 낮은 드론 + 단조 베이스 반복 + 째깍 소리 + 긴장할수록 부푸는 불협 현악
//   setTension(0..1): 빨라지고, 현악과 높은 떨림이 커진다
//   duck(true): 방아쇠 직전처럼 음악을 거의 꺼서 심장 소리만 들리게 한다
import { tone, createBus, createSequencer } from '../../shared/music.js';

const A1 = 55, LEVEL = 0.55;
// 8분음표 16개 = 2마디. 반음(Bb) 부딪힘으로 불안하게. 0은 쉼표
const BASS = [1, 0, 1, 1, 16 / 15, 0, 1, 0, 1, 0, 1, 1, 6 / 5, 0, 16 / 15, 0];
const PAD = [4, 4 * 16 / 15, 6];   // A3, Bb3, E4 (A1 배수) — 반음이 부딪히는 화음

export function createBgm() {
  let bus = null, seq = null, drone = [], tension = 0;
  const eighth = () => 60 / (78 + 52 * tension) / 2;

  function onStep(step, t) {
    const s = step % 16, ctx = bus.ctx, out = bus.node, e = eighth();
    if (BASS[s]) tone(ctx, out, { t, f: A1 * BASS[s], dur: e * 1.6, gain: 0.32, cutoff: 260 + 500 * tension, q: 6 });
    if (s % 2 === 0) tone(ctx, out, { t, f: 0, dur: 0.035, gain: s % 4 === 0 ? 0.12 : 0.06, cutoff: 7000, type: 'highpass' });
    if (s === 0) {   // 2마디마다 불협 현악이 천천히 부푼다
      const len = e * 16, g = 0.025 + 0.06 * tension;
      for (const m of PAD) tone(ctx, out, { t, f: A1 * m * (1 + (Math.random() - 0.5) * 0.004), dur: len, gain: g, cutoff: 700 + 900 * tension, attack: len * 0.6 });
      if (tension > 0.5) tone(ctx, out, { t, f: A1 * 32, wave: 'sine', dur: len, gain: 0.02 * tension, cutoff: 5000, attack: len * 0.7, trem: 11 });
    }
  }

  function start() {
    stop(0);
    tension = 0;
    bus = createBus(LEVEL, 2.5);
    const ctx = bus.ctx;
    // 드론: 살짝 다른 높이의 저음 둘이 맥놀이를 만들고, 필터가 천천히 열렸다 닫힌다
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; lp.Q.value = 3;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12; lfoGain.gain.value = 90; lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    const dg = ctx.createGain(); dg.gain.value = 0.22; lp.connect(dg); dg.connect(bus.node);
    drone = [lfo];
    for (const f of [A1, A1 * 1.007, A1 / 2]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); drone.push(o); }
    drone.forEach(o => o.start());
    seq = createSequencer(ctx, eighth, onStep); seq.start();
  }

  // fade 초 동안 줄이고 멈춘다 (0이면 바로)
  function stop(fade = 0.4) {
    if (!bus) return;
    seq.stop();
    const d = drone;
    bus.close(fade, () => d.forEach(o => { try { o.stop(); } catch { /* 이미 멈춤 */ } }));
    bus = null;
  }

  const setTension = x => { tension = Math.min(1, Math.max(0, x)); };
  const duck = on => bus?.to(on ? 0.04 : LEVEL, on ? 0.6 : 0.4);

  return { start, stop, setTension, duck };
}
