import { useEffect, useState } from 'react';

type SoundListener = (enabled: boolean) => void;
const listeners = new Set<SoundListener>();

let soundEnabled = false;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  listeners.forEach((fn) => fn(soundEnabled));
}

export function toggleSound(): boolean {
  const next = !soundEnabled;
  setSoundEnabled(next);
  if (next) {
    getAudioContext();
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
 * 120 ms of filtered white noise, band-pass 2–5 kHz, quick fade.
 */
export function rustle(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const duration = 0.12;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3500; // Center frequency of 2–5 kHz range
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * A 30 ms click for snapping paper pieces, stickers, flaps, tabs.
 */
export function snap(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const duration = 0.03;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * 250 ms noise with a falling low-pass for fortune teller / bốc thăm.
 */
export function whoosh(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const duration = 0.25;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const now = ctx.currentTime;
  filter.frequency.setValueAtTime(3600, now);
  filter.frequency.exponentialRampToValueAtTime(220, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

function noiseBurst(
  duration: number,
  shape: (i: number, n: number) => number,
  filterType: BiquadFilterType,
  f0: number,
  f1: number,
  vol: number,
): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  if (bufferSize <= 0) return;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * shape(i, bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  const now = ctx.currentTime;
  filter.frequency.setValueAtTime(f0, now);
  filter.frequency.exponentialRampToValueAtTime(f1, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

export function tape(): void {
  noiseBurst(
    0.3,
    (i, n) => (0.6 + 0.4 * Math.sin(i / 40)) * (1 - i / n),
    'highpass',
    3000,
    1500,
    0.25,
  );
}

export function thump(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function shutter(): void {
  noiseBurst(
    0.55,
    (i, n) => (Math.sin(i / 90) > 0.3 ? 1 : 0.25) * (1 - (0.7 * i) / n),
    'bandpass',
    900,
    500,
    0.45,
  );
}

export function rip(): void {
  noiseBurst(
    0.42,
    (i, n) => (Math.sin(i / 180) > -0.2 ? 1 : 0.15) * (1 - i / n),
    'bandpass',
    2400,
    900,
    0.5,
  );
}

