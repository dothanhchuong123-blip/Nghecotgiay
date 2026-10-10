import { useEffect, useState } from 'react';

const CHOICE_KEY = 'nghe-giay-reduced';
const CHOICE_EVENT = 'nghe-reduced-change';

/** The visitor's own "Giảm chuyển động" choice from the top bar, kept on this device. */
export function reducedChoice(): boolean {
  try {
    return window.localStorage.getItem(CHOICE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Turns reduced motion on or off for the whole app (on top of the device setting). */
export function setReducedChoice(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(CHOICE_KEY, '1');
    else window.localStorage.removeItem(CHOICE_KEY);
  } catch {
    /* storage blocked: the choice lasts until the page reloads */
  }
  memoryChoice = on;
  isReducedMotion();
  window.dispatchEvent(new Event(CHOICE_EVENT));
}

let memoryChoice: boolean | null = null;

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParam = new URLSearchParams(window.location.search).get('reduced');
  const isReduced =
    urlParam === '1' ||
    (memoryChoice ?? reducedChoice()) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document !== 'undefined') {
    if (isReduced) {
      document.documentElement.dataset.reduced = '1';
    } else {
      delete document.documentElement.dataset.reduced;
    }
  }
  return isReduced;
}

if (typeof window !== 'undefined') {
  isReducedMotion();
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => isReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const active = isReducedMotion();
      setReduced(active);
    };

    mediaQuery.addEventListener('change', update);
    window.addEventListener(CHOICE_EVENT, update);
    return () => {
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener(CHOICE_EVENT, update);
    };
  }, []);

  return reduced;
}

export function useStepped(fps: number = 12): number {
  const [frame, setFrame] = useState<number>(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || fps <= 0) return;
    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 1000000);
    }, interval);

    return () => clearInterval(timer);
  }, [fps, reduced]);

  return reduced ? 0 : frame;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface JitterOffset {
  dx: number;
  dy: number;
  rot: number;
}

export function jitter(frame: number, seed: number = 0): JitterOffset {
  if (frame === 0) {
    return { dx: 0, dy: 0, rot: 0 };
  }
  const combinedSeed = ((seed * 1000003) ^ (frame * 2654435761)) >>> 0;
  const rng = mulberry32(combinedSeed);

  // dx and dy within ±1px
  const dx = rng() * 2 - 1;
  const dy = rng() * 2 - 1;
  // rot within ±0.6deg
  const rot = rng() * 1.2 - 0.6;

  return {
    dx: Number(dx.toFixed(2)),
    dy: Number(dy.toFixed(2)),
    rot: Number(rot.toFixed(2)),
  };
}
