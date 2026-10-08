import { stepSpring } from '../engine/spring';
import { isReducedMotion } from '../paper/motion';
import { RegisteredStand } from '../paper/Stand';

export interface BookMotionOptions {
  sceneEl?: HTMLElement | null;
}

// Global list of registered stands on the open spread
let stands: RegisteredStand[] = [];

let sceneElement: HTMLElement | null = null;
let spreadAge = 0;
let lastTime = 0;
let isLoopRunning = false;

// Turn animation state
export interface ActiveTurn {
  dir: number; // +1 or -1
  leaf: HTMLElement;
  dest: HTMLElement;
  underPage: HTMLElement;
  backPage: HTMLElement;
  underShade: HTMLElement | null;
  destShade: HTMLElement | null;
  leavingStands: RegisteredStand[];
  stayStands: RegisteredStand[];
  underStands: RegisteredStand[];
  backStands: RegisteredStand[];
  turnAge: number;
  onLand: () => void;
}

let activeTurn: ActiveTurn | null = null;

type MotionTickListener = (t: number, dt: number) => void;
const motionTickListeners = new Set<MotionTickListener>();

export function onBookMotionTick(listener: MotionTickListener): () => void {
  motionTickListeners.add(listener);
  return () => {
    motionTickListeners.delete(listener);
  };
}

export function isTurnRunning(): boolean {
  return activeTurn !== null;
}

export function startTurnMotion(turn: ActiveTurn): void {
  activeTurn = turn;
  ensureLoop();
}

export function setOpenSpreadStands(newStands: RegisteredStand[]): void {
  stands = [...newStands];
  spreadAge = 0;
  ensureLoop();
}

export function getOpenSpreadStands(): RegisteredStand[] {
  return [...stands];
}

// Camera tracking state
let pointerTargetX = 0; // -1 .. 1
let currentCameraPct = 50; // starts at 50%
let isUsingOrientation = false;
let hasPermission = false;

function smooth(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

function ease(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Register a stand with BookMotion. Returns an unregister function.
 */
export function registerStand(stand: RegisteredStand): () => void {
  const reduced = isReducedMotion();

  if (reduced) {
    stand.t = stand.rest;
    stand.v = 0;
    stand.settled = true;
    stand.element.style.setProperty('--up', stand.rest.toFixed(4));
    if (stand.cast) {
      stand.cast.style.setProperty(
        '--up',
        Math.max(0, Math.min(1, stand.rest)).toFixed(4)
      );
    }
  } else {
    stand.t = 0;
    stand.v = 0;
    stand.settled = false;
    stand.age = 0;
    stand.element.style.setProperty('--up', '0.0000');
    if (stand.cast) {
      stand.cast.style.setProperty('--up', '0.0000');
    }
  }

  stands.push(stand);
  ensureLoop();

  return () => {
    const idx = stands.indexOf(stand);
    if (idx !== -1) {
      stands.splice(idx, 1);
    }
  };
}

/**
 * Replays the opening of the current spread (resetting t = 0 for all stands).
 */
export function replaySpread(): void {
  spreadAge = 0;
  const reduced = isReducedMotion();

  stands.forEach((stand) => {
    stand.age = 0;
    stand.settled = false;

    if (reduced) {
      stand.t = stand.rest;
      stand.v = 0;
      stand.settled = true;
      stand.element.style.setProperty('--up', stand.rest.toFixed(4));
      if (stand.cast) {
        stand.cast.style.setProperty(
          '--up',
          Math.max(0, Math.min(1, stand.rest)).toFixed(4)
        );
      }
    } else {
      stand.t = 0;
      stand.v = 0;
      stand.element.style.setProperty('--up', '0.0000');
      if (stand.cast) {
        stand.cast.style.setProperty('--up', '0.0000');
      }
    }
  });

  ensureLoop();
}

/**
 * Attach the .scene element to control perspective-origin.
 */
export function attachScene(el: HTMLElement | null): void {
  sceneElement = el;
}

/**
 * Checks if iOS DeviceOrientationEvent permission request is needed.
 */
export function isTiltPermissionNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
    typeof (window.DeviceOrientationEvent as any).requestPermission ===
      'function' &&
    !hasPermission
  );
}

/**
 * Requests iOS DeviceOrientation permission.
 */
