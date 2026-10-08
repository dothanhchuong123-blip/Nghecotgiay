import { isReducedMotion } from '../paper/motion';

/**
 * Pop-up book paper spring simulation.
 * stepSpring(s: {t, v}, target, dt):
 * a = −160·(t − target) − 16·v; v += a·dt; t += v·dt.
 * "Settled" when |t − target| < 5e-4 and |v| < 5e-4; then set t = target exactly.
 * dt is always capped at 1/30 s.
 */

export interface SpringState {
  t: number;
  v: number;
}

export function stepSpring(s: SpringState, target: number, dt: number): boolean {
  if (isReducedMotion()) {
    s.t = target;
    s.v = 0;
    return true;
  }

  const cappedDt = Math.min(dt, 1 / 30);
  const a = -160 * (s.t - target) - 16 * s.v;
  s.v += a * cappedDt;
  s.t += s.v * cappedDt;

  if (Math.abs(s.t - target) < 5e-4 && Math.abs(s.v) < 5e-4) {
    s.t = target;
    s.v = 0;
    return true;
  }

  return false;
}
