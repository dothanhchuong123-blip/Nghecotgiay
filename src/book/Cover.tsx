import React, { useEffect, useRef, useState } from 'react';
import { COPY } from '../data';
import { useStore } from '../state';
import { worldOf } from '../world/worlds';
import { isReducedMotion } from '../paper/motion';
import './cover.css';

export interface CoverProps {
  onOpen?: () => void;
  onMix?: () => void;
}

export default function Cover({ onOpen, onMix }: CoverProps) {
  const { state } = useStore();
  const world = worldOf(state.collage);
  const [hardcoverMissing, setHardcoverMissing] = useState(false);
  const [rigMissing, setRigMissing] = useState(false);
  const [wallMissing, setWallMissing] = useState(false);
  const [pointer, setPointer] = useState({ dx: 0, dy: 0 });
  const coverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRigMissing(false);
    setWallMissing(false);
    const img = new Image();
    img.onerror = () => {
      console.log(`[art missing] ${world.wall}`);
      setWallMissing(true);
    };
    img.src = world.wall;
  }, [world.wall, world.rig]);

  useEffect(() => {
    if (isReducedMotion()) return;

    function handlePointerMove(e: PointerEvent | MouseEvent) {
      if (!coverRef.current) return;
      const rect = coverRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      setPointer({
        dx: Number(dx.toFixed(3)),
        dy: Number(dy.toFixed(3)),
      });
    }

    function handlePointerLeave() {
      setPointer({ dx: 0, dy: 0 });
    }

    function handleDeviceOrientation(e: DeviceOrientationEvent) {
      if (e.gamma !== null && e.gamma !== undefined) {
        const dx = Math.max(-1, Math.min(1, e.gamma / 25));
        const dy =
          e.beta !== null && e.beta !== undefined
            ? Math.max(-1, Math.min(1, (e.beta - 45) / 25))
            : 0;
        setPointer({
          dx: Number(dx.toFixed(3)),
          dy: Number(dy.toFixed(3)),
        });
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('deviceorientation', handleDeviceOrientation, {
      passive: true,
    });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  const reduced = isReducedMotion();

  return (
    <>
      <div className="cover-shadow" aria-hidden="true" />
      <div
        ref={coverRef}
        className="book-cover"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        aria-label={`${COPY.app.name} - ${COPY.cover.open}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.();
          }
        }}
      >
        <div
          className="cover-window"
          style={{ backgroundImage: wallMissing ? 'none' : `url("${world.wall}")` }}
        >
          {!rigMissing && (
            <img
              src={`${world.rig}/full.webp`}
              alt=""
              className="cover-rig"
              style={{
                transform: reduced
                  ? 'none'
                  : `translate(${pointer.dx * 26}px, ${pointer.dy * 12}px) rotate(${pointer.dx * 5}deg)`,
              }}
              onError={() => {
                console.log(`[art missing] ${world.rig}/full.webp`);
                setRigMissing(true);
              }}
            />
          )}
          <div className="cover-window-shadow" aria-hidden="true" />
        </div>

        {!hardcoverMissing && (
          <img
            src="/book/cover/hardcover.webp"
            alt=""
            className="cover-hardcover"
            onError={() => {
              console.log('[art missing] /book/cover/hardcover.webp');
              setHardcoverMissing(true);
            }}
          />
        )}

        <div className="cover-title-group">
          <h1 className="cover-title">{COPY.app.name}</h1>
          <div className="cover-subtitle">
            Sách nổi Việt phục · Phối đồ Gen Z
          </div>
        </div>

        <div className="cover-ribbon" aria-hidden="true" />

        <div
          className="cover-band"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="cover-band-btn cover-band-open"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            {COPY.cover.open}
          </button>
          <button
            type="button"
            className="cover-band-btn cover-band-mix"
            onClick={(e) => {
              e.stopPropagation();
              onMix?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            {COPY.mix.jump} ✦
          </button>
        </div>
      </div>
    </>
  );
}