export async function requestTiltPermission(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
    typeof (window.DeviceOrientationEvent as any).requestPermission ===
      'function'
  ) {
    try {
      const res = await (
        window.DeviceOrientationEvent as any
      ).requestPermission();
      if (res === 'granted') {
        hasPermission = true;
        return true;
      }
    } catch (err) {
      console.warn('DeviceOrientation permission request failed:', err);
    }
  }
  return false;
}

function handlePointerMove(e: PointerEvent | MouseEvent) {
  if (isUsingOrientation) return;
  const px = (e.clientX / window.innerWidth) * 2 - 1;
  pointerTargetX = Math.max(-1, Math.min(1, px));
}

function handleDeviceOrientation(e: DeviceOrientationEvent) {
  if (e.gamma !== null && e.gamma !== undefined) {
    // gamma is left-to-right tilt in degrees (-90 to 90), ±25° = ±1
    const gx = Math.max(-1, Math.min(1, e.gamma / 25));
    pointerTargetX = gx;
    isUsingOrientation = true;
  }
}

// Register global input listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('deviceorientation', handleDeviceOrientation, {
    passive: true,
  });
}

function updateCamera(reduced: boolean) {
  if (!sceneElement) {
    sceneElement = document.querySelector('.scene');
  }
  if (!sceneElement) return;

  if (reduced) {
    currentCameraPct = 50;
    sceneElement.style.perspectiveOrigin = '50% 30%';
    return;
  }

  // Camera: pointer's x over window (-1 at left edge, 1 at right)
  // moves perspective-origin of .scene to (50 + x·18)% 30%, eased (12% each frame)
  const targetPct = 50 + pointerTargetX * 18;
  currentCameraPct += (targetPct - currentCameraPct) * 0.12;
  sceneElement.style.perspectiveOrigin = `${currentCameraPct.toFixed(2)}% 30%`;
}

