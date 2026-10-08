import React, { useEffect, useRef, useState } from 'react';
import { worldOf, World } from '../world/worlds';
import { snap } from '../audio/paper';
import { isReducedMotion } from '../paper/motion';

export interface LanternProps {
  level: number;
  onLevelChange: (lvl: number) => void;
  allowedLevels?: number[];
}

function getFiguresForWorld(lvl: number): number[] {
  if (lvl === 1) return [1, 2, 3, 4, 1, 2, 3, 4];
  if (lvl === 2) return [5, 6, 7, 8, 5, 6, 7, 8];
  if (lvl === 3) return [9, 10, 11, 12, 9, 10, 11, 12];
  return [1, 2, 3, 4, 1, 2, 3, 4];
}

export default function Lantern({
  level,
  onLevelChange,
  allowedLevels = [1, 2, 3],
}: LanternProps) {
  const [displayLevel, setDisplayLevel] = useState<number>(level);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const prevLevelRef = useRef<number>(level);
  const isMountedRef = useRef<boolean>(false);
  const isSelfChangingRef = useRef<boolean>(false);

  const timerARef = useRef<NodeJS.Timeout | null>(null);
  const timerBRef = useRef<NodeJS.Timeout | null>(null);

  const pointerRef = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);

  const validLevels = allowedLevels.length > 0 ? allowedLevels : [1, 2, 3];

  const getNextLevel = (): number => {
    const idx = validLevels.indexOf(displayLevel);
    if (idx === -1) return validLevels[0];
    return validLevels[(idx + 1) % validLevels.length];
  };

  const getPrevLevel = (): number => {
    const idx = validLevels.indexOf(displayLevel);
    if (idx === -1) return validLevels[validLevels.length - 1];
    return validLevels[(idx - 1 + validLevels.length) % validLevels.length];
  };

  const triggerFlip = (targetLvl: number) => {
    if (isFlipping) return;

    if (isReducedMotion()) {
      snap();
      setDisplayLevel(targetLvl);
      onLevelChange(targetLvl);
      return;
    }

    snap();
    setIsFlipping(true);
    isSelfChangingRef.current = true;

    if (timerARef.current) clearTimeout(timerARef.current);
    if (timerBRef.current) clearTimeout(timerBRef.current);

    // Changes the world 280 ms in (while it is edge-on)
    timerARef.current = setTimeout(() => {
      onLevelChange(targetLvl);
      setDisplayLevel(targetLvl);
    }, 280);

    // Flip finishes at 560 ms
    timerBRef.current = setTimeout(() => {
      setIsFlipping(false);
      isSelfChangingRef.current = false;
    }, 560);
  };

  // Listen to external level change (e.g. from WorldLever)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevLevelRef.current = level;
      setDisplayLevel(level);
      return;
    }

    if (prevLevelRef.current !== level) {
      const nextLvl = level;
      prevLevelRef.current = nextLvl;

      if (isSelfChangingRef.current) {
        // Change was initiated by Lantern's own timer
        return;
      }

      if (isReducedMotion()) {
        setDisplayLevel(nextLvl);
        return;
      }

      // External world change from lever also plays the flip
      snap();
      setIsFlipping(true);

      if (timerARef.current) clearTimeout(timerARef.current);
      if (timerBRef.current) clearTimeout(timerBRef.current);

      timerARef.current = setTimeout(() => {
        setDisplayLevel(nextLvl);
      }, 280);

      timerBRef.current = setTimeout(() => {
        setIsFlipping(false);
      }, 560);
    }
  }, [level]);

  useEffect(() => {
    return () => {
      if (timerARef.current) clearTimeout(timerARef.current);
      if (timerBRef.current) clearTimeout(timerBRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isFlipping) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const dx = e.clientX - pointerRef.current.startX;
    const dy = e.clientY - pointerRef.current.startY;
    pointerRef.current = null;

    if (isFlipping) return;

    const isSidewaysDrag = Math.abs(dx) > 24;
    const isTap = Math.abs(dx) <= 20 && Math.abs(dy) <= 20;

    if (isSidewaysDrag || isTap) {
      triggerFlip(getNextLevel());
    }
  };

  const handlePointerCancel = () => {
    pointerRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isFlipping) return;
    if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'Enter' ||
      e.key === ' '
    ) {
      e.preventDefault();
      e.stopPropagation();
      triggerFlip(getNextLevel());
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      triggerFlip(getPrevLevel());
    }
  };

  const currentWorld: World = worldOf(displayLevel);
  const figures = getFiguresForWorld(displayLevel);

  return (
    <div className={`lantern w-${currentWorld.slug}${isFlipping ? ' flipping' : ''}`}>
      <div
        className={`lantern-body${isFlipping ? ' flipping' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Đèn kéo quân: bấm để đổi thế giới"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={currentWorld.name}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <img
          className="lantern-art"
          src="/book/mech/den-keo-quan.webp"
          alt=""
          onError={() => console.log('[art missing] /book/mech/den-keo-quan.webp')}
        />
        <div className="lantern-window">
          <div className="lantern-reel">
            {figures.map((figNum, idx) => {
              const src = `/book/mech/bong/part-${figNum}.webp`;
              return (
                <img
                  key={`${figNum}-${idx}`}
                  className="lantern-figure"
                  src={src}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    console.log(`[art missing] ${src}`);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div
        className="lantern-tag"
        onClick={() => {
          if (!isFlipping) triggerFlip(getNextLevel());
        }}
      >
        <span className="lantern-tag-name">{currentWorld.short}</span>
        <span className="lantern-tag-sep">·</span>
        <span className="lantern-tag-hint">bấm · quay đèn</span>
      </div>
    </div>
  );
}
