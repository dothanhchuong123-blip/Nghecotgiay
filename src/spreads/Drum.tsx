import React, { useRef, useState } from 'react';
import { LEVELS, COPY } from '../data';
import { say } from '../nghe/say';
import { isReducedMotion } from '../paper/motion';

export interface DrumProps {
  level: number;
  onLevelChange: (lvl: number) => void;
  allowedLevels?: number[];
}

const LEVEL_ANGLES: Record<number, number> = {
  1: -60,
  2: -30,
  3: 0,
};

const getTargetRotation = (lvl: number) => -(LEVEL_ANGLES[lvl] ?? 0);

export default function Drum({
  level,
  onLevelChange,
  allowedLevels = [1, 2, 3],
}: DrumProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragRotation, setDragRotation] = useState<number | null>(null);

  const faceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    cx: number;
    cy: number;
    startPointerAngle: number;
    startRotation: number;
  } | null>(null);

  const currentRotation =
    dragRotation !== null ? dragRotation : getTargetRotation(level);

  const validLevels = [1, 2, 3].filter((n) => allowedLevels.includes(n));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const pointerAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const baseRotation = getTargetRotation(level);

    dragRef.current = {
      cx,
      cy,
      startPointerAngle: pointerAngle,
      startRotation: dragRotation !== null ? dragRotation : baseRotation,
    };
    setIsDragging(true);
    setDragRotation(dragRef.current.startRotation);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current) return;
    const { cx, cy, startPointerAngle, startRotation } = dragRef.current;
    const currentPointerAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    let delta = currentPointerAngle - startPointerAngle;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    setDragRotation(startRotation + delta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setIsDragging(false);

    const currentAngle =
      dragRotation !== null ? dragRotation : getTargetRotation(level);
    dragRef.current = null;

    // Snap to nearest allowed level
    let bestLevel = level;
    let minDiff = Infinity;

    for (const n of validLevels) {
      const targetAngle = getTargetRotation(n);
      let diff = Math.abs(currentAngle - targetAngle);
      while (diff > 180) diff = Math.abs(diff - 360);
      if (diff < minDiff) {
        minDiff = diff;
        bestLevel = n;
      }
    }

    setDragRotation(null);
    if (bestLevel !== level) {
      onLevelChange(bestLevel);
    }
  };

  const handleLabelClick = (n: number) => {
    if (!allowedLevels.includes(n)) {
      say(COPY.mix.levelNotHere);
      return;
    }
    onLevelChange(n);
  };

  const stepLevel = (dir: -1 | 1) => {
    const idx = validLevels.indexOf(level);
    if (idx === -1) {
      if (validLevels.length > 0) onLevelChange(validLevels[0]);
      return;
    }
    const nextIdx = idx + dir;
    if (nextIdx >= 0 && nextIdx < validLevels.length) {
      onLevelChange(validLevels[nextIdx]);
    }
  };

  const handleFaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      stepLevel(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      stepLevel(1);
    }
  };

  const allLevels: number[] = [1, 2, 3];

  return (
    <div className="mix-drum-wrap">
      {/* Draggable & rotatable drum face */}
      <div
        ref={faceRef}
        className="mix-drum-face-container"
        tabIndex={0}
        role="slider"
        aria-label={COPY.mix.drum}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={
          (LEVELS as Record<string, { name: string } | undefined>)[String(level)]
            ?.name
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleFaceKeyDown}
      >
        <img
          src="/book/mech/drum-face.webp"
          alt=""
          className="mix-drum-face"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition:
              isDragging || isReducedMotion()
                ? 'none'
                : 'transform 0.6s cubic-bezier(0.3, 1.5, 0.5, 1)',
          }}
          onError={() => console.log('[art missing] /book/mech/drum-face.webp')}
        />

        {/* Brass split pin at centre (P4) */}
        <img
          src="/book/mech/split-pin.webp"
          alt=""
          className="mix-drum-pin"
          onError={() => console.log('[art missing] /book/mech/split-pin.webp')}
        />
      </div>

      {/* Three level labels in a column just right of the drum */}
      <div
        className="mix-drum-levels"
        role="radiogroup"
        aria-label={COPY.mix.drum}
      >
        {allLevels.map((lvl) => {
          const isAllowed = allowedLevels.includes(lvl);
          const isChosen = level === lvl;
          const lvlInfo = (
            LEVELS as Record<string, { name: string } | undefined>
          )[String(lvl)];
          const baseName = lvlInfo?.name || `Mức ${lvl}`;
          const labelText = isChosen ? `◀ ${baseName}` : baseName;

          return (
            <button
              key={lvl}
              type="button"
              role="radio"
              aria-checked={isChosen}
              aria-disabled={!isAllowed}
              tabIndex={isChosen ? 0 : -1}
              className={`mix-drum-level-pill top-${lvl}${
                isChosen ? ' active' : ''
              }${!isAllowed ? ' disabled' : ''}`}
              onClick={() => handleLabelClick(lvl)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  stepLevel(-1);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  stepLevel(1);
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLabelClick(lvl);
                }
              }}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}
