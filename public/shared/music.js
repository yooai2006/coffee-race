// 배경 음악·환경음 도구 (Web Audio 합성). 게임별 음악 파일(bgm.js, sound.js)이 같이 쓴다.
import { audio, audioCtx } from './audio.js';

export const midi = n => 440 * 2 ** ((n - 69) / 12);

// 1초 길이 백색 소음 (반복 재생용). voice()와 같은 버퍼를 쓴다.
export function noiseBuffer(ctx = audioCtx()) {
  if (!audio.noise) {
    audio.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = audio.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return audio.noise;
}

// 음 하나를 시각 t에 예약한다. f가 0이면 소음. attack을 길게 주면 천천히 부푸는 소리, trem은 빠른 떨림(Hz)
export function tone(ctx, dest, { t, f, dur, wave = 'sawtooth', gain = 0.3, cutoff = 1200, q = 1, attack = 0.005, type = 'lowpass', trem = 0 }) {
  const src = f ? ctx.createOscillator() : ctx.createBufferSource();
  if (f) { src.type = wave; src.frequency.value = f; } else { src.buffer = noiseBuffer(ctx); src.loop = true; }
  const filt = ctx.createBiquadFilter(); filt.type = type; filt.frequency.value = cutoff; filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt); filt.connect(g);
  let out = g;
  if (trem) {
    const tg = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    tg.gain.value = 0.5; lfo.frequency.value = trem; depth.gain.value = 0.5;
    lfo.connect(depth); depth.connect(tg.gain); g.connect(tg); out = tg;
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  out.connect(dest);
  src.start(t); src.stop(t + dur + 0.05);
}

// 음량 버스: audio.out(음소거 버튼이 조절하는 출력)으로 나간다. to(값, 초)로 부드럽게 바꾼다
export function createBus(level = 0.5, fadeIn = 0) {
  const ctx = audioCtx(), g = ctx.createGain();
  g.gain.setValueAtTime(fadeIn ? 0.0001 : level, ctx.currentTime);
  if (fadeIn) g.gain.exponentialRampToValueAtTime(level, ctx.currentTime + fadeIn);
  g.connect(audio.out);
  const to = (v, sec) => {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + Math.max(0.02, sec));
  };
  // fade초 동안 줄인 뒤 연결을 끊는다. 끊기 직전에 onEnd를 부른다 (반복 소리 멈추기 등)
  const close = (fade = 0.4, onEnd) => { to(0.0001, fade); setTimeout(() => { onEnd?.(); g.disconnect(); }, (fade + 0.3) * 1000); };
  return { ctx, node: g, to, close };
}

// 박자 반복기: stepDur()초마다 onStep(번호, 시각)을 부른다. 0.2초 앞까지 미리 예약한다 (setInterval은 정확하지 않아서)
export function createSequencer(ctx, stepDur, onStep) {
  let timer = 0, step = 0, nextT = 0;
  return {
    start(delay = 0.1) {
      step = 0; nextT = ctx.currentTime + delay; clearInterval(timer);
      timer = setInterval(() => {
        while (nextT < ctx.currentTime + 0.2) { onStep(step++, nextT); nextT += stepDur(); }
      }, 50);
    },
    stop() { clearInterval(timer); },
  };
}
