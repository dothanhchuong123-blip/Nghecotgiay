import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE,
  COPY,
  PART_LABELS_VI,
  COMPANIONS,
  fullSrc,
  garmentById,
  gidOf,
  partAt,
  pieceName,
  loadManifest,
  Manifest,
} from '../data';
import { useStore, Side } from '../state';
import { useGarment } from '../book/useGarment';
import Stand, { Cast } from '../paper/Stand';
import PaperDoll from '../doll/PaperDoll';
import LiftFlap from '../paper/LiftFlap';
import { snap } from '../audio/paper';
import { say } from '../nghe/say';
import './parts.css';

export interface PartsProps {
  chapter?: string;
  side?: Side;
  page?: 'L' | 'R';
}

interface DecoDef {
  id: string;
  src: string;
  x?: number;
  r?: number;
  y: number;
  h: number;
  lift?: number;
  level: number;
  d: number;
}

// ----------------------------------------------------
// Shared Spread State between Left & Right Page
// ----------------------------------------------------
interface PartsSpreadState {
  sel: string;
  off: string[];
}

const stateListeners = new Set<() => void>();
let currentPartsSpreadState: PartsSpreadState = {
  sel: 'collar',
  off: [],
};

export function setPartsSel(sel: string) {
  if (currentPartsSpreadState.sel === sel) return;
  currentPartsSpreadState = { ...currentPartsSpreadState, sel };
  stateListeners.forEach((fn) => fn());
}

export function togglePartsOff(id: string) {
  const exists = currentPartsSpreadState.off.includes(id);
  const nextOff = exists
    ? currentPartsSpreadState.off.filter((x) => x !== id)
    : [...currentPartsSpreadState.off, id];
  currentPartsSpreadState = { ...currentPartsSpreadState, off: nextOff };
  stateListeners.forEach((fn) => fn());
}

export function usePartsSpreadState(chapter: string) {
  const prevChapterRef = useRef(chapter);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (prevChapterRef.current !== chapter) {
      prevChapterRef.current = chapter;
      currentPartsSpreadState = { sel: 'collar', off: [] };
    }
    const update = () => setTick((t) => t + 1);
    stateListeners.add(update);
    return () => {
      stateListeners.delete(update);
    };
  }, [chapter]);

  return {
    sel: currentPartsSpreadState.sel,
    off: currentPartsSpreadState.off,
    setSel: setPartsSel,
    toggleOff: togglePartsOff,
  };
}

