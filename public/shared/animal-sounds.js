// 동물 울음소리. 이름은 animals.js의 ANIMALS[].name과 같아야 한다.
// 울음소리 하나 = voice 여러 개 (형식은 audio.js 맨 위 설명 참고)
import { audio, audioCtx, voice } from './audio.js';

const rep = (ats, v) => ats.map(at => ({ ...v, at }));
export const CALLS = {
  '쥐': rep([0, 0.12, 0.24], { wave: 'sine', f: [[0, 2800], [0.5, 3600], [1, 3000]], dur: 0.08, gain: 0.25 }),
  '소': [{ wave: 'sawtooth', f: [[0, 120], [0.2, 135], [1, 100]], dur: 1.1, filter: ['lowpass', [[0, 250], [0.35, 900], [1, 300]], 3], gain: 0.7 }],
  '호랑이': [
    { wave: 'sawtooth', f: [[0, 90], [0.3, 125], [1, 70]], dur: 1.0, filter: ['lowpass', [[0, 300], [0.3, 1300], [1, 200]], 2], am: [32, 0.5], gain: 0.8 },
    { wave: 'noise', dur: 0.9, filter: ['lowpass', 600, 1], gain: 0.35 }],
  '토끼': rep([0, 0.11], { wave: 'sine', f: [[0, 1500], [1, 2300]], dur: 0.07, gain: 0.25 }),
  '용': [
    { wave: 'sawtooth', f: [[0, 60], [0.3, 95], [1, 45]], dur: 1.5, filter: ['lowpass', [[0, 250], [0.3, 1100], [1, 150]], 3], am: [26, 0.6], gain: 0.9 },
    { wave: 'noise', dur: 1.4, filter: ['bandpass', [[0, 400], [0.3, 1500], [1, 300]], 0.8], gain: 0.45 }],
  '뱀': [{ wave: 'noise', dur: 1.0, filter: ['highpass', 3500, 0.7], gain: 0.3 }],
  '말': [{ wave: 'sawtooth', f: [[0, 700], [0.15, 1050], [1, 420]], dur: 1.0, filter: ['bandpass', 1500, 1.2], vib: [18, 70], gain: 0.5 }],
  '양': [{ wave: 'sawtooth', f: [[0, 330], [1, 290]], dur: 0.8, filter: ['bandpass', 1100, 2], vib: [9, 12], am: [9, 0.6], gain: 0.6 }],
  '원숭이': [
    ...rep([0, 0.15, 0.3], { wave: 'sawtooth', f: [[0, 300], [1, 520]], dur: 0.12, filter: ['bandpass', 1000, 2], gain: 0.5 }),
    { at: 0.48, wave: 'sawtooth', f: [[0, 600], [1, 950]], dur: 0.3, filter: ['bandpass', 1400, 2], gain: 0.55 }],
  '닭': [
    { wave: 'sawtooth', f: [[0, 500], [1, 560]], dur: 0.14, filter: ['bandpass', 1500, 2], gain: 0.5 },
    { at: 0.2, wave: 'sawtooth', f: [[0, 620], [1, 660]], dur: 0.14, filter: ['bandpass', 1600, 2], gain: 0.5 },
    { at: 0.42, wave: 'sawtooth', f: [[0, 700], [0.3, 950], [1, 620]], dur: 0.75, filter: ['bandpass', 1700, 2], vib: [7, 15], gain: 0.55 }],
  '개': [0, 0.22].flatMap(at => [
    { at, wave: 'square', f: [[0, 450], [1, 260]], dur: 0.14, filter: ['lowpass', [[0, 2500], [1, 700]], 1], gain: 0.5 },
    { at, wave: 'noise', dur: 0.07, filter: ['bandpass', 1300, 1.5], gain: 0.35 }]),
  '돼지': rep([0, 0.22], { wave: 'square', f: [[0, 180], [0.3, 270], [1, 150]], dur: 0.17, filter: ['bandpass', 900, 3], gain: 0.6 }),
  '아르마딜로': rep([0, 0.11, 0.22], { wave: 'noise', dur: 0.08, filter: ['bandpass', 420, 4], gain: 0.7 }),
  '펭귄': rep([0, 0.32], { wave: 'square', f: [[0, 360], [1, 320]], dur: 0.26, filter: ['bandpass', 900, 2], am: [24, 0.7], gain: 0.5 }),
  '카피바라': rep([0, 0.14, 0.28], { wave: 'sine', f: [[0, 900], [1, 1300]], dur: 0.1, gain: 0.3 }),
  '기린': [
    { wave: 'sine', f: [[0, 95], [1, 85]], dur: 1.1, am: [4, 0.5], gain: 0.7 },
    { wave: 'triangle', f: [[0, 190], [1, 170]], dur: 1.1, gain: 0.25 }],
  '고양이': [{ wave: 'sawtooth', f: [[0, 520], [0.3, 760], [1, 440]], dur: 0.6, filter: ['bandpass', [[0, 700], [0.4, 1900], [1, 600]], 4], vib: [6, 8], gain: 0.6 }],
  '우사인 볼트': rep([0, 0.25], { wave: 'sawtooth', f: [[0, 230], [1, 180]], dur: 0.18, filter: ['bandpass', 750, 3], gain: 0.6 }),
};
const callLength = name => Math.max(...CALLS[name].map(v => (v.at || 0) + v.dur));
// 음량 보정: 오프라인 렌더링으로 잰 최대 음량을 약 0.5로 맞춘 배율 (높은 찍찍 소리는 귀에 크게 들려 조금 덜 올림)
const CALL_LEVEL = {
  '개': 0.75, '고양이': 2, '기린': 0.55, '닭': 1.6, '돼지': 1.6, '말': 1.3, '뱀': 0.95, '소': 0.56, '아르마딜로': 5,
  '양': 1.45, '용': 0.4, '우사인 볼트': 2, '원숭이': 1.6, '쥐': 1.3, '카피바라': 1.5, '토끼': 1.5, '펭귄': 1.65, '호랑이': 0.5,
};

