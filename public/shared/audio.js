// Web Audio 소리 엔진 (음원 파일 없음). 모든 소리는 voice() 조합으로 만든다.
// voice: { at 시작(초), wave('sine'|'square'|'sawtooth'|'triangle'|'noise'), f 음높이, dur,
//          filter [종류, 주파수, Q], vib [속도, 폭Hz], am [속도, 깊이], gain }
// f·filter 주파수는 숫자 하나 또는 [[0..1 시점, Hz], ...] 곡선.
import { store } from './util.js';

const MUTE_KEY = 'race-muted';
export const audio = { ctx: null, out: null, noise: null, muted: store.get(MUTE_KEY) === '1' };
let muteBtn = null;

// 브라우저는 사용자 클릭 뒤에만 소리를 허용하므로, 클릭 핸들러 안에서 처음 부른다
export function audioCtx() {
  if (!audio.ctx) {
    const ctx = audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    audio.out = ctx.createGain(); audio.out.gain.value = audio.muted ? 0 : 0.8; audio.out.connect(comp);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

const curve = x => typeof x === 'number' ? [[0, x], [1, x]] : x;
function automate(param, pts, t0, dur, mul, droop = 0) {
  pts = curve(pts);
  param.setValueAtTime(pts[0][1] * mul, t0);
  for (const [t, v] of pts.slice(1)) param.exponentialRampToValueAtTime(Math.max(1, v * mul * (1 - droop * t)), t0 + t * dur);
}

// o: { when, dest, vol, pitch, stretch, droop, vib(추가 떨림 Hz), am(강제 떨림) }
export function voice(v, o) {
  const ctx = audio.ctx, dur = v.dur * o.stretch, t0 = o.when + (v.at || 0) * o.stretch, end = t0 + dur + 0.05;
  const lfo = (rate, depth, target) => {
    const l = ctx.createOscillator(), g = ctx.createGain();
    l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(target); l.start(t0); l.stop(end);
  };
  let src;
  if (v.wave === 'noise') {
    if (!audio.noise) {
      audio.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = audio.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    src = ctx.createBufferSource(); src.buffer = audio.noise; src.loop = true;
  } else {
    src = ctx.createOscillator(); src.type = v.wave;
    automate(src.frequency, v.f, t0, dur, o.pitch, o.droop);
    const vib = (v.vib?.[1] || 0) + (o.vib || 0);
    if (vib) lfo(v.vib?.[0] || 6, vib * o.pitch, src.frequency);
  }
  let node = src;
  if (v.filter) {
    const bq = ctx.createBiquadFilter(); bq.type = v.filter[0]; bq.Q.value = v.filter[2] ?? 1;
    automate(bq.frequency, v.filter[1], t0, dur, o.pitch);
    node.connect(bq); node = bq;
  }
  const g = ctx.createGain(), peak = (v.gain ?? 0.5) * o.vol, att = Math.min(0.03, dur * 0.3);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + att);
  g.gain.setValueAtTime(peak, t0 + Math.max(att, dur * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g); node = g;
  const am = o.am || v.am;
  if (am) {
    const a = ctx.createGain(); a.gain.value = 1 - am[1] / 2;
    lfo(am[0], am[1] / 2, a.gain); node.connect(a); node = a;
  }
  node.connect(o.dest);
  src.start(t0); src.stop(end);
}

// 음량·음높이 기본값을 채워 voice를 바로 재생한다. delay: 지금부터 몇 초 뒤
export function playVoices(voices, { vol = 1, dest, delay = 0, ...rest } = {}) {
  if (audio.muted) return;
  const ctx = audioCtx();
  const o = { pitch: 1, stretch: 1, ...rest, vol, dest: dest || audio.out, when: ctx.currentTime + 0.01 + delay };
  for (const v of voices) voice(v, o);
}

export function beep(f) {
  playVoices([{ wave: 'square', f, dur: 0.15, filter: ['lowpass', 2200, 1], gain: 0.25 }]);
}

export function setMuted(m) {
  audio.muted = m; store.set(MUTE_KEY, m ? '1' : '0');
  if (audio.out) audio.out.gain.value = m ? 0 : 0.8;
  if (muteBtn) muteBtn.textContent = m ? '🔇' : '🔊';
}
// 페이지의 🔊 버튼을 소리 켜기/끄기에 연결한다
export function bindMuteButton(btn) {
  muteBtn = btn;
  btn.onclick = () => { audioCtx(); setMuted(!audio.muted); };
  setMuted(audio.muted);
}