// ----------------------------------------------------
// Left Page: Doll, Tabs, Magnifier Lens
// ----------------------------------------------------
export function PartsLeft({ chapter, side }: PartsProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const { sel, off, setSel } = usePartsSpreadState(currentChapter);
  const [missingImgs, setMissingImgs] = useState<Record<string, boolean>>({});

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pflapRefs = useRef<(HTMLButtonElement | null)[]>([]);
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

  // 6. Nghê says COPY.hints.parts on mount
  useEffect(() => {
    say(COPY.hints.parts);
  }, [currentChapter]);

  const P = STAGE.spreads.parts;

  // 1. The floor and level 1 chapter decorations
  const floorSrc = (
    STAGE.chapters as Record<
      string,
      { floor?: string; deco?: DecoDef[] } | undefined
    >
  )[currentChapter]?.floor;

  const chapterData = (
    STAGE.chapters as Record<
      string,
      { floor?: string; deco?: DecoDef[] } | undefined
    >
  )[currentChapter];

  const level1Decos: DecoDef[] = useMemo(() => {
    return (chapterData?.deco || []).filter((d) => d.level === 1);
  }, [chapterData]);

  // Parts list
  const parts = useMemo(() => {
    return (
      g?.parts ?? [
        { key: 'collar', x: 0.5, y: 0.26 },
        { key: 'closure', x: 0.38, y: 0.3 },
        { key: 'sleeves', x: 0.32, y: 0.44 },
        { key: 'hem', x: 0.66, y: 0.72 },
        { key: 'worn_with', x: 0.58, y: 0.93 },
      ]
    );
  }, [g]);

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % parts.length;
      setSel(parts[nextIdx].key);
      snap();
      tabRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + parts.length) % parts.length;
      setSel(parts[prevIdx].key);
      snap();
      tabRefs.current[prevIdx]?.focus();
    }
  };

  const dollH = P.L.doll.h;
  const dollW = Math.round(dollH * 0.75);

  const ptSel = g ? partAt(g, sel) : { x: 0.5, y: 0.5 };
  const zoom = 2.6;
  const zoomW = 300 * zoom;
  const zoomH = 400 * zoom;
  const lensInnerRadius = (P.L.lens.w - 18) / 2;
  const lensImgLeft = lensInnerRadius - ptSel.x * zoomW;
  const lensImgTop = lensInnerRadius - ptSel.y * zoomH;
  const fullPictureSrc = fullSrc(currentChapter, currentSide);

  interface StandItem {
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

  const standItems: StandItem[] = [];

  level1Decos.forEach((d) => {
    if (missingImgs[d.src]) return;
    standItems.push({
      id: `deco-${d.id}`,
      y: d.y,
      castConfig: { x: d.x, r: d.r, y: d.y, w: d.h },
      render: () => (
        <Stand
          key={`deco-${d.id}`}
          noCast
          castRef={getCastRef(`deco-${d.id}`)}
          x={d.x}
          r={d.r}
          y={d.y}
          h={d.h}
          lift={d.lift}
          d={d.d}
        >
          <img
            src={d.src}
            alt=""
            style={{ height: `${d.h}px`, width: 'auto' }}
            className="parts-die-cut"
            onError={() => handleArtError(d.src)}
          />
        </Stand>
      ),
    });
  });

  standItems.push({
    id: 'doll',
    y: P.L.doll.y,
    castConfig: {
      x: P.L.doll.x,
      y: P.L.doll.y,
      w: P.L.doll.w,
    },
    render: () => (
      <Stand
        key="doll"
        noCast
        castRef={getCastRef('doll')}
        x={P.L.doll.x}
        y={P.L.doll.y}
        w={P.L.doll.w}
        h={P.L.doll.h}
        d={P.L.doll.d}
        tabs={[P.L.doll.w / 2 - 70, P.L.doll.w / 2 + 24]}
        className="parts-doll-stand"
      >
        <div
          className="parts-doll-box"
          style={{
            width: `${dollW}px`,
            height: `${dollH}px`,
            position: 'relative',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <PaperDoll
            side={currentSide}
            chapter={currentChapter}
            worn={[]}
            off={off}
            height={dollH}
          />

          {parts.map((p, idx) => {
            const pt = g ? partAt(g, p.key) : { x: p.x, y: p.y };
            const isSelected = sel === p.key;
            const label = PART_LABELS_VI[p.key] || p.key;

            return (
              <React.Fragment key={p.key}>
                <button
                  ref={(el) => {
                    pflapRefs.current[idx] = el;
                  }}
                  type="button"
                  className={`pflap${isSelected ? ' selected' : ''}`}
                  style={{
                    left: `${pt.x * dollW}px`,
                    top: `${pt.y * dollH}px`,
                    ['--lift' as string]: isSelected ? '70deg' : '0deg',
                  }}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSel(p.key);
                    snap();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                      e.preventDefault();
                      const nextIdx = (idx + 1) % parts.length;
                      setSel(parts[nextIdx].key);
                      snap();
                      pflapRefs.current[nextIdx]?.focus();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const prevIdx = (idx - 1 + parts.length) % parts.length;
                      setSel(parts[prevIdx].key);
                      snap();
                      pflapRefs.current[prevIdx]?.focus();
                    }
                  }}
                />
                <div
                  className="parts-pin"
                  style={{
                    left: `${pt.x * dollW}px`,
                    top: `${pt.y * dollH}px`,
                  }}
                  aria-hidden="true"
                />
              </React.Fragment>
            );
          })}
        </div>
      </Stand>
    ),
  });

  standItems.push({
    id: 'tabs',
    y: P.L.tabs.y,
    castConfig: {
      x: P.L.tabs.x,
      y: P.L.tabs.y,
      w: P.L.tabs.w,
    },
    render: () => (
      <Stand
        key="tabs"
        noCast
        castRef={getCastRef('tabs')}
        x={P.L.tabs.x}
        y={P.L.tabs.y}
        w={P.L.tabs.w}
        h={P.L.tabs.h}
        d={P.L.tabs.d}
        tabs={[30, 100]}
      >
        <div className="parts-tabs-board">
          {parts.map((p, idx) => {
            const isSelected = sel === p.key;
            const label = `${PART_LABELS_VI[p.key] || p.key} ›`;

            return (
              <div key={p.key} className="parts-tab-slot">
                <button
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  className={`parts-pull-tab${isSelected ? ' selected' : ''}`}
                  onClick={() => {
                    setSel(p.key);
                    snap();
                  }}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  aria-label={PART_LABELS_VI[p.key] || p.key}
                  aria-pressed={isSelected}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
      </Stand>
    ),
  });

  standItems.push({
    id: 'lens',
    y: P.L.lens.y,
    castConfig: {
      r: P.L.lens.r,
      y: P.L.lens.y,
      w: P.L.lens.w,
    },
    render: () => (
      <Stand
        key="lens"
        noCast
        castRef={getCastRef('lens')}
        r={P.L.lens.r}
        y={P.L.lens.y}
        w={P.L.lens.w}
        h={P.L.lens.h}
        lift={P.L.lens.lift}
        d={P.L.lens.d}
        tabs={[]}
      >
        <div className="parts-lens-wrap">
          <div className="parts-lens-circle">
            <div className="parts-lens-inner">
              {!missingImgs[fullPictureSrc] ? (
                <img
                  src={fullPictureSrc}
                  alt=""
                  className="parts-lens-img"
                  style={{
                    width: `${zoomW}px`,
                    height: `${zoomH}px`,
                    left: `${lensImgLeft}px`,
                    top: `${lensImgTop}px`,
                  }}
                  onError={() => handleArtError(fullPictureSrc)}
                />
              ) : null}
            </div>
          </div>
          <div className="parts-lens-label">{COPY.parts.lens}</div>
        </div>
      </Stand>
    ),
  });

  standItems.sort((a, b) => a.y - b.y);

  return (
    <div className="parts-page">
      {floorSrc && !missingImgs[floorSrc] ? (
        <div
          className="parts-floor"
          style={{ backgroundImage: `url("${floorSrc}")` }}
          aria-hidden="true"
        />
      ) : null}

      <div className="parts-casts">
        {standItems.map((item) => (
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

      {standItems.map((item) => item.render())}
    </div>
  );
}

// ----------------------------------------------------
// Right Page: Title Card, LiftFlap Card, With Sheet
// ----------------------------------------------------
export function PartsRight({ chapter, side }: PartsProps) {
  const { state } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const { sel, off, toggleOff } = usePartsSpreadState(currentChapter);
  const [isFlapOpen, setIsFlapOpen] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  useEffect(() => {
    loadManifest().then(setManifest).catch(() => {});
  }, []);

  // It closes when sel changes
  useEffect(() => {
    setIsFlapOpen(false);
  }, [sel]);

  const P = STAGE.spreads.parts;
  const PC = COPY.parts;

  // Eyebrow: spread 2 (Trang 2 · Cấu tạo)
  const eyebrowText = `${COPY.spreadPage.replace('{n}', '2')} · ${COPY.spreads.parts}`;

  // Structure text: array joined with ", " or string
  const structureVal = (
    g?.structure as Record<string, string | string[] | undefined> | undefined
  )?.[sel];
  const structureText = Array.isArray(structureVal)
    ? structureVal.join(', ')
    : structureVal || '';

  const avoidText = PC.avoid_text?.[sel as keyof typeof PC.avoid_text] || '';
  const roleText = PC.roles?.[sel as keyof typeof PC.roles] || '';
  const currentPartTitle = PART_LABELS_VI[sel] || sel;

  // Companions that have a manifest piece
  const companionList = useMemo(() => {
    const sideComps =
      (COMPANIONS as Record<string, Record<string, string[]>>)[currentSide] || {};
    const ids = sideComps[currentChapter] || [];
    if (!manifest) return [];

    return ids
      .map((id) => {
        const piece = manifest.pieces.find(
          (p) => p.id === id && p.side === currentSide
        );
        return piece ? { id, piece, name: pieceName(id) || id } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [manifest, currentSide, currentChapter]);

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

  // 2. The title card: Stand with P.R.card (rest .97, tabs at 120 and w - 166)
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
          className="parts-title-card"
          style={{ backgroundImage: `url("${STAGE.paper.titleCard}")` }}
        >
          {/* Eyebrow */}
          <div className="parts-eyebrow">{eyebrowText}</div>

          {/* g.name in aka style */}
          {g?.name ? <div className="parts-aka-line">{g.name}</div> : null}

          {/* Part name */}
          <h1 className="parts-part-title">{currentPartTitle}</h1>

          {/* Row: label PC.role and PC.roles[sel] */}
          <div className="parts-role-row">
            <span className="parts-role-label">{PC.role}</span>
            <span className="parts-role-desc">{roleText}</span>
          </div>
        </div>
      </Stand>
    ),
  });

  // 3. The flap card: Stand with P.R.flap (tabs at 60 and w - 106) holding LiftFlap
  rightStands.push({
    id: 'flap',
    y: P.R.flap.y,
    castConfig: {
      x: P.R.flap.x,
      y: P.R.flap.y,
      w: P.R.flap.w,
    },
    render: () => (
      <Stand
        key="flap"
        noCast
        castRef={getCastRef('flap')}
        x={P.R.flap.x}
        y={P.R.flap.y}
        w={P.R.flap.w}
        h={P.R.flap.h}
        d={P.R.flap.d}
        tabs={[60, P.R.flap.w - 106]}
        className="parts-flap-stand"
      >
        <LiftFlap
          isOpen={isFlapOpen}
          onToggle={setIsFlapOpen}
          hint={`${PC.lift} ↑`}
          top={
            <div
              className="parts-flap-top-card"
              style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
            >
              <h2 className="parts-flap-heading parts-flap-heading-son">
                {PC.detail}
              </h2>
              <p className="parts-flap-body parts-flap-body-ink">
                {structureText}
              </p>
            </div>
          }
          base={
            <div
              className="parts-flap-base-card"
              style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}
            >
              <h2 className="parts-flap-heading parts-flap-heading-white">
                {PC.avoid}
              </h2>
              <p className="parts-flap-body parts-flap-body-white">
                {avoidText}
              </p>
            </div>
          }
        />
      </Stand>
    ),
  });

  // 4. "Mặc cùng": Stand with P.R.with (tabs at 60 and w - 106)
  rightStands.push({
    id: 'with',
    y: P.R.with.y,
    castConfig: {
      x: P.R.with.x,
      y: P.R.with.y,
      w: P.R.with.w,
    },
    render: () => (
      <Stand
        key="with"
        noCast
        castRef={getCastRef('with')}
        x={P.R.with.x}
        y={P.R.with.y}
        w={P.R.with.w}
        h={P.R.with.h}
        d={P.R.with.d}
        tabs={[60, P.R.with.w - 106]}
      >
        <div
          className="parts-with-card"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
        >
          <h2 className="parts-with-heading">{PC.withSheet}</h2>
          <div className="parts-with-hint">{PC.withHint}</div>

          <div className="parts-with-row">
            {companionList.map(({ id, piece, name }) => {
              const isOff = off.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  className="parts-companion-btn"
                  style={{ opacity: isOff ? 0.3 : 1 }}
                  onClick={() => toggleOff(id)}
                  aria-pressed={!isOff}
                  aria-label={`${name} (${isOff ? 'đang cởi' : 'đang mặc'})`}
                >
                  {/* Tape strip on top */}
                  <div
                    className="parts-companion-tape"
                    style={{
                      backgroundImage: `url("${STAGE.paper.tape}")`,
                    }}
                    aria-hidden="true"
                  />

                  {/* Piece picture with 2px white die-cut edge */}
                  <div className="parts-companion-img-wrap">
                    <img
                      src={piece.src}
                      alt=""
                      className="parts-companion-img"
                    />
                  </div>

                  {/* pieceName(id) */}
                  <span className="parts-companion-name">{name}</span>
                </button>
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
    <div className="parts-right-page">
      {/* Thin red frame from prompt 12 */}
      <div className="parts-red-frame" aria-hidden="true" />

      {/* Cast shadows */}
      <div className="parts-casts">
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
export default function Parts({
  chapter,
  side,
  page = 'L',
}: PartsProps) {
  if (page === 'R') {
    return <PartsRight chapter={chapter} side={side} />;
  }
  return <PartsLeft chapter={chapter} side={side} />;
}
