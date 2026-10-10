import { useEffect, useState } from 'react';

type SoundListener = (enabled: boolean) => void;
const listeners = new Set<SoundListener>();

const STORAGE_KEY = 'nghe-cot-giay-sound';

function loadInitialSoundState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

function persistSoundState(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {}
}

let soundEnabled = loadInitialSoundState();
let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let masterFilterNode: BiquadFilterNode | null = null;
let masterCompressorNode: DynamicsCompressorNode | null = null;
let brownNoiseBuffer: AudioBuffer | null = null;

let userGestureOccurred = false;
let activeSoundCount = 0;
const lastPlayTimes: Record<string, number> = {};

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function fadeMasterGain(to: number, durationSec = 0.08): void {
  if (!audioCtx || !masterGainNode) return;
  const now = audioCtx.currentTime;
  try {
    masterGainNode.gain.cancelScheduledValues(now);
    masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, now);
    masterGainNode.gain.linearRampToValueAtTime(to, now + durationSec);
  } catch {}
}

function getAudioContext(allowedByGesture = false): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!userGestureOccurred && !allowedByGesture) return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }

    const isHidden = typeof document !== 'undefined' && document.hidden;
    const initialGain = soundEnabled && !isHidden ? 0.5 : 0;

    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(initialGain, audioCtx.currentTime);

    masterFilterNode = audioCtx.createBiquadFilter();
    masterFilterNode.type = 'lowpass';
    masterFilterNode.frequency.setValueAtTime(6000, audioCtx.currentTime);
    masterFilterNode.Q.setValueAtTime(0.7, audioCtx.currentTime);

    masterCompressorNode = audioCtx.createDynamicsCompressor();
    masterCompressorNode.threshold.setValueAtTime(-24, audioCtx.currentTime);
    masterCompressorNode.ratio.setValueAtTime(4, audioCtx.currentTime);
    masterCompressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
    masterCompressorNode.release.setValueAtTime(0.12, audioCtx.currentTime);

    masterGainNode.connect(masterFilterNode);
    masterFilterNode.connect(masterCompressorNode);
    masterCompressorNode.connect(audioCtx.destination);

    // Pre-render a 2.0-second brown noise buffer once
    const bufferLength = Math.floor(audioCtx.sampleRate * 2.0);
    brownNoiseBuffer = audioCtx.createBuffer(1, bufferLength, audioCtx.sampleRate);
    const data = brownNoiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = Math.max(-1, Math.min(1, last * 3.5));
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

if (typeof window !== 'undefined') {
  const onUserGesture = () => {
    userGestureOccurred = true;
    if (soundEnabled && !audioCtx) {
      const ctx = getAudioContext(true);
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } else if (soundEnabled && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', onUserGesture, { capture: true });
  window.addEventListener('keydown', onUserGesture, { capture: true });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      fadeMasterGain(0, 0.08);
    } else if (soundEnabled) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      fadeMasterGain(0.5, 0.08);
    }
  });
}

function canPlaySound(name: string): boolean {
  if (!soundEnabled) return false;
  if (!userGestureOccurred) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;

  // Reduced motion: skip rustle, whoosh, rip, tape, thump, shutter; keep only snap
  if (isReducedMotion()) {
    if (name !== 'snap') return false;
  }

  const now = performance.now();

  // Rate limiting per sound
  const lastTime = lastPlayTimes[name] || 0;
  const cooldown = name === 'snap' ? 120 : 90;
  if (now - lastTime < cooldown) return false;

  // Ducking: if rustle or rip played in last 300 ms, skip snap
  if (name === 'snap') {
    const lastRustle = lastPlayTimes['rustle'] || 0;
    const lastRip = lastPlayTimes['rip'] || 0;
    if (now - lastRustle < 300 || now - lastRip < 300) {
      return false;
    }
  }

  // Global concurrency limit: at most 4 sounds at once
  if (activeSoundCount >= 4) {
    return false;
  }

  return true;
}

function getVariation(): { pitchVar: number; gainVar: number } {
  return {
    pitchVar: 1 + (Math.random() * 0.16 - 0.08), // ±8%
    gainVar: 1 + (Math.random() * 0.30 - 0.15),   // ±15%
  };
}

function trackSound(
  primarySource: AudioScheduledSourceNode,
  nodesToDisconnect: (AudioNode | null | undefined)[],
  durationSec: number
): void {
  activeSoundCount++;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    activeSoundCount = Math.max(0, activeSoundCount - 1);
    for (const node of nodesToDisconnect) {
      if (node) {
        try {
          node.disconnect();
        } catch {}
      }
    }
  };
  primarySource.onended = cleanup;
  setTimeout(cleanup, Math.round((durationSec + 0.06) * 1000));
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  persistSoundState(enabled);
  if (audioCtx) {
    const isHidden = typeof document !== 'undefined' && document.hidden;
    fadeMasterGain(enabled && !isHidden ? 0.5 : 0, 0.08);
  }
  listeners.forEach((fn) => fn(soundEnabled));
}

