import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE,
  COPY,
  fullSrc,
  garmentById,
  gidOf,
  sourceById,
  SOURCES,
  GarmentTimelineItem,
} from '../data';
import { useStore, Side } from '../state';
import { useGarment } from '../book/useGarment';
import Stand, { Cast } from '../paper/Stand';
import { say } from '../nghe/say';
import './story.css';

export interface StoryProps {
  chapter?: string;
  side?: Side;
  page?: 'L' | 'R';
}

// ----------------------------------------------------
// Shared Spread State between Left & Right Page
// ----------------------------------------------------
const storyListeners = new Set<() => void>();
let currentStorySel = 0;

export function setStorySel(idx: number) {
  if (currentStorySel === idx) return;
  currentStorySel = idx;
  storyListeners.forEach((fn) => fn());
}

export function useStorySpreadState(chapter: string, totalEntries: number) {
  const prevChapterRef = useRef(chapter);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (prevChapterRef.current !== chapter) {
      prevChapterRef.current = chapter;
      currentStorySel = 0;
    }
    const update = () => setTick((t) => t + 1);
    storyListeners.add(update);
    return () => {
      storyListeners.delete(update);
    };
  }, [chapter]);

  // Ensure currentStorySel stays within range
  const safeSel =
    totalEntries > 0 ? ((currentStorySel % totalEntries) + totalEntries) % totalEntries : 0;

  return {
    sel: safeSel,
    setSel: (target: number | ((prev: number) => number)) => {
      if (typeof target === 'function') {
        const next = target(safeSel);
        const wrapped = totalEntries > 0 ? ((next % totalEntries) + totalEntries) % totalEntries : 0;
        setStorySel(wrapped);
      } else {
        const wrapped = totalEntries > 0 ? ((target % totalEntries) + totalEntries) % totalEntries : 0;
        setStorySel(wrapped);
      }
    },
  };
}

