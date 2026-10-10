import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE,
  COPY,
  COMPARE,
  PART_LABELS_VI,
  partAt,
  fullSrc,
  garmentById,
  gidOf,
} from '../data';
import { useStore, Side } from '../state';
import { useGarment } from '../book/useGarment';
import Stand, { Cast } from '../paper/Stand';
import LiftFlap from '../paper/LiftFlap';
import { snap } from '../audio/paper';
import { say } from '../nghe/say';
import './compare.css';

export interface CompareProps {
  chapter?: string;
  side?: Side;
  page?: 'L' | 'R';
}

interface ComparePair {
  otherName: string;
  otherImg?: string;
  otherDoll?: string;
  otherIsViet: boolean;
  box?: number[];
}

// ----------------------------------------------------
// Left Page: Easel & Pull Tab (P1, P2, P5)
// ----------------------------------------------------
export function CompareLeft({ chapter, side }: CompareProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const [t, setT] = useState<number>(0);
  const [dragT, setDragT] = useState<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startTRef = useRef<number>(0);
  const movedRef = useRef<boolean>(false);

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  // 4. Nghê says COPY.hints.compare on mount
  useEffect(() => {
    say(COPY.hints.compare);
  }, [currentChapter]);

  // Positions and Copy
  const P = STAGE.spreads.compare;
  const CC = COPY.compare;
  const compareMap = COMPARE as unknown as Record<
    string,
    { nu: ComparePair | null; nam: ComparePair | null } | undefined
  >;
  const C = compareMap[currentChapter] || compareMap[gidOf(currentChapter, currentSide)];

  // 1. The pair: pair = C[side]. If null, use other side
  const otherSide: Side = currentSide === 'nu' ? 'nam' : 'nu';
  let pair = C ? C[currentSide] : null;
  let effectiveSide: Side = currentSide;
  let note = '';

  if (!pair && C) {
    pair = C[otherSide];
    effectiveSide = otherSide;
    const sideLabel = (COPY.side as Record<string, string | undefined>)[otherSide] || otherSide;
    note = CC.otherSide.replace('{side}', sideLabel);
  }

  // Window geometry
  const easelW = P.L.easel.w; // 450
  const easelH = P.L.easel.h; // 480
  const winW = easelW - 26 - 26; // 398
  const winH = easelH - 26 - 44; // 410

  // Scaled 300x400 box
  const s = winH / 400; // 1.025
  const boxW = 300 * s; // 307.5
  const boxH = 410;
  const boxLeft = (winW - boxW) / 2; // 45.25

  // 12 vertical slats
  const numSlats = 12;
  const slatW = winW / numSlats;

  // Picture A (Việt phục)
  const picASrc = fullSrc(currentChapter, effectiveSide);

  // Picture B
  const picBSrc = pair?.otherImg
    ? pair.otherImg
    : pair?.otherDoll
    ? fullSrc(pair.otherDoll, effectiveSide)
    : '';

  const effectiveT = dragT !== null ? dragT : t;
  const isDragging = dragT !== null;

  // Pull travel: up to 90px
  const maxTravel = 90;
  const pullDistance = effectiveT * maxTravel;

  // Drag handlers for pull-tab
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startTRef.current = t;
    movedRef.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    if (Math.abs(deltaX) > 4) {
      movedRef.current = true;
    }
    // Pulling left = negative deltaX = positive distance
    const pulledPx = -deltaX;
    const newDistance = Math.max(
      0,
      Math.min(maxTravel, startTRef.current * maxTravel + pulledPx)
    );
    setDragT(newDistance / maxTravel);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }

    if (!movedRef.current) {
      // Tap (no drag) toggles 0 <-> 1
      setT((prev) => (prev >= 0.5 ? 0 : 1));
      setDragT(null);
      snap();
      return;
    }

    // Release: springs to nearer end
    if (dragT !== null) {
      setT(dragT >= 0.5 ? 1 : 0);
      snap();
    }
    setDragT(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setT((prev) => (prev >= 0.5 ? 0 : 1));
      snap();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setT(1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setT(0);
    }
  };

  // Floor
  const floorSrc = (
    STAGE.chapters as Record<string, { floor?: string } | undefined>
  )[currentChapter]?.floor;

  return (
    <div className="compare-page">
      {/* Floor */}
      {floorSrc ? (
        <div
          className="compare-floor"
          style={{ backgroundImage: `url("${floorSrc}")` }}
          aria-hidden="true"
        />
      ) : null}

      {/* Cast shadow */}
      <div className="compare-casts">
        <Cast
          ref={getCastRef('easel')}
          x={P.L.easel.x}
          y={P.L.easel.y}
          w={P.L.easel.w}
        />
      </div>

      {/* 2. Easel Stand */}
      <Stand
        key="easel"
        noCast
        castRef={getCastRef('easel')}
        x={P.L.easel.x}
        y={P.L.easel.y}
        w={P.L.easel.w}
        h={P.L.easel.h}
        d={P.L.easel.d}
        rest={P.L.easel.rest ?? 0.84}
        tabs={[90, P.L.easel.w - 136]}
        style={{ '--up': P.L.easel.rest ?? 0.84 } as React.CSSProperties}
        className="compare-easel-stand"
      >
        <div className="compare-easel-card">
          {/* Strut behind easel (P5) */}
          <div className="compare-easel-strut" aria-hidden="true" />

          {/* Window */}
          <div className="compare-easel-window">
            {/* Picture A (Việt phục) - base layer */}
            <div
              style={{
                position: 'absolute',
                left: `${boxLeft}px`,
                top: 0,
                width: `${boxW}px`,
                height: `${boxH}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={picASrc}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={() => console.log(`[art missing] ${picASrc}`)}
              />
            </div>

            {/* Over Picture A: Picture B cut into 12 vertical slats */}
            {Array.from({ length: numSlats }).map((_, k) => {
              const slatLeft = k * slatW;
              const innerLeft = boxLeft - slatLeft;

              return (
                <div
                  key={k}
                  className={`compare-slat${isDragging ? ' is-dragging' : ''}`}
                  style={{
                    left: `${slatLeft}px`,
                    width: `${effectiveT * slatW}px`,
                  }}
                  aria-hidden="true"
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: `${innerLeft}px`,
                      top: 0,
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                    }}
                  >
                    {pair?.otherImg && pair.box ? (
                      <img
                        src={picBSrc}
                        alt=""
                        style={{
                          position: 'absolute',
                          top: `${pair.box[1] * boxH}px`,
                          height: `${(pair.box[3] - pair.box[1]) * boxH}px`,
                          left: `${((pair.box[0] + pair.box[2]) / 2) * boxW}px`,
                          transform: 'translateX(-50%)',
                          width: 'auto',
                        }}
                        onError={() => console.log(`[art missing] ${picBSrc}`)}
                      />
                    ) : (
                      <img
                        src={picBSrc}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={() => console.log(`[art missing] ${picBSrc}`)}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Labels in the window */}
            <div
              className="compare-label-viet"
              style={{ opacity: effectiveT > 0.5 ? 0.35 : 1 }}
            >
              {CC.viet}
            </div>

            {pair?.otherName ? (
              <div
                className="compare-label-other"
                style={{ opacity: effectiveT > 0.5 ? 1 : 0 }}
              >
                {pair.otherName}
              </div>
            ) : null}

            {pair && !pair.otherIsViet ? (
              <div
                className="compare-stamp-not-viet"
                style={{ opacity: effectiveT > 0.5 ? 1 : 0 }}
              >
                {CC.notViet}
              </div>
            ) : null}

            {note ? (
              <div className="compare-other-note">
                {note}
              </div>
            ) : null}
          </div>

          {/* Dark slot line under window */}
          <div className="compare-easel-slot-line" aria-hidden="true" />
        </div>
      </Stand>

      {/* 3. Slot cut at page's outer edge (P2) */}
      <div
        className="compare-page-slot"
        style={{
          left: `${P.L.slot.x}px`,
          top: `${P.L.slot.y}px`,
          height: `${P.L.slot.h}px`,
        }}
        aria-hidden="true"
      />

      {/* Pull-tab lying flat outside page (P2) */}
      <button
        type="button"
        className={`compare-pull-tab${isDragging ? ' is-dragging' : ''}`}
        style={{
          left: `${P.L.pull.x}px`,
          top: `${P.L.pull.y}px`,
          width: `${P.L.pull.w}px`,
          height: `${P.L.pull.h}px`,
          transform: `translateZ(0.6px) translateX(-${pullDistance}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label={CC.pull}
        aria-valuenow={Math.round(effectiveT * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
      >
        ‹ {CC.pull}
      </button>
    </div>
  );
}

// ----------------------------------------------------
// Right Page: The Card & The Flaps (P3)
// ----------------------------------------------------
export function CompareRight({ chapter, side }: CompareProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  const P = STAGE.spreads.compare;
  const CC = COPY.compare;
  const compareMap = COMPARE as unknown as Record<
    string,
    {
      nu: ComparePair | null;
      nam: ComparePair | null;
      hotspots?: Array<{ part: string }>;
    } | undefined
  >;
  const C = compareMap[currentChapter] || compareMap[gidOf(currentChapter, currentSide)];

  // Resolve pair & note
  const otherSide: Side = currentSide === 'nu' ? 'nam' : 'nu';
  let pair = C ? C[currentSide] : null;
  let effectiveSide: Side = currentSide;
  let note = '';

  if (!pair && C) {
    pair = C[otherSide];
    effectiveSide = otherSide;
    const sideLabel = (COPY.side as Record<string, string | undefined>)[otherSide] || otherSide;
    note = CC.otherSide.replace('{side}', sideLabel);
  }

  // Eyebrow (spread 4: Trang 4 · Đừng nhầm)
  const eyebrowText = `${COPY.spreadPage.replace('{n}', '4')} · ${COPY.spreads.compare}`;

  // Difference description
  const howVi = g?.dont_confuse_with?.[0]?.how_vi || '';

  // The three part keys: named in C.hotspots, then collar, closure, sleeves, hem without repeats
  const hotspotParts = C?.hotspots?.map((h) => h.part) || [];
  const fallbackParts = ['collar', 'closure', 'sleeves', 'hem'];
  const candidateParts = [...hotspotParts, ...fallbackParts];
  const threeKeys: string[] = [];
  for (const k of candidateParts) {
    if (!threeKeys.includes(k)) {
      threeKeys.push(k);
      if (threeKeys.length === 3) break;
    }
  }

  // Pictures A & B
  const picASrc = fullSrc(currentChapter, effectiveSide);
  const picBSrc = pair?.otherImg
    ? pair.otherImg
    : pair?.otherDoll
    ? fullSrc(pair.otherDoll, effectiveSide)
    : '';

  // Reference 300x400 box at zoom 2.2
  const zoom = 2.2;
  const zoomW = 300 * zoom; // 660px
  const zoomH = 400 * zoom; // 880px

  // Other doll garment for structure[key]
  const otherG = pair?.otherDoll
    ? garmentById(gidOf(pair.otherDoll, effectiveSide))
    : undefined;

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

  // 1. The card: a Stand with P.R.card (rest .97, tabs at 120 and w - 166)
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
          className="compare-title-card"
          style={{ backgroundImage: `url("${STAGE.paper.titleCard}")` }}
        >
          {/* Eyebrow */}
          <div className="compare-eyebrow">{eyebrowText}</div>

          {/* <g.name> ≠ <pair.otherName> */}
          <h1 className="compare-title-row">
            {g?.name} <span className="compare-diff-sym">≠</span> {pair?.otherName}
          </h1>

          {/* Note (if any) in the aka style */}
          {note ? <div className="compare-aka-note">{note}</div> : null}

          {/* CC.diff */}
          <h2 className="compare-diff-heading">{CC.diff}</h2>

          {/* g.dont_confuse_with[0].how_vi */}
          <p className="compare-diff-text">{howVi}</p>
        </div>
      </Stand>
    ),
  });

  // 2. The flaps: a Stand with P.R.flaps (tabs at 90 and w - 136)
  rightStands.push({
    id: 'flaps',
    y: P.R.flaps.y,
    castConfig: {
      x: P.R.flaps.x,
      y: P.R.flaps.y,
      w: P.R.flaps.w,
    },
    render: () => (
      <Stand
        key="flaps"
        noCast
        castRef={getCastRef('flaps')}
        x={P.R.flaps.x}
        y={P.R.flaps.y}
        w={P.R.flaps.w}
        h={P.R.flaps.h}
        d={P.R.flaps.d}
        tabs={[90, P.R.flaps.w - 136]}
      >
        <div
          className="compare-flaps-card"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
        >
          {/* Black label CC.liftHint at top-left */}
          <span className="compare-lift-badge">{CC.liftHint}</span>

          {/* Row of three cells */}
          <div className="compare-flaps-row">
            {threeKeys.map((key) => {
              const pt = g ? partAt(g, key) : { x: 0.5, y: 0.5 };
              const targetX = pt.x * zoomW;
              const targetY = pt.y * zoomH;

              // Structure texts
              const gStructRaw = (
                g?.structure as Record<string, string | string[] | undefined> | undefined
              )?.[key];
              const gStructText = Array.isArray(gStructRaw)
                ? gStructRaw.join(', ')
                : gStructRaw || '';

              const otherStructRaw = (
                otherG?.structure as Record<string, string | string[] | undefined> | undefined
              )?.[key];
              const otherStructText = Array.isArray(otherStructRaw)
                ? otherStructRaw.join(', ')
                : otherStructRaw || '';

              return (
                <div key={key} className="compare-cell">
                  <LiftFlap
                    hint={CC.flapHint}
                    top={
                      <div className="compare-cell-top">
                        {/* PART_LABELS_VI[key] */}
                        <div className="compare-cell-title-top">
                          {PART_LABELS_VI[key] || key}
                        </div>

                        {/* Close-up 118px of picture A */}
                        <div className="compare-cell-viewport">
                          <div
                            style={{
                              position: 'absolute',
                              left: `calc(50% - ${targetX}px)`,
                              top: `calc(59px - ${targetY}px)`,
                              width: `${zoomW}px`,
                              height: `${zoomH}px`,
                              pointerEvents: 'none',
                            }}
                          >
                            <img
                              src={picASrc}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                              onError={() => console.log(`[art missing] ${picASrc}`)}
                            />
                          </div>
                        </div>

                        {/* g.structure[key] */}
                        {gStructText ? (
                          <div className="compare-cell-desc">
                            {gStructText}
                          </div>
                        ) : null}
                      </div>
                    }
                    base={
                      <div className="compare-cell-base">
                        {/* pair.otherName */}
                        <div className="compare-cell-title-base">
                          {pair?.otherName}
                        </div>

                        {/* Same close-up of picture B */}
                        <div className="compare-cell-viewport compare-cell-viewport-base">
                          <div
                            style={{
                              position: 'absolute',
                              left: `calc(50% - ${targetX}px)`,
                              top: `calc(59px - ${targetY}px)`,
                              width: `${zoomW}px`,
                              height: `${zoomH}px`,
                              pointerEvents: 'none',
                            }}
                          >
                            {pair?.otherImg && pair.box ? (
                              <img
                                src={picBSrc}
                                alt=""
                                style={{
                                  position: 'absolute',
                                  top: `${pair.box[1] * zoomH}px`,
                                  height: `${(pair.box[3] - pair.box[1]) * zoomH}px`,
                                  left: `${((pair.box[0] + pair.box[2]) / 2) * zoomW}px`,
                                  transform: 'translateX(-50%)',
                                  width: 'auto',
                                }}
                                onError={() => console.log(`[art missing] ${picBSrc}`)}
                              />
                            ) : (
                              <img
                                src={picBSrc}
                                alt=""
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                }}
                                onError={() => console.log(`[art missing] ${picBSrc}`)}
                              />
                            )}
                          </div>
                        </div>

                        {/* other garment structure[key] when pair.otherDoll is set */}
                        {otherStructText ? (
                          <div className="compare-cell-desc">
                            {otherStructText}
                          </div>
                        ) : null}
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Stand>
    ),
  });

  // Sort far first (ascending y)
  rightStands.sort((a, b) => a.y - b.y);

  return (
    <div className="compare-right-page">
      {/* Thin red frame from prompt 12 */}
      <div className="compare-red-frame" aria-hidden="true" />

      {/* Cast shadows */}
      <div className="compare-casts">
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
export default function Compare({
  chapter,
  side,
  page = 'L',
}: CompareProps) {
  if (page === 'R') {
    return <CompareRight chapter={chapter} side={side} />;
  }
  return <CompareLeft chapter={chapter} side={side} />;
}
