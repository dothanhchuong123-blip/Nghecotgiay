import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LookMatch } from './closest';
import { Letter } from './mailbox';
import { COPY } from '../data';
import { POUCH_COPY as P } from '../cards/copy';
import { isReducedMotion } from '../paper/motion';
import { whoosh, rustle, snap } from '../audio/paper';
import { useFocusTrap } from '../paper/focusTrap';
import './lookmail.css';

export interface LookMailProps {
  letter: Letter;
  onClose: () => void;
}

type FaceKey = 'A' | 'B' | 'C';

// loading = pictures still coming in; fly = the envelope leaves the desk; seal = the seal cracks;
// open = the flap swings up; sliding = card half out; print = card lifted; landed = photo developing; ready = done.
type Phase = 'loading' | 'fly' | 'seal' | 'open' | 'sliding' | 'print' | 'landed' | 'ready' | 'closing';

const ENV = ['env-body', 'env-front', 'env-flap-in', 'env-flap-out', 'M5'].map((n) => `/book/mailbox/${n}.webp`);
const LOAD_TIMEOUT_MS = 9000;

/** Loads one picture; resolves true if it arrived as a real image. */
function loadOne(src: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = src;
  });
}

/** The visitor's own paper doll as a picture, the last fallback when no photo can load. */
function dollSnapshot(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.paper-doll-canvas, .mix-doll-container canvas');
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** screen pixels per layout pixel (the desktop design frame is scaled to fit the window) */
function scaleOf(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return el.offsetWidth ? r.width / el.offsetWidth || 1 : 1;
}

/** Where the desk envelope is, relative to the letter's envelope: offset (layout px) and scale. */
function pocketDelta(env: HTMLElement): { dx: number; dy: number; s: number } | null {
  const pocket = document.querySelector<HTMLElement>('.desk-pocket-btn');
  if (!pocket) return null;
  const p = pocket.getBoundingClientRect();
  const e = env.getBoundingClientRect();
  if (!p.width || !e.width) return null;
  const k = scaleOf(env);
  return {
    dx: (p.left + p.width / 2 - (e.left + e.width / 2)) / k,
    dy: (p.top + p.height / 2 - (e.top + e.height / 2)) / k,
    s: p.width / e.width,
  };
}

const atPocket = (d: { dx: number; dy: number; s: number }) => `translate(${d.dx}px, ${d.dy}px) scale(${d.s.toFixed(3)}) rotate(-6deg)`;

export default function LookMail({ letter, onClose }: LookMailProps) {
  const reduced = isReducedMotion();
  const [index, setIndex] = useState(0);
  const match: LookMatch = letter.matches[index] ?? letter.matches[0];
  const look = match.look;

  // A = photo, B = close-up, C = poster; a face whose picture failed is dropped
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [frameOk, setFrameOk] = useState(true);
  const faces = useMemo<FaceKey[]>(() => {
    const list: FaceKey[] = [];
    if (!failed[look.files.A]) list.push('A');
    if (look.files.B && !failed[look.files.B]) list.push('B');
    if (look.files.C && !failed[look.files.C]) list.push('C');
    return list;
  }, [look, failed]);
  const [faceIndex, setFaceIndex] = useState(0);
  const face: FaceKey | null = faces[faceIndex % Math.max(1, faces.length)] ?? null;
  const faceSrc = face === 'A' ? look.files.A : face === 'B' ? look.files.B! : face === 'C' ? look.files.C! : null;
  const doll = useMemo(() => (faces.length === 0 ? dollSnapshot() : null), [faces.length]);
  const canFlip = faces.length > 1;
  const nextFace = faces[(faceIndex + 1) % Math.max(1, faces.length)];
  const nextLabel = nextFace === 'B' ? COPY.preview.toDetail : nextFace === 'C' ? COPY.preview.toPoster : COPY.preview.toPhoto;

  const [phase, setPhase] = useState<Phase>('loading');
  const [developed, setDeveloped] = useState(reduced);
  const [flipOut, setFlipOut] = useState(false);
  const [showWait, setShowWait] = useState(false);

  const envRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const closing = useRef(false);
  const busy = useRef(false);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // the desk envelope wiggles while the letter loads, then is "out" while its letter is open
  const pocketOut = phase !== 'loading';
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('lm-pocket-ping', !pocketOut);
    root.classList.toggle('lm-pocket-out', pocketOut);
    return () => root.classList.remove('lm-pocket-ping', 'lm-pocket-out');
  }, [pocketOut]);

  const markFailed = useCallback((src: string) => {
    console.log(`[art missing] ${src}`);
    setFailed((f) => (f[src] ? f : { ...f, [src]: true }));
  }, []);

  // Wait for the envelope and the photo, then tell the story
  useEffect(() => {
    let cancelled = false;
    const waitNote = window.setTimeout(() => setShowWait(true), 700);
    Promise.all([
      Promise.all(ENV.map((src) => loadOne(src, LOAD_TIMEOUT_MS))),
      loadOne(look.files.A, LOAD_TIMEOUT_MS),
    ]).then(async ([, photoOk]) => {
      if (!photoOk) {
        markFailed(look.files.A);
        if (look.files.C) {
          const posterOk = await loadOne(look.files.C, LOAD_TIMEOUT_MS / 2);
          if (!posterOk) markFailed(look.files.C);
        }
      }
      window.clearTimeout(waitNote);
      if (cancelled || closing.current) return;
      setShowWait(false);
      if (reduced) {
        setPhase('ready');
        setDeveloped(true);
        return;
      }
      setPhase('fly');
    });
    return () => {
      cancelled = true;
      window.clearTimeout(waitNote);
      clearTimers();
    };
  }, []);

  // fly from the desk, crack the seal, swing the flap up, slide the card out
  useLayoutEffect(() => {
    if (phase !== 'fly' || !envRef.current) return;
    const env = envRef.current;
    const d = pocketDelta(env);
    whoosh();
    // a curve: up and over from the desk, turning as it comes
    const flight = d
      ? env.animate(
          [
            { transform: atPocket(d), opacity: 0.6 },
            { transform: `translate(${d.dx * 0.45}px, ${d.dy * 0.45 - 90}px) scale(${((d.s + 1) / 2).toFixed(3)}) rotate(5deg)`, opacity: 1, offset: 0.55 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 680, easing: 'cubic-bezier(.3,.7,.25,1)' }
        )
      : env.animate([{ transform: 'translateY(40px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420 });
    flight.finished.then(
      () => {
        if (closing.current) return;
        setPhase('seal');
      },
      () => undefined
    );
  }, [phase]);

  useEffect(() => {
    if (phase === 'seal') {
      rustle();
      later(320, () => setPhase('open'));
    } else if (phase === 'open') {
      const flap = flapRef.current;
      if (flap) {
        flap.animate([{ transform: 'perspective(1400px) rotateX(180deg)' }, { transform: 'perspective(1400px) rotateX(415deg)' }], {
          duration: 560,
          easing: 'cubic-bezier(.45,.05,.3,1)',
          fill: 'forwards',
        });
      }
      later(600, () => setPhase('sliding'));
    } else if (phase === 'sliding') {
      later(420, () => setPhase('print'));
    } else if (phase === 'print') {
      later(460, () => {
        setPhase('landed');
        setDeveloped(true);
        snap();
      });
    } else if (phase === 'landed') {
      later(1200, () => setPhase('ready'));
    }
  }, [phase]);

  // Close: the card goes back in, the flap closes, the envelope flies home to the desk
  const handleClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    clearTimers();
    setPhase('closing');
    const env = envRef.current;
    const flap = flapRef.current;
    if (reduced || !env) {
      later(150, onClose);
      return;
    }
    rustle();
    later(300, () => {
      flap?.getAnimations().forEach((a) => a.cancel());
      flap?.animate([{ transform: 'perspective(1400px) rotateX(415deg)' }, { transform: 'perspective(1400px) rotateX(180deg)' }], {
        duration: 380,
        easing: 'ease-in',
        fill: 'forwards',
      });
    });
    later(700, () => {
      const d = pocketDelta(env);
      whoosh();
      env.animate([{ transform: 'none', opacity: 1 }, { transform: d ? atPocket(d) : 'translateY(60px) scale(.6)', opacity: d ? 0.7 : 0 }], {
        duration: 520,
        easing: 'cubic-bezier(.5,0,.4,1)',
        fill: 'forwards',
      });
    });
    later(1180, onClose);
  }, [reduced, onClose]);

  const dialogRef = useFocusTrap(true, handleClose, '.lm-close');

  const flip = useCallback(() => {
    if (!canFlip || busy.current || closing.current) return;
    if (phase !== 'print' && phase !== 'landed' && phase !== 'ready') return;
    if (reduced) {
      setFaceIndex((i) => (i + 1) % faces.length);
      return;
    }
    busy.current = true;
    rustle();
    setFlipOut(true);
    later(150, () => {
      setFaceIndex((i) => (i + 1) % faces.length);
      setFlipOut(false);
    });
    later(300, () => {
      busy.current = false;
    });
  }, [canFlip, phase, reduced, faces.length]);

  // swap to a runner-up: turn edge-on, swap, turn back, develop again
  const pickAlt = (i: number) => {
    if (i === index || busy.current || closing.current) return;
    busy.current = true;
    rustle();
    setFlipOut(true);
    later(reduced ? 0 : 150, () => {
      setIndex(i);
      setFaceIndex(0);
      setDeveloped(reduced);
      setFlipOut(false);
      later(40, () => setDeveloped(true));
    });
    later(reduced ? 0 : 300, () => {
      busy.current = false;
    });
  };

  const line1 = match.exact
    ? COPY.preview.exact
    : letter.vibeName && match.reasons.includes('cùng gu')
    ? COPY.preview.near.replace('{vibe}', letter.vibeName)
    : COPY.preview.nearNoVibe;
  const reasonLine = match.exact ? '' : [P.similar.replace('{n}', String(match.score)), ...match.reasons.filter((r) => r !== 'cùng áo')].join(' · ');

  const loadingNow = phase === 'loading';
  const sealVisible = loadingNow || phase === 'fly' || phase === 'seal';
  // the open flap sits behind the card; while closed or swinging it is in front of everything
  const flapBack = phase === 'sliding' || phase === 'print' || phase === 'landed' || phase === 'ready';
  const cardPos =
    phase === 'sliding' ? 'at-sliding' : phase === 'print' || phase === 'landed' || phase === 'ready' ? 'at-print' : 'at-hidden';
  const inFront = cardPos === 'at-print';
  const metaVisible = phase === 'landed' || phase === 'ready';
  const alts = letter.matches.length > 1 ? letter.matches : [];

  const container =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.design-frame-canvas, .design-frame-mobile') ?? document.body
      : null;
  if (!container) return null;
  const isMobile = !container.classList.contains('design-frame-canvas');

  const content = (
    <div
      className={`lm-overlay${isMobile ? ' is-mobile' : ''}${phase === 'closing' ? ' is-closing' : ''}${reduced ? ' is-reduced' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div ref={dialogRef} className="lm-dialog" role="dialog" aria-modal="true" aria-label={line1}>
        {loadingNow && showWait && (
          <div className="lm-loading" role="status">
            <p className="lm-loading-text">{COPY.preview.opening}</p>
            <div className="lm-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <button type="button" className="lm-btn lm-close" onClick={handleClose}>
              {COPY.preview.close}
            </button>
          </div>
        )}

        <div className={`lm-row${loadingNow ? ' is-waiting' : ''}`}>
          <div className="lm-stage">
            <div ref={envRef} className="lm-env">
              <img src="/book/mailbox/env-body.webp" alt="" className="lm-env-body" draggable={false} />

              <div
                className={`lm-card ${cardPos}${inFront ? ' is-front' : ''}${canFlip ? ' can-flip' : ''}`}
                role={canFlip ? 'button' : undefined}
                tabIndex={canFlip && inFront ? 0 : undefined}
                aria-label={canFlip ? COPY.preview.flip : undefined}
                onClick={canFlip ? flip : undefined}
                onKeyDown={
                  canFlip
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          flip();
                        }
                      }
                    : undefined
                }
              >
                <div className={`lm-flip${flipOut ? ' is-out' : ''}${frameOk ? '' : ' no-frame'}`}>
                  {face === 'C' ? (
                    <div className="lm-poster-face">
                      <img key={faceSrc!} src={faceSrc!} alt={line1} className="lm-poster" onError={() => markFailed(faceSrc!)} />
                    </div>
                  ) : (
                    <>
                      <div className="lm-window">
                        {faceSrc ? (
                          <img
                            key={faceSrc}
                            src={faceSrc}
                            alt={line1}
                            className={`lm-photo${developed ? ' is-developed' : ' is-developing'}`}
                            onError={() => markFailed(faceSrc)}
                          />
                        ) : doll ? (
                          <img src={doll} alt="" className="lm-photo lm-doll is-developed" />
                        ) : (
                          <p className="lm-nophoto">{P.fallback}</p>
                        )}
                      </div>
                      {frameOk && (
                        <img src="/book/mailbox/M5.webp" alt="" className="lm-frame" draggable={false} onError={() => setFrameOk(false)} />
                      )}
                    </>
                  )}
                </div>
              </div>

              <img src="/book/mailbox/env-front.webp" alt="" className="lm-env-front" draggable={false} />

              <div ref={flapRef} className={`lm-flap${flapBack ? ' is-open is-back' : ''}`} aria-hidden="true">
                <img src="/book/mailbox/env-flap-in.webp" alt="" className="lm-flap-in" draggable={false} />
                <div className="lm-flap-out">
                  <img src="/book/mailbox/env-flap-out.webp" alt="" draggable={false} />
                </div>
              </div>

              {sealVisible && (
                <div ref={sealRef} className={`lm-seal${phase === 'seal' ? ' is-cracking' : ''}`} aria-hidden="true">
                  <i />
                  <i />
                </div>
              )}
            </div>
          </div>

          {alts.length > 0 && (
            <div className={`lm-alts${metaVisible ? ' is-visible' : ''}`} role="group" aria-label={P.alts}>
              {alts.map((m, i) => (
                <button
                  key={m.look.id}
                  type="button"
                  className={`lm-alt${i === index ? ' is-current' : ''}`}
                  onClick={() => pickAlt(i)}
                  aria-pressed={i === index}
                  aria-label={`${P.similar.replace('{n}', String(m.score))}`}
                >
                  <img src={m.look.thumb} alt="" draggable={false} onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))} />
                  <span>{m.exact ? '100%' : `${m.score}%`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`lm-meta${metaVisible ? ' is-visible' : ''}${loadingNow ? ' is-waiting' : ''}`}>
          <div className="lm-note">
            <p className="lm-line1">{line1}</p>
            {reasonLine && <p className="lm-reasons">{reasonLine}</p>}
            <p className="lm-line2">{COPY.preview.ai}</p>
            <p className="lm-line3">{COPY.preview.tryYours}</p>
          </div>
          <div className="lm-actions">
            {canFlip && (
              <button type="button" className="lm-btn" onClick={flip} aria-label={COPY.preview.flip}>
                {nextLabel}
              </button>
            )}
            <button type="button" className="lm-btn lm-close" onClick={handleClose}>
              {COPY.preview.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, container);
}
