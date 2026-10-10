import React, { forwardRef } from 'react';
import { CardInfo, World } from './deck';

// One trading card: the poster on the front, its world's back, a soft foil and glare that follow the hand.

const BACK_LABEL: Record<World, React.ReactNode> = {
  1: (
    <>
      Chuẩn
      <br />
      cổ
      <br />
      phục
    </>
  ),
  2: (
    <>
      Giao
      <br />
      thoa
    </>
  ),
  3: 'Đường phố',
};

export function CardBack({ world }: { world: World }) {
  return (
    <div className={`nc-face nc-back nc-back-${world}`}>
      <div className="nc-back-art" aria-hidden="true">
        <i className="nc-b1" />
        <i className="nc-b2" />
        <i className="nc-b3" />
      </div>
      <div className="nc-back-label">{BACK_LABEL[world]}</div>
      <div className="nc-glare" />
    </div>
  );
}

export interface CardProps {
  card: CardInfo;
  /** world of the back when the card is face down (defaults to the card's own world) */
  backWorld?: World;
  up?: boolean;
  seen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ card, backWorld, up = false, seen, className, style }, ref) {
  return (
    <div
      ref={ref}
      className={`nc-card w${card.world}${up ? ' up' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      data-world={card.world}
    >
      <div className="nc-tilt">
        <div className="nc-flip">
          <div className="nc-face nc-front">
            <img src={card.poster} alt={`${card.title} · ${card.sub}`} draggable={false} />
            <div className="nc-foil" />
            <div className="nc-glare" />
            {seen ? <span className="nc-seen" aria-hidden="true" /> : null}
          </div>
          <CardBack world={backWorld ?? card.world} />
        </div>
      </div>
    </div>
  );
});

export default Card;

/**
 * Tilts a card toward the pointer (or the phone's tilt) with a soft spring.
 * Writes --rx --ry (degrees), --mx --my (pointer, %) and --hyp (0..1) on the card.
 */
export function attachTilt(card: HTMLElement, area: HTMLElement, maxDeg = 14): () => void {
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let held = false;

  const step = () => {
    x += (tx - x) * 0.13;
    y += (ty - y) * 0.13;
    card.style.setProperty('--ry', `${(x * maxDeg).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-y * maxDeg).toFixed(2)}deg`);
    card.style.setProperty('--mx', `${(50 + x * 50).toFixed(1)}%`);
    card.style.setProperty('--my', `${(50 + y * 50).toFixed(1)}%`);
    card.style.setProperty('--hyp', Math.min(1, Math.hypot(x, y)).toFixed(3));
    if (held || Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) raf = requestAnimationFrame(step);
    else raf = 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(step);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && e.buttons === 0) return;
    const r = card.getBoundingClientRect();
    if (r.width === 0) return;
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    held = true;
    card.classList.add('is-live');
    kick();
  };
  const onLeave = () => {
    held = false;
    tx = 0;
    ty = 0;
    kick();
  };

  // phones: lean the card with the device (only when the browser already allows it)
  let base: { b: number; g: number } | null = null;
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    tx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25));
    ty = Math.max(-1, Math.min(1, (e.beta - base.b) / 25));
    card.classList.add('is-live');
    kick();
  };
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerdown', onMove);
  area.addEventListener('pointerleave', onLeave);
  area.addEventListener('pointerup', onLeave);
  area.addEventListener('pointercancel', onLeave);
  if (coarse) window.addEventListener('deviceorientation', onOrient);

  return () => {
    area.removeEventListener('pointermove', onMove);
    area.removeEventListener('pointerdown', onMove);
    area.removeEventListener('pointerleave', onLeave);
    area.removeEventListener('pointerup', onLeave);
    area.removeEventListener('pointercancel', onLeave);
    if (coarse) window.removeEventListener('deviceorientation', onOrient);
    if (raf) cancelAnimationFrame(raf);
  };
}
