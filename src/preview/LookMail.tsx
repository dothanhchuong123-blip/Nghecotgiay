import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LookEntry } from './closest';
import { COPY } from '../data';
import { isReducedMotion } from '../paper/motion';
import { whoosh, rustle, snap } from '../audio/paper';
import { useFocusTrap } from '../paper/focusTrap';
import './lookmail.css';

export interface LookMailProps {
  look: LookEntry;
  exact: boolean;
  vibeName: string | null;
  onClose: () => void;
}

type FaceKey = 'A' | 'B' | 'C';

// m1..m3 = envelope flipbook (M1, M2, M3), open = M4 (card hidden inside), sliding = card half out,
// print = card lifted to print size, landed = card down and the photo developing, ready = all done.
type Phase = 'm1' | 'm2' | 'm3' | 'open' | 'sliding' | 'print' | 'landed' | 'ready' | 'closing';

const FRAMES = ['M1', 'M2', 'M3', 'M4', 'M4b', 'M5'];

function Art({ src, className, alt = '' }: { src: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => {
        console.log(`[art missing] ${src}`);
        setFailed(true);
      }}
    />
  );
}

export default function LookMail({ look, exact, vibeName, onClose }: LookMailProps) {
  const reduced = isReducedMotion();

  // A = the photo, B = the close-up (if it exists), C = the poster (if it exists)
  const faces = useMemo<FaceKey[]>(() => {
    const list: FaceKey[] = ['A'];
    if (look.files.B) list.push('B');
    if (look.files.C) list.push('C');
    return list;
  }, [look.files.B, look.files.C]);
  const canFlip = faces.length > 1;

  const [faceIndex, setFaceIndex] = useState(0);
  const [flipOut, setFlipOut] = useState(false);
  const [phase, setPhase] = useState<Phase>(reduced ? 'ready' : 'm1');
  const [developed, setDeveloped] = useState(reduced);

  const face = faces[faceIndex];
  const nextFace = faces[(faceIndex + 1) % faces.length];
  const faceSrc = face === 'A' ? look.files.A : face === 'B' ? look.files.B! : look.files.C!;
  const nextLabel =
    nextFace === 'B' ? COPY.preview.toDetail : nextFace === 'C' ? COPY.preview.toPoster : COPY.preview.toPhoto;

  const timers = useRef<number[]>([]);
  const closing = useRef(false);
  const flipping = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Close: the card goes back into the envelope and the overlay fades out
  const handleClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    clearTimers();
    setPhase('closing');
    later(reduced ? 150 : 400, onClose);
  }, [reduced, onClose]);

  const dialogRef = useFocusTrap(true, handleClose, '.lm-close');

  // The story: M1 held 500 ms, then M2, M3, M4 one frame each at 12 fps, the card slides out, lifts, lands, develops.
  useEffect(() => {
    FRAMES.forEach((n) => {
      const img = new Image();
      img.src = `/book/mailbox/${n}.png`;
    });
    if (reduced) return;
    whoosh();
    const frame = 1000 / 12;
    const t2 = 500;
    const t3 = t2 + frame;
    const t4 = t3 + frame;
    const tSlide = t4 + frame;
    const tPrint = tSlide + 420;
    const tLanded = tPrint + 460;
    later(t2, () => {
      setPhase('m2');
      rustle();
    });
    later(t3, () => setPhase('m3'));
    later(t4, () => setPhase('open'));
    later(tSlide, () => setPhase('sliding'));
    later(tPrint, () => setPhase('print'));
    later(tLanded, () => {
      setPhase('landed');
      setDeveloped(true);
      snap();
    });
    later(tLanded + 1200, () => setPhase('ready'));
    return clearTimers;
  }, [reduced]);

  // Flip to the next face: turn edge-on (150 ms), swap, turn back (150 ms)
  const flip = useCallback(() => {
    if (!canFlip || flipping.current || closing.current) return;
    if (phase !== 'print' && phase !== 'landed' && phase !== 'ready') return;
    if (reduced) {
      setFaceIndex((i) => (i + 1) % faces.length);
      return;
    }
    flipping.current = true;
    rustle();
    setFlipOut(true);
    later(150, () => {
      setFaceIndex((i) => (i + 1) % faces.length);
      setFlipOut(false);
    });
    later(300, () => {
      flipping.current = false;
    });
  }, [canFlip, phase, reduced, faces.length]);

  const line1 = exact
    ? COPY.preview.exact
    : vibeName
    ? COPY.preview.near.replace('{vibe}', vibeName)
    : COPY.preview.nearNoVibe;

  const envelopeOpen = phase !== 'm1' && phase !== 'm2' && phase !== 'm3';
  const cardPos =
    phase === 'sliding' ? 'at-sliding' : phase === 'print' || phase === 'landed' || phase === 'ready' ? 'at-print' : 'at-hidden';
  const inFront = phase === 'print' || phase === 'landed' || phase === 'ready';
  const metaVisible = phase === 'landed' || phase === 'ready';

  const container =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.design-frame-canvas, .design-frame-mobile') ?? document.body
      : null;
  if (!container) return null;
  const isMobile = !container.classList.contains('design-frame-canvas');

  const content = (
    <div
      className={`lm-overlay${isMobile ? ' is-mobile' : ''}${phase === 'closing' ? ' is-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div ref={dialogRef} className="lm-dialog" role="dialog" aria-modal="true" aria-label={line1}>
        <div className="lm-stage">
          {phase === 'm1' && <Art src="/book/mailbox/M1.png" className="lm-env" />}
          {phase === 'm2' && <Art src="/book/mailbox/M2.png" className="lm-env" />}
          {phase === 'm3' && <Art src="/book/mailbox/M3.png" className="lm-env" />}

          {envelopeOpen && (
            <>
              <div className="lm-layer lm-z1">
                <Art src="/book/mailbox/M4.png" className="lm-env" />
              </div>

              <div
                className={`lm-card ${cardPos}${inFront ? ' is-front' : ''}${canFlip ? ' can-flip' : ''}`}
                role={canFlip ? 'button' : undefined}
                tabIndex={canFlip ? 0 : undefined}
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
                <div className={`lm-flip${flipOut ? ' is-out' : ''}`}>
                  {face === 'C' ? (
                    <div className="lm-poster-face">
                      <Art key={faceSrc} src={faceSrc} alt={line1} className="lm-poster" />
                    </div>
                  ) : (
                    <>
                      <div className="lm-window">
                        <Art
                          key={faceSrc}
                          src={faceSrc}
                          alt={line1}
                          className={`lm-photo${developed ? ' is-developed' : ' is-developing'}`}
                        />
                      </div>
                      <Art src="/book/mailbox/M5.png" className="lm-frame" />
                    </>
                  )}
                </div>
              </div>

              <div className="lm-layer lm-z3">
                <Art src="/book/mailbox/M4b.png" className="lm-env" />
              </div>
            </>
          )}
        </div>

        <div className={`lm-meta${metaVisible ? ' is-visible' : ''}`}>
          <div className="lm-note">
            <p className="lm-line1">{line1}</p>
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
