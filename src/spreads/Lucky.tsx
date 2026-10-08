import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { COPY, PRESETS, gidOf, Preset } from '../data';
import { Side } from '../state';
import { useStepped, isReducedMotion, jitter } from '../paper/motion';
import { whoosh, rustle, snap } from '../audio/paper';
import { useFocusTrap } from '../paper/focusTrap';
import './lucky.css';

export interface LuckyProps {
  chapter: string;
  side: Side;
  onClose: () => void;
  onApplyPreset: (preset: Preset, immediate?: boolean) => void;
}

let lastPresetId: string | null = null;

export function pickRandomPreset(side: Side, gid: string): Preset | null {
  const matching = PRESETS.filter(
    (p) => p.side === side && p.garment_id === gid
  );
  if (matching.length === 0) return null;

  const available = matching.filter((p) => p.id !== lastPresetId);
  const pool = available.length > 0 ? available : matching;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  lastPresetId = chosen.id;
  return chosen;
}

export default function Lucky({
  chapter,
  side,
  onClose,
  onApplyPreset,
}: LuckyProps) {
  const gid = gidOf(chapter, side);
  const reduced = isReducedMotion();

  // Directions from COPY.mix.luckyDirs: [Đông, Tây, Nam, Bắc]
  const dirs = COPY.mix.luckyDirs; // ['Đông', 'Tây', 'Nam', 'Bắc']

  // Pre-choose preset and winning direction on mount
  const chosenPreset = useMemo(
    () => pickRandomPreset(side, gid),
    [side, gid]
  );
  const [winningDirIndex] = useState(() => Math.floor(Math.random() * 4));
  // 3 to 6 cycles
  const [totalCycles] = useState(
    () => Math.floor(Math.random() * 4) + 3 // 3, 4, 5, or 6
  );

  // Animation phase: 'playing' | 'stopped' | 'folding' | 'done'
  const [phase, setPhase] = useState<'playing' | 'stopped' | 'folding' | 'done'>(
    reduced ? 'done' : 'playing'
  );

  // Stepped clock at 12 fps
  const step = useStepped(12);
  const [currentFrame, setCurrentFrame] = useState(0);
  const prevStepRef = useRef(step);

  // Skip / dismiss immediately (used by Escape or click or reduced motion)
  const handleSkip = () => {
    if (chosenPreset) {
      onApplyPreset(chosenPreset, true);
    }
    onClose();
  };

  // Focus trap for dialog: Escape skips, restores focus to lucky button on close
  const dialogRef = useFocusTrap(phase !== 'done', handleSkip);

  // Reduced motion: apply preset immediately
  useEffect(() => {
    if (reduced) {
      if (chosenPreset) {
        onApplyPreset(chosenPreset, true);
      }
      onClose();
    }
  }, [reduced]);

  // Play whoosh on mount when Bốc thăm begins
  useEffect(() => {
    if (!reduced) {
      whoosh();
    }
  }, [reduced]);

  // Total frames in opening/closing animation: 4 frames per cycle
  const totalAnimFrames = totalCycles * 4;

  useEffect(() => {
    if (reduced || phase !== 'playing') return;

    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      setCurrentFrame((f) => {
        const next = f + 1;
        if (next >= totalAnimFrames) {
          setPhase('stopped');
          snap();
          return totalAnimFrames;
        }
        return next;
      });
    }
  }, [step, reduced, phase, totalAnimFrames]);

  // Play rustle on peak open of each cycle
  useEffect(() => {
    if (phase !== 'playing') return;
    const cycleFrame = currentFrame % 4;
    if (cycleFrame === 1) {
      rustle();
    }
  }, [currentFrame, phase]);

  // When stopped on winning direction: wait 450ms, then fold away, then apply preset
  useEffect(() => {
    if (phase === 'stopped') {
      const timer = setTimeout(() => {
        setPhase('folding');
      }, 450);
      return () => clearTimeout(timer);
    }

    if (phase === 'folding') {
      const timer = setTimeout(() => {
        setPhase('done');
        if (chosenPreset) {
          onApplyPreset(chosenPreset, false);
        }
        onClose();
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [phase, chosenPreset, onApplyPreset, onClose]);

  if (reduced || phase === 'done') {
    return null;
  }

  // Calculate opening separation (18px max) and orientation (horizontal vs vertical)
  let sep = 0;
  let isHorizontal = true;

  if (phase === 'playing') {
    const cycleIndex = Math.floor(currentFrame / 4);
    const cycleProgress = currentFrame % 4; // 0, 1, 2, 3
    isHorizontal = cycleIndex % 2 === 0;

    if (cycleProgress === 0) sep = 9;
    else if (cycleProgress === 1) sep = 18;
    else if (cycleProgress === 2) sep = 9;
    else sep = 0;
  } else {
    // Stopped on winning direction: stay open on that axis
    // 0: Đông (horiz), 1: Tây (horiz), 2: Nam (vert), 3: Bắc (vert)
    isHorizontal = winningDirIndex === 0 || winningDirIndex === 1;
    sep = 18;
  }

  const j = jitter(currentFrame, totalCycles);

  // Compute triangle transforms
  let northTransform = '';
  let southTransform = '';
  let eastTransform = '';
  let westTransform = '';

  if (isHorizontal) {
    westTransform = `translate3d(${-sep + j.dx}px, ${j.dy}px, 0)`;
    eastTransform = `translate3d(${sep + j.dx}px, ${j.dy}px, 0)`;
    northTransform = `translate3d(${j.dx}px, ${j.dy}px, 0)`;
    southTransform = `translate3d(${j.dx}px, ${j.dy}px, 0)`;
  } else {
    northTransform = `translate3d(${j.dx}px, ${-sep + j.dy}px, 0)`;
    southTransform = `translate3d(${j.dx}px, ${sep + j.dy}px, 0)`;
    eastTransform = `translate3d(${j.dx}px, ${j.dy}px, 0)`;
    westTransform = `translate3d(${j.dx}px, ${j.dy}px, 0)`;
  }

  const isWinning = (dirIdx: number) =>
    (phase === 'stopped' || phase === 'folding') &&
    winningDirIndex === dirIdx;

  const content = (
    <div
      ref={dialogRef}
      className="lucky-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.mix.lucky}
      onClick={handleSkip}
    >
      <div
        className={`lucky-teller${phase === 'folding' ? ' folding-away' : ''}`}
        style={
          j.rot && phase === 'playing'
            ? { transform: `rotate(${j.rot}deg)` }
            : undefined
        }
      >
        {/* 1. North / Top triangle: Bắc (index 3) - var(--card) */}
        <div
          className="lucky-triangle lucky-triangle-north"
          style={{ transform: northTransform }}
        >
          <span
            className={`lucky-dir-label lucky-dir-label-north${
              isWinning(3) ? ' highlighted' : ''
            }`}
          >
            {dirs[3] || 'Bắc'}
          </span>
        </div>

        {/* 2. East / Right triangle: Đông (index 0) - var(--do-2) */}
        <div
          className="lucky-triangle lucky-triangle-east"
          style={{ transform: eastTransform }}
        >
          <span
            className={`lucky-dir-label lucky-dir-label-east${
              isWinning(0) ? ' highlighted' : ''
            }`}
          >
            {dirs[0] || 'Đông'}
          </span>
        </div>

        {/* 3. South / Bottom triangle: Nam (index 2) - var(--card) */}
        <div
          className="lucky-triangle lucky-triangle-south"
          style={{ transform: southTransform }}
        >
          <span
            className={`lucky-dir-label lucky-dir-label-south${
              isWinning(2) ? ' highlighted' : ''
            }`}
          >
            {dirs[2] || 'Nam'}
          </span>
        </div>

        {/* 4. West / Left triangle: Tây (index 1) - var(--do-2) */}
        <div
          className="lucky-triangle lucky-triangle-west"
          style={{ transform: westTransform }}
        >
          <span
            className={`lucky-dir-label lucky-dir-label-west${
              isWinning(1) ? ' highlighted' : ''
            }`}
          >
            {dirs[1] || 'Tây'}
          </span>
        </div>

        {/* Thin ink fold lines along creases */}
        <svg
          className="lucky-fold-lines"
          viewBox="0 0 220 220"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="0"
            x2="220"
            y2="220"
            stroke="rgba(42, 33, 27, 0.4)"
            strokeWidth="1"
          />
          <line
            x1="220"
            y1="0"
            x2="0"
            y2="220"
            stroke="rgba(42, 33, 27, 0.4)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* COPY.mix.luckyHint under the fortune teller */}
      <div className="lucky-hint">{COPY.mix.luckyHint}</div>
    </div>
  );

  const container =
    (typeof document !== 'undefined' &&
      document.querySelector('.design-frame-canvas')) ||
    (typeof document !== 'undefined' && document.body);

  if (!container) return null;

  return createPortal(content, container);
}