// ----------------------------------------------------
// Left Page: Back card, Doll, Volvelle Wheel (P4)
// ----------------------------------------------------
export function StoryLeft({ chapter, side }: StoryProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;
  const T: GarmentTimelineItem[] = useMemo(() => g?.timeline ?? [], [g]);

  const { sel, setSel } = useStorySpreadState(currentChapter, T.length);
  const [missingImgs, setMissingImgs] = useState<Record<string, boolean>>({});

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  function handleArtError(src: string) {
    console.log(`[art missing] ${src}`);
    setMissingImgs((prev) => ({ ...prev, [src]: true }));
  }

  // 7. Nghê says COPY.hints.story on mount
  useEffect(() => {
    say(COPY.hints.story);
  }, [currentChapter]);

  const P = STAGE.spreads.story;

  // Floor
  const floorSrc = (
    STAGE.chapters as Record<string, { floor?: string } | undefined>
  )[currentChapter]?.floor;

  // Wheel math:
  // step = 360 / max(T.length, 6)
  // angle a = -45 + i * step
  // radius = w * 0.36
  const wheelW = P.L.wheel.w;
  const step = 360 / Math.max(T.length, 6);
  const R = wheelW * 0.36; // 144px

  // Drag interaction around center
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const startPointerAngleRef = useRef(0);
  const startSelAngleRef = useRef(0);
  const pointerMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

    isDraggingRef.current = true;
    pointerMovedRef.current = false;
    startPointerAngleRef.current = angle;
    startSelAngleRef.current = -sel * step;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

    let delta = angle - startPointerAngleRef.current;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    if (Math.abs(delta) > 3) {
      pointerMovedRef.current = true;
    }

    setDragAngle(startSelAngleRef.current + delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }

    if (!pointerMovedRef.current) {
      // Tap / click: advance to next entry
      setDragAngle(null);
      setSel((prev) => (prev + 1) % T.length);
      return;
    }

    if (dragAngle !== null) {
      // Snaps to nearest entry on release
      const target = Math.round(-dragAngle / step);
      const n = Math.max(1, T.length);
      const normalizedIndex = ((target % n) + n) % n;
      setDragAngle(null);
      setSel(normalizedIndex);
    } else {
      setDragAngle(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((prev) => (prev + 1) % T.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((prev) => (prev - 1 + T.length) % T.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSel((prev) => (prev + 1) % T.length);
    }
  };

  const currentLayerRotation =
    dragAngle !== null ? dragAngle : -sel * step;

  const backCardSrc = `/popcard/${currentChapter}/back.webp`;
  const dollSrc = fullSrc(currentChapter, currentSide);

  interface LeftStandItem {
    id: string;
    y: number;
    render: () => React.ReactNode;
    castConfig: {
      x?: number;
      r?: number;
      y: number;
      w?: number;
    };
  }

  const leftStands: LeftStandItem[] = [];

  // 1. Back card: as a Stand at x 85, y 90, w 400, h 300
  leftStands.push({
    id: 'backCard',
    y: 90,
    castConfig: {
      x: 85,
      y: 90,
      w: 400,
    },
    render: () => (
      <Stand
        key="backCard"
        noCast
        castRef={getCastRef('backCard')}
        x={85}
        y={90}
        w={400}
        h={300}
        d={0.04}
        tabs={[120, 280]}
      >
        {!missingImgs[backCardSrc] ? (
          <img
            src={backCardSrc}
            alt=""
            style={{ width: '400px', height: '300px', objectFit: 'contain' }}
            className="story-die-cut"
            onError={() => handleArtError(backCardSrc)}
          />
        ) : null}
      </Stand>
    ),
  });

  // 2. Doll: fullSrc(chapter, side) as a Stand with P.L.doll
  leftStands.push({
    id: 'doll',
    y: P.L.doll.y,
    castConfig: {
      r: P.L.doll.r,
      y: P.L.doll.y,
      w: P.L.doll.w,
    },
    render: () => (
      <Stand
        key="doll"
        noCast
        castRef={getCastRef('doll')}
        r={P.L.doll.r}
        y={P.L.doll.y}
        w={P.L.doll.w}
        h={P.L.doll.h}
        d={P.L.doll.d}
        tabs={[P.L.doll.w / 2 - 23]}
      >
        {!missingImgs[dollSrc] ? (
          <img
            src={dollSrc}
            alt=""
            style={{
              width: `${P.L.doll.w}px`,
              height: `${P.L.doll.h}px`,
              objectFit: 'contain',
            }}
            className="story-die-cut"
            onError={() => handleArtError(dollSrc)}
          />
        ) : null}
      </Stand>
    ),
  });

  // 3. The wheel (P4): a Stand with P.L.wheel (tabs at 100 and w - 146)
  leftStands.push({
    id: 'wheel',
    y: P.L.wheel.y,
    castConfig: {
      x: P.L.wheel.x,
      y: P.L.wheel.y,
      w: P.L.wheel.w,
    },
    render: () => (
      <Stand
        key="wheel"
        noCast
        castRef={getCastRef('wheel')}
        x={P.L.wheel.x}
        y={P.L.wheel.y}
        w={P.L.wheel.w}
        h={P.L.wheel.h}
        d={P.L.wheel.d}
        tabs={[100, P.L.wheel.w - 146]}
        className="story-wheel-stand"
      >
        <div
          ref={wheelRef}
          className="story-wheel-container"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Bánh xe thời gian"
        >
          {/* Rotating layer with wheel-base.webp and years */}
          <div
            className={`story-wheel-rotating-layer${
              dragAngle !== null ? ' is-dragging' : ''
            }`}
            style={{
              transform: `rotate(${currentLayerRotation}deg)`,
            }}
          >
            {T.map((entry, idx) => {
              const a = -45 + idx * step;
              const rad = (a * Math.PI) / 180;
              const xPos = R * Math.cos(rad);
              const yPos = R * Math.sin(rad);

              return (
                <div
                  key={`${entry.year}-${idx}`}
                  className="story-wheel-year"
                  style={{
                    transform: `translate(-50%, -50%) translate(${xPos}px, ${yPos}px) rotate(${
                      a + 90
                    }deg)`,
                  }}
                >
                  {entry.year}
                </div>
              );
            })}
          </div>

          {/* On top, fixed, wheel-cover.webp with window and brass pin */}
          <div className="story-wheel-cover" aria-hidden="true" />
        </div>
      </Stand>
    ),
  });

  // Sort far first (ascending y)
  leftStands.sort((a, b) => a.y - b.y);

  return (
    <div className="story-page">
      {/* Floor */}
      {floorSrc && !missingImgs[floorSrc] ? (
        <div
          className="story-floor"
          style={{ backgroundImage: `url("${floorSrc}")` }}
          aria-hidden="true"
        />
      ) : null}

      {/* Cast shadows */}
      <div className="story-casts">
        {leftStands.map((item) => (
          <Cast
            key={`cast-${item.id}`}
            ref={getCastRef(item.id)}
            x={item.castConfig.x}
            r={item.castConfig.r}
            y={item.castConfig.y}
            w={item.castConfig.w}
          />
        ))}
      </div>

      {/* Stands */}
      {leftStands.map((item) => item.render())}
    </div>
  );
}

// ----------------------------------------------------
// Right Page: Title Card, Year Dots, Prev/Next Buttons
// ----------------------------------------------------
export function StoryRight({ chapter, side }: StoryProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;
  const T: GarmentTimelineItem[] = useMemo(() => g?.timeline ?? [], [g]);

  const { sel, setSel } = useStorySpreadState(currentChapter, T.length);

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  const P = STAGE.spreads.story;
  const currentEntry = T[sel] || {
    year: '',
    title_vi: '',
    text_vi: '',
    source_ids: [],
  };

  // Eyebrow: spread 3 (Trang 3 · Chuyện áo)
  const eyebrowText = `${COPY.spreadPage.replace('{n}', '3')} · ${COPY.spreads.story}`;

  // Sources line
  const cleanSources = (currentEntry.source_ids || []).map((id: string) => {
    const s = sourceById(id) || SOURCES.find((x) => x.id === id);
    const title = s?.title || id;
    const afterDash = title.includes(' — ') ? title.split(' — ')[1] : title;
    return afterDash.replace(/\s*\([^)]*\)\s*$/, '').trim();
  });

  interface RightStandItem {
    id: string;
    y: number;
    render: () => React.ReactNode;
    castConfig: {
      x?: number;
      r?: number;
      y: number;
      w?: number;
    };
  }

  const rightStands: RightStandItem[] = [];

  // 4. The card: Stand with P.R.card (rest .97)
  rightStands.push({
    id: 'card',
    y: P.R.card.y,
    castConfig: {
      x: P.R.card.x,
      y: P.R.card.y,
      w: P.R.card.w,
    },
    render: () => (
      <Stand
        key="card"
        noCast
        castRef={getCastRef('card')}
        x={P.R.card.x}
        y={P.R.card.y}
        w={P.R.card.w}
        h={P.R.card.h}
        d={P.R.card.d}
        rest={P.R.card.rest ?? 0.97}
        tabs={[120, P.R.card.w - 166]}
        style={{ '--up': P.R.card.rest ?? 0.97 } as React.CSSProperties}
      >
        <div
          className="story-title-card"
          style={{ backgroundImage: `url("${STAGE.paper.titleCard}")` }}
        >
          {/* Eyebrow */}
          <div className="story-eyebrow">{eyebrowText}</div>

          {/* g.name in aka style */}
          {g?.name ? <div className="story-aka-line">{g.name}</div> : null}

          {/* Year */}
          <h1 className="story-year">{currentEntry.year}</h1>

          {/* Title */}
          <h2 className="story-entry-title">{currentEntry.title_vi}</h2>

          {/* Text */}
          <p className="story-entry-text">{currentEntry.text_vi}</p>

          {/* Sources line */}
          {cleanSources.length > 0 ? (
            <div className="story-sources-line">
              <span className="story-sources-label">{COPY.story.source}</span>{' '}
              {cleanSources.join(' · ')}
            </div>
          ) : null}
        </div>
      </Stand>
    ),
  });

  // 6. Two buttons as Stands: P.R.prev & P.R.next
  rightStands.push({
    id: 'prev',
    y: P.R.prev.y,
    castConfig: {
      x: P.R.prev.x,
      y: P.R.prev.y,
      w: P.R.prev.w,
    },
    render: () => (
      <Stand
        key="prev"
        noCast
        castRef={getCastRef('prev')}
        x={P.R.prev.x}
        y={P.R.prev.y}
        w={P.R.prev.w}
        h={P.R.prev.h}
        d={P.R.prev.d}
        tabs={[50, P.R.prev.w - 70]}
      >
        <button
          type="button"
          className="story-btn-prev"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
          onClick={() => setSel((prev) => (prev - 1 + T.length) % T.length)}
          aria-label={`Trước: ${T[(sel - 1 + T.length) % T.length]?.year}`}
        >
          ‹ {COPY.story.turn}
        </button>
      </Stand>
    ),
  });

  rightStands.push({
    id: 'next',
    y: P.R.next.y,
    castConfig: {
      r: P.R.next.r,
      y: P.R.next.y,
      w: P.R.next.w,
    },
    render: () => (
      <Stand
        key="next"
        noCast
        castRef={getCastRef('next')}
        r={P.R.next.r}
        y={P.R.next.y}
        w={P.R.next.w}
        h={P.R.next.h}
        d={P.R.next.d}
        tabs={[50, P.R.next.w - 70]}
      >
        <button
          type="button"
          className="story-btn-next"
          style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}
          onClick={() => setSel((prev) => (prev + 1) % T.length)}
          aria-label={`Tiếp: ${T[(sel + 1) % T.length]?.year}`}
        >
          {COPY.story.turn} ›
        </button>
      </Stand>
    ),
  });

  // Sort far first (ascending y)
  rightStands.sort((a, b) => a.y - b.y);

  return (
    <div className="story-right-page">
      {/* Thin red frame from prompt 12 */}
      <div className="story-red-frame" aria-hidden="true" />

      {/* 5. The year dots lying flat at P.R.dots */}
      {T.length > 0 ? (
        <div
          className="story-dots-row"
          style={{
            left: `${P.R.dots.x}px`,
            top: `${P.R.dots.y}px`,
            width: `${P.R.dots.w}px`,
          }}
        >
          {T.map((entry, idx) => {
            const isActive = sel === idx;

            return (
              <button
                key={`${entry.year}-${idx}`}
                type="button"
                className={`story-dot-btn${isActive ? ' active' : ''}`}
                onClick={() => setSel(idx)}
                aria-label={entry.year}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="story-dot-circle" aria-hidden="true" />
                <span className="story-dot-year">{entry.year}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Cast shadows */}
      <div className="story-casts">
        {rightStands.map((item) => (
          <Cast
            key={`cast-${item.id}`}
            ref={getCastRef(item.id)}
            x={item.castConfig.x}
            r={item.castConfig.r}
            y={item.castConfig.y}
            w={item.castConfig.w}
          />
        ))}
      </div>

      {/* Stands */}
      {rightStands.map((item) => item.render())}
    </div>
  );
}

// Default export renders left or right page based on `page` prop
export default function Story({
  chapter,
  side,
  page = 'L',
}: StoryProps) {
  if (page === 'R') {
    return <StoryRight chapter={chapter} side={side} />;
  }
  return <StoryLeft chapter={chapter} side={side} />;
}