export function toggleSound(): boolean {
  userGestureOccurred = true;
  const next = !soundEnabled;
  setSoundEnabled(next);
  if (next) {
    const ctx = getAudioContext(true);
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }
  return next;
}

export function useSound(): boolean {
  const [enabled, setEnabled] = useState(soundEnabled);
  useEffect(() => {
    listeners.add(setEnabled);
    return () => {
      listeners.delete(setEnabled);
    };
  }, []);
  return enabled;
}

/**
 * snap (soft paper tap): 45 to 60 ms.
 * Low sine "thock" at ~220 Hz falling to 140 Hz + tiny brown-noise puff through band-pass at ~1.2 kHz.
 * Attack 4 ms, exponential decay. Peak gain <= 0.12. Half volume on prefers-reduced-motion.
 */
export function snap(): void {
  if (!canPlaySound('snap')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['snap'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const motionMult = isReducedMotion() ? 0.5 : 1.0;
  const totalMult = gainVar * motionMult;

  const duration = 0.052; // 52 ms
  const oscPeak = Math.min(0.075, 0.065 * totalMult);
  const puffPeak = Math.min(0.045, 0.035 * totalMult);

  // 1. Sine thock
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220 * pitchVar, now);
  osc.frequency.exponentialRampToValueAtTime(140 * pitchVar, now + duration);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.linearRampToValueAtTime(oscPeak, now + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(oscGain);
  oscGain.connect(masterGainNode);

  // 2. Tiny brown noise puff
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = brownNoiseBuffer;
  noiseSource.playbackRate.setValueAtTime(pitchVar, now);

  const puffFilter = ctx.createBiquadFilter();
  puffFilter.type = 'bandpass';
  puffFilter.frequency.setValueAtTime(1200 * pitchVar, now);
  puffFilter.Q.setValueAtTime(1.5, now);

  const puffGain = ctx.createGain();
  puffGain.gain.setValueAtTime(0.0001, now);
  puffGain.gain.linearRampToValueAtTime(puffPeak, now + 0.004);
  puffGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noiseSource.connect(puffFilter);
  puffFilter.connect(puffGain);
  puffGain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  noiseSource.start(now, offset, duration);
  osc.start(now);
  osc.stop(now + duration);

  trackSound(osc, [osc, oscGain, noiseSource, puffFilter, puffGain], duration);
}

/**
 * rustle (page turn): 180 to 220 ms.
 * Brown noise through band-pass sweeping 700 Hz to 1.6 kHz.
 * Soft attack (25 ms), slow release, 2-3 amplitude bumps like paper bending. Peak <= 0.10.
 */
export function rustle(): void {
  if (!canPlaySound('rustle')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['rustle'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.200; // 200 ms
  const peak = Math.min(0.10, 0.085 * gainVar);

  const source = ctx.createBufferSource();
  source.buffer = brownNoiseBuffer;
  source.playbackRate.setValueAtTime(pitchVar, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(1.2, now);
  filter.frequency.setValueAtTime(700 * pitchVar, now);
  filter.frequency.exponentialRampToValueAtTime(1600 * pitchVar, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak * 0.75, now + 0.025); // 25 ms soft attack (bump 1)
  gain.gain.linearRampToValueAtTime(peak * 0.45, now + 0.065); // dip
  gain.gain.linearRampToValueAtTime(peak, now + 0.115);        // bump 2
  gain.gain.linearRampToValueAtTime(peak * 0.50, now + 0.155); // dip
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // slow release

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  source.start(now, offset, duration);
  source.stop(now + duration);

  trackSound(source, [source, filter, gain], duration);
}

/**
 * whoosh (bốc thăm / swish): 280 ms.
 * Brown noise through low-pass sweeping 1.4 kHz down to 250 Hz, attack 60 ms, soft tail. Peak <= 0.10.
 */
export function whoosh(): void {
  if (!canPlaySound('whoosh')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['whoosh'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.280; // 280 ms
  const peak = Math.min(0.10, 0.085 * gainVar);

  const source = ctx.createBufferSource();
  source.buffer = brownNoiseBuffer;
  source.playbackRate.setValueAtTime(pitchVar, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400 * pitchVar, now);
  filter.frequency.exponentialRampToValueAtTime(250 * pitchVar, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.060); // 60 ms attack
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // soft tail

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  source.start(now, offset, duration);
  source.stop(now + duration);

  trackSound(source, [source, filter, gain], duration);
}

/**
 * tape: 220 ms.
 * 2-3 quiet short band-pass noise bursts (1 kHz) spaced 40 to 60 ms apart, like tape peeling. Peak <= 0.08.
 */
export function tape(): void {
  if (!canPlaySound('tape')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['tape'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.220; // 220 ms
  const peak = Math.min(0.08, 0.068 * gainVar);

  const source = ctx.createBufferSource();
  source.buffer = brownNoiseBuffer;
  source.playbackRate.setValueAtTime(pitchVar, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000 * pitchVar, now);
  filter.Q.setValueAtTime(1.8, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak * 0.75, now + 0.008); // burst 1
  gain.gain.linearRampToValueAtTime(0.001, now + 0.035);
  gain.gain.setValueAtTime(0.001, now + 0.055);
  gain.gain.linearRampToValueAtTime(peak, now + 0.065);        // burst 2
  gain.gain.linearRampToValueAtTime(0.001, now + 0.100);
  gain.gain.setValueAtTime(0.001, now + 0.125);
  gain.gain.linearRampToValueAtTime(peak * 0.65, now + 0.140); // burst 3
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  source.start(now, offset, duration);
  source.stop(now + duration);

  trackSound(source, [source, filter, gain], duration);
}

/**
 * thump: sine 140 Hz falling to 60 Hz, 180 ms, attack 8 ms. Peak <= 0.18. No sharp edge at the start.
 */
export function thump(): void {
  if (!canPlaySound('thump')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  lastPlayTimes['thump'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.180; // 180 ms
  const peak = Math.min(0.18, 0.155 * gainVar);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140 * pitchVar, now);
  osc.frequency.exponentialRampToValueAtTime(60 * pitchVar, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.008); // 8 ms attack, smooth start
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(masterGainNode);

  osc.start(now);
  osc.stop(now + duration);

  trackSound(osc, [osc, gain], duration);
}

/**
 * shutter (camera): two very short soft clicks (band-pass 900 Hz, 25 ms each) 70 ms apart. Peak <= 0.10.
 */
export function shutter(): void {
  if (!canPlaySound('shutter')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['shutter'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.105; // 105 ms
  const peak = Math.min(0.10, 0.085 * gainVar);

  const source = ctx.createBufferSource();
  source.buffer = brownNoiseBuffer;
  source.playbackRate.setValueAtTime(pitchVar, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(900 * pitchVar, now);
  filter.Q.setValueAtTime(2.0, now);

  const gain = ctx.createGain();
  // Click 1: 0 to 25 ms
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak * 0.85, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
  // Silence between clicks: 70 ms gap
  gain.gain.setValueAtTime(0.0001, now + 0.070);
  // Click 2: 70 to 95 ms
  gain.gain.linearRampToValueAtTime(peak, now + 0.074);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  source.start(now, offset, duration);
  source.stop(now + duration);

  trackSound(source, [source, filter, gain], duration);
}

/**
 * rip (boot / tear): 260 ms.
 * Band-pass noise sweeping 1.8 kHz to 600 Hz with ragged amplitude, 3-4 uneven bumps. Peak <= 0.14.
 */
export function rip(): void {
  if (!canPlaySound('rip')) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode || !brownNoiseBuffer) return;

  const now = ctx.currentTime;
  lastPlayTimes['rip'] = performance.now();

  const { pitchVar, gainVar } = getVariation();
  const duration = 0.260; // 260 ms
  const peak = Math.min(0.14, 0.12 * gainVar);

  const source = ctx.createBufferSource();
  source.buffer = brownNoiseBuffer;
  source.playbackRate.setValueAtTime(pitchVar, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(1.4, now);
  filter.frequency.setValueAtTime(1800 * pitchVar, now);
  filter.frequency.exponentialRampToValueAtTime(600 * pitchVar, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak * 0.65, now + 0.025); // bump 1
  gain.gain.linearRampToValueAtTime(peak * 0.35, now + 0.065); // dip
  gain.gain.linearRampToValueAtTime(peak, now + 0.115);        // bump 2
  gain.gain.linearRampToValueAtTime(peak * 0.40, now + 0.160); // dip
  gain.gain.linearRampToValueAtTime(peak * 0.75, now + 0.205); // bump 3
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);

  const offset = Math.random() * 1.5;
  source.start(now, offset, duration);
  source.stop(now + duration);

  trackSound(source, [source, filter, gain], duration);
}