function tick(now: number) {
  if (!lastTime) lastTime = now;
  // dt always capped at 1/30 s
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  spreadAge += dt;
  const reduced = isReducedMotion();

  if (!activeTurn && document.documentElement.classList.contains('mm-on')) {
    const t = now * 0.001;
    motionTickListeners.forEach((cb) => cb(t, dt));
    requestAnimationFrame(tick);
    return;
  }

  if (activeTurn) {
    activeTurn.turnAge += dt;
    const age = activeTurn.turnAge;
    const TURN = 1.05;
    const o = ease(Math.min(1, age / TURN));

    // Leaf angle & past class
    const dir = activeTurn.dir;
    const leafAngle = (dir > 0 ? -180 : 180) * o;
    activeTurn.leaf.style.setProperty('--a', `${leafAngle.toFixed(2)}deg`);

    if (o >= 0.5) {
      activeTurn.leaf.classList.add('past');
    } else {
      activeTurn.leaf.classList.remove('past');
    }

    // Stand targets
    // leaving: r * (1 - smooth(o / 0.3)) (folds flat as the leaf lifts)
    activeTurn.leavingStands.forEach((stand) => {
      const target = stand.rest * (1 - smooth(o / 0.3));
      stepSpring(stand, target, dt);
      stand.element.style.setProperty('--up', stand.t.toFixed(4));
      if (stand.cast) {
        stand.cast.style.setProperty(
          '--up',
          Math.max(0, Math.min(1, stand.t)).toFixed(4)
        );
      }
    });

    // stay: r * (1 - smooth((o - 0.35) / 0.4)) (folds flat as the leaf comes down on it)
    activeTurn.stayStands.forEach((stand) => {
      const target = stand.rest * (1 - smooth((o - 0.35) / 0.4));
      stepSpring(stand, target, dt);
      stand.element.style.setProperty('--up', stand.t.toFixed(4));
      if (stand.cast) {
        stand.cast.style.setProperty(
          '--up',
          Math.max(0, Math.min(1, stand.t)).toFixed(4)
        );
      }
    });

    // under: r * smooth((o - d * 0.3) / 0.45) (rises as soon as the leaf lifts off it)
    activeTurn.underStands.forEach((stand) => {
      const target = stand.rest * smooth((o - stand.d * 0.3) / 0.45);
      stepSpring(stand, target, dt);
      stand.element.style.setProperty('--up', stand.t.toFixed(4));
      if (stand.cast) {
        stand.cast.style.setProperty(
          '--up',
          Math.max(0, Math.min(1, stand.t)).toFixed(4)
        );
      }
    });

    // back: r * smooth((o - 0.5 - d * 0.3) / (0.5 - d * 0.3)) (unfolds as the leaf lands)
    activeTurn.backStands.forEach((stand) => {
      const denom = Math.max(0.01, 0.5 - stand.d * 0.3);
      const target = stand.rest * smooth((o - 0.5 - stand.d * 0.3) / denom);
      stepSpring(stand, target, dt);
      stand.element.style.setProperty('--up', stand.t.toFixed(4));
      if (stand.cast) {
        stand.cast.style.setProperty(
          '--up',
          Math.max(0, Math.min(1, stand.t)).toFixed(4)
        );
      }
    });

    // Shadows
    const sinVal = Math.max(0, Math.sin(Math.PI * o));
    const underOpacity = 0.8 * sinVal * (1 - o) * 2;
    const destOpacity = 0.8 * sinVal * o * 2;

    if (activeTurn.underShade) {
      activeTurn.underShade.style.opacity = underOpacity.toFixed(3);
    }
    if (activeTurn.destShade) {
      activeTurn.destShade.style.opacity = destOpacity.toFixed(3);
    }

    // Land check:
    // Land when o >= 1 and (age > TURN + 0.35 s, or every new Stand is within 0.03 of its rest).
    // Never wait longer.
    const newStands = [...activeTurn.underStands, ...activeTurn.backStands];
    const allNearRest =
      newStands.length > 0
        ? newStands.every((s) => Math.abs(s.t - s.rest) <= 0.03)
        : true;
    const timedOut = age > TURN + 0.35;

    if (o >= 1 && (timedOut || allNearRest)) {
      const completedTurn = activeTurn;
      activeTurn = null;
      newStands.forEach((s) => {
        s.age = s.d + 0.5;
        s.settled = false;
      });
      completedTurn.onLand();
    }
  } else {
    // Process all registered stands on open spread
    for (let i = 0; i < stands.length; i++) {
      const stand = stands[i];
      if (!stand.element) continue;

      if (reduced) {
        if (!stand.settled) {
          stand.t = stand.rest;
          stand.v = 0;
          stand.settled = true;
          stand.element.style.setProperty('--up', stand.rest.toFixed(4));
          if (stand.cast) {
            stand.cast.style.setProperty(
              '--up',
              Math.max(0, Math.min(1, stand.rest)).toFixed(4)
            );
          }
        }
        continue;
      }

      if (stand.folding) {
        // Folding down to 0
        const target = 0;
        const isSettled = stepSpring(stand, target, dt);
        stand.element.style.setProperty('--up', stand.t.toFixed(4));
        if (stand.cast) {
          stand.cast.style.setProperty(
            '--up',
            Math.max(0, Math.min(1, stand.t)).toFixed(4)
          );
        }
        if (isSettled && Math.abs(stand.t) < 5e-4) {
          stand.settled = true;
          stand.onFolded?.();
        }
      } else {
        // Rising or standing
        if (stand.settled) {
          // Skip the style write for a stand that has settled
          continue;
        }

        if (stand.age !== undefined) {
          stand.age += dt;
        }
        const ageToUse = stand.age ?? spreadAge;
        const progress = (ageToUse - stand.d) / 0.5;
        const target = stand.rest * smooth(progress);

        const isSpringSettled = stepSpring(stand, target, dt);
        stand.element.style.setProperty('--up', stand.t.toFixed(4));
        if (stand.cast) {
          stand.cast.style.setProperty(
            '--up',
            Math.max(0, Math.min(1, stand.t)).toFixed(4)
          );
        }

        if (progress >= 1 && isSpringSettled) {
          stand.settled = true;
        }
      }
    }
  }

  updateCamera(reduced);

  const t = now * 0.001;
  motionTickListeners.forEach((cb) => cb(t, dt));

  requestAnimationFrame(tick);
}

function ensureLoop() {
  if (!isLoopRunning && typeof window !== 'undefined') {
    isLoopRunning = true;
    requestAnimationFrame(tick);
  }
}

// Start loop automatically in browser
if (typeof window !== 'undefined') {
  ensureLoop();
}