// 경주 중 울음: 매번 음높이를 조금씩 바꿔 덜 기계적으로. sad: 낮고 느리고 축 처지며 흐느끼는 버전
// pan: -1(왼쪽) ~ 1(오른쪽) 스테레오 위치
export function playCall(name, { vol = 1, pan = 0, sad = false, delay = 0 } = {}) {
  if (audio.muted || !CALLS[name]) return;
  const ctx = audioCtx();
  let dest = audio.out;
  if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(audio.out); dest = p; }
  const o = sad ? { pitch: 0.78, stretch: 1.9, droop: 0.3, vib: 10, am: [5, 0.6] } : { pitch: 0.94 + Math.random() * 0.12, stretch: 1 };
  Object.assign(o, { vol: vol * (CALL_LEVEL[name] ?? 1), dest, when: ctx.currentTime + 0.02 + delay });
  for (const v of CALLS[name]) voice(v, o);
}

// 꼴찌 동물이 두 번 슬프게 운 뒤, 빠밤빠밤~ 처지는 트롬본
export function playLoserCry(name) {
  if (audio.muted) return;
  const len = callLength(name) * 1.9;
  playCall(name, { sad: true });
  playCall(name, { sad: true, vol: 0.85, delay: len + 0.15 });
  const t = 2 * len + 0.5, o = { vol: 0.9, dest: audio.out, pitch: 1, stretch: 1, when: audioCtx().currentTime + t };
  [[294, 0, 0.42], [277, 0.45, 0.42], [262, 0.9, 0.42], [247, 1.35, 1.4]].forEach(([f, at, dur], i) =>
    voice({ at, wave: 'sawtooth', f: i < 3 ? f : [[0, f], [1, f * 0.97]], dur, filter: ['lowpass', 1300, 1], vib: i === 3 ? [5, 7] : undefined, gain: 0.45 }, o));
}
