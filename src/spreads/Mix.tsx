import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  STAGE,
  COPY,
  COLORS,
  VIBES,
  LEVELS,
  MODERN_PIECES,
  ACCESSORIES,
  COMPANIONS,
  loadManifest,
  garmentById,
  gidOf,
  pieceName,
  modernById,
  accessoryById,
  vibeById,
  Manifest,
  Preset,
  HT_COPY,
} from '../data';
import { closestLooks } from '../preview/closest';
import { sendLetter } from '../preview/mailbox';
import { openCardBox, subscribeWear, takeWear } from '../cards/deck';
import { CARD_COPY } from '../cards/copy';
import { useStore, Side, setCollage, CollageLevel, setVibe, setWeaveOpen } from '../state';
import { useGarment } from '../book/useGarment';
import Stand, { Cast } from '../paper/Stand';
import PaperDoll from '../doll/PaperDoll';
import PatchLayer from '../mix/PatchLayer';
import { PATCHES, usePatches, addPatch } from '../mix/patches';
import WeaveCard from '../mix/WeaveCard';
import Lantern from './Lantern';
import Drum from './Drum';
import { say } from '../nghe/say';
import { snap, whoosh } from '../audio/paper';
import { scheduleAdvice, cancelAdvice, evaluateOutfit, fallbackFor } from '../mix/advice';
import {
  usePieceColors,
  setPieceColor,
  setManyPieceColors,
  prunePieceColors,
  clearPieceColors,
  getPieceColors,
} from '../mix/pieceColors';
import {
  worldHint,
  bestSwatchFor,
  rankSwatches,
  pieceHex,
  WorldHint,
  WorldLevel,
  STAR_NAMES,
} from '../mix/score';
import { PIECE_SWATCHES, pairLine, familyName } from '../mix/colour';
import { useStepped, isReducedMotion, jitter } from '../paper/motion';
import { stepSpring, SpringState } from '../engine/spring';
import { takePhoto, isPhotoMaking, subscribePhotoMaking } from '../nghe/photo';
import { exportCard } from '../share/card';
import { worldOf, STREET_SMALL, WorldSlug } from '../world/worlds';
import { openToday } from '../today/Today';
import './mix.css';

export interface MixProps {
  chapter?: string;
  side?: Side;
  page?: 'L' | 'R';
}

const SLAP_WORDS: Record<WorldSlug, string[]> = {
  chuan: ['Tinh tế', 'Chuẩn', 'Đoan trang', 'Thanh lịch'],
  'giao-thoa': ['Xinh xỉu', 'Chill phết', 'Hợp gu ghê', 'Dễ thương'],
  'duong-pho': ['Bốp!', 'Đỉnh nóc!', 'Keo lỳ!', 'Xịn xò!', 'Cháy!'],
};

const CONFETTI_COLORS = [
  '#FF2A85',
  '#2F7D6B',
  '#FFD700',
  '#00E5FF',
  '#B8322A',
  '#FF9800',
  '#FFFFFF',
  '#76FF03',
  '#E040FB',
  '#FFEB3B',
];

// ----------------------------------------------------
// Shared Mix State across Left & Right Page
// ----------------------------------------------------
interface MixSharedState {
  worn: string[];
  colorId: string;
  level: number;
  swapCount: number;
}

// how many times the user closed the cross-world bubble this visit
let hintDismissCount = 0;

const mixListeners = new Set<() => void>();
let globalMixState: MixSharedState = {
  worn: [],
  colorId: '',
  level: 1,
  swapCount: 0,
};

function notifyMix() {
  mixListeners.forEach((fn) => fn());
}

export function getGlobalMixOutfit() {
  return {
    worn: [...globalMixState.worn],
    colorId: globalMixState.colorId,
    level: globalMixState.level,
  };
}

export function setGlobalMixOutfit(update: {
  worn?: string[];
  colorId?: string;
  level?: number;
}) {
  if (update.worn !== undefined) {
    globalMixState.worn = [...update.worn];
    prunePieceColors(globalMixState.worn);
  }
  if (update.colorId !== undefined) {
    globalMixState.colorId = update.colorId;
  }
  if (update.level !== undefined) {
    globalMixState.level = update.level;
  }
  globalMixState.swapCount = (globalMixState.swapCount + 1) % 1000000;
  notifyMix();
}

export function useMixSpreadState(
  chapter: string,
  side: Side,
  defaultColorId: string,
  defaultLevel: number
) {
  const { state, dispatch } = useStore();
  const prevChapterRef = useRef(chapter);
  const prevSideRef = useRef(side);
  const [, setTick] = useState(0);

  useEffect(() => {
    const chapterChanged = prevChapterRef.current !== chapter;
    const sideChanged = prevSideRef.current !== side;

    if (chapterChanged) {
      prevChapterRef.current = chapter;
      prevSideRef.current = side;
      globalMixState = {
        worn: [],
        colorId: defaultColorId,
        level: defaultLevel,
        swapCount: 0,
      };
      dispatch(setVibe(null));
      clearPieceColors();
      notifyMix();
    } else if (sideChanged) {
      prevSideRef.current = side;
      // Worn pieces that don't exist for the new side are dropped
      loadManifest()
        .then((m) => {
          const sidePieces = new Set(
            m.pieces.filter((p) => p.side === side).map((p) => p.id)
          );
          const filtered = globalMixState.worn.filter((id) => sidePieces.has(id));
          if (filtered.length !== globalMixState.worn.length) {
            globalMixState.worn = filtered;
            globalMixState.swapCount = (globalMixState.swapCount + 1) % 1000000;
            prunePieceColors(filtered);
            notifyMix();
          }
        })
        .catch(() => {});
    } else {
      let changed = false;
      if (!globalMixState.colorId) {
        globalMixState.colorId = defaultColorId;
        changed = true;
      }
      if (!globalMixState.level) {
        globalMixState.level = defaultLevel;
        changed = true;
      }
      if (changed) notifyMix();
    }

    const update = () => setTick((t) => t + 1);
    mixListeners.add(update);
    return () => {
      mixListeners.delete(update);
    };
  }, [chapter, side, defaultColorId, defaultLevel, dispatch]);

  return {
    worn: globalMixState.worn,
    colorId: globalMixState.colorId || defaultColorId,
    level: state.collage,
    vibe: state.vibe,
    swapCount: globalMixState.swapCount,
    setWorn: (fn: (prev: string[]) => string[]) => {
      globalMixState.worn = fn(globalMixState.worn);
      prunePieceColors(globalMixState.worn);
      notifyMix();
    },
    triggerSwap: () => {
      globalMixState.swapCount = (globalMixState.swapCount + 1) % 1000000;
      notifyMix();
    },
    setColorId: (id: string) => {
      globalMixState.colorId = id;
      notifyMix();
    },
    setLevel: (lvl: number) => {
      globalMixState.level = lvl;
      dispatch(setCollage(lvl as CollageLevel));
      notifyMix();
    },
    setVibe: (id: string | null) => {
      dispatch(setVibe(id));
    },
  };
}

// ----------------------------------------------------
// Left Page: Back card, Doll, Drum, Score ticket
// ----------------------------------------------------
export function MixLeft({ chapter, side }: MixProps) {
  const { state, dispatch } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const defaultColorId = g?.colors_classic?.[0] || COLORS[0].id;
  const highestLevel = Math.max(...(g?.levels || [1]));
  const { worn, colorId, level, setLevel, swapCount } = useMixSpreadState(
    currentChapter,
    currentSide,
    defaultColorId,
    highestLevel
  );

  const activeColor = COLORS.find((c) => c.id === colorId) || COLORS[0];
  const colorHex = activeColor?.hex;
  const pieceColors = usePieceColors();

  // 3. The doll swap: the whole doll does a small 3-frame hop (translateY −6px, −3px, 0) with jitter.
  const step = useStepped(12);
  const [hopFrame, setHopFrame] = useState<number>(0);
  const prevSwapCountRef = useRef(swapCount);
  const prevStepRef = useRef(step);
  const [slapActive, setSlapActive] = useState<number | null>(null);
  const slapTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prevSwapCountRef.current !== swapCount) {
      const prev = prevSwapCountRef.current;
      prevSwapCountRef.current = swapCount;
      if (swapCount > prev && swapCount > 0 && !isReducedMotion()) {
        setHopFrame(1);
        setSlapActive(swapCount);
        if (slapTimerRef.current) {
          clearTimeout(slapTimerRef.current);
        }
        slapTimerRef.current = setTimeout(() => {
          setSlapActive(null);
        }, 1100);
      } else {
        setHopFrame(0);
      }
    }
  }, [swapCount]);

  useEffect(() => {
    setSlapActive(null);
    if (slapTimerRef.current) {
      clearTimeout(slapTimerRef.current);
    }
  }, [currentChapter, currentSide]);

  useEffect(() => {
    return () => {
      if (slapTimerRef.current) {
        clearTimeout(slapTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      if (hopFrame > 0) {
        if (hopFrame >= 3) {
          setHopFrame(0);
        } else {
          setHopFrame((h) => h + 1);
        }
      }
    }
  }, [step, hopFrame]);

  let hopTransform: string | undefined = undefined;
  if (hopFrame > 0 && !isReducedMotion()) {
    const hopY = hopFrame === 1 ? -6 : hopFrame === 2 ? -3 : 0;
    const j = jitter(hopFrame, swapCount);
    hopTransform = `translate3d(${j.dx}px, ${hopY + j.dy}px, 0) rotate(${j.rot}deg)`;
  }

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  const vibeName = state.vibe ? (vibeById(state.vibe)?.name ?? null) : null;

  // Nghê sends the nearest real photos as a letter out of the desk envelope
  const handlePreviewClick = () => {
    const matches = closestLooks({
      side: currentSide,
      gid: gidOf(currentChapter, currentSide),
      colorId,
      vibe: state.vibe,
      worn,
      level: state.collage,
    });
    sendLetter({ matches, vibeName });
  };

  const outfitParams = useMemo(
    () => ({
      chapter: currentChapter,
      side: currentSide,
      garment: (g || garmentById(gidOf(currentChapter, currentSide)))!,
      worn,
      colorId,
      level,
      vibe: state.vibe,
    }),
    [currentChapter, currentSide, g, worn, colorId, level, state.vibe]
  );

  const evaluation = useMemo(
    () => evaluateOutfit(outfitParams, pieceColors),
    [outfitParams, pieceColors]
  );

  // 8. Nghê opens with the line that matches the score
  useEffect(() => {
    say(fallbackFor(evaluation.band, evaluation.issues, evaluation.tips));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter]);

  // Call advice 1.2s after the outfit stops changing
  useEffect(() => {
    scheduleAdvice(outfitParams);
    return () => {
      cancelAdvice();
    };
  }, [outfitParams, pieceColors]);

  // Cross-world hint: low here, clearly better in another world
  const allowedLevels = g?.levels?.length ? g.levels : [1, 2, 3];
  const hint = useMemo(
    () => worldHint(evaluation.worlds, level as WorldLevel, allowedLevels),
    [evaluation, level, allowedLevels.join(',')]
  );
  const outfitSig = `${currentChapter}|${currentSide}|${[...worn].sort().join(',')}|${colorId}|${Object.entries(pieceColors).sort().join(',')}|${level}`;
  const [shownHint, setShownHint] = useState<WorldHint | null>(null);
  const seenHintsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setShownHint(null);
    if (!hint || hintDismissCount >= 2) return;
    const key = `${outfitSig}>${hint.to}`;
    if (seenHintsRef.current.has(key)) return;
    const showTimer = setTimeout(() => {
      seenHintsRef.current.add(key);
      setShownHint(hint);
    }, 1500);
    const hideTimer = setTimeout(() => setShownHint(null), 1500 + 9000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [outfitSig, hint?.to, hint?.toScore]);

  const dismissHint = () => {
    hintDismissCount += 1;
    setShownHint(null);
  };

  const goToHintWorld = () => {
    if (!shownHint) return;
    const to = shownHint.to;
    setShownHint(null);
    setLevel(to);
    snap();
    const name = (COPY.mix.worldHint.here as Record<string, string>)[String(to)];
    say(`<p>Qua <b>${name}</b> rồi nè, bộ này lên <b>${shownHint.toScore}</b> điểm!</p>`);
  };

  const P = {
    ...STAGE.spreads.mix,
    L: {
      ...STAGE.spreads.mix.L,
      doll: {
        ...STAGE.spreads.mix.L.doll,
        x: 128,
        y: 585,
        w: 410,
        h: 590,
      },
      drum: {
        x: 18,
        y: 700,
        w: 170,
        h: 280,
        d: 0.24,
      },
      ticket: {
        ...STAGE.spreads.mix.L.ticket,
        r: 4,
        y: 690,
        w: 118,
        h: 188,
      },
      preview: {
        x: 208,
        y: 690,
        w: 164,
        h: 96,
        d: 0.26,
      },
    },
  };
  const base = STAGE.base;

  // Floor
  const floorSrc = (
    STAGE.chapters as Record<string, { floor?: string } | undefined>
  )[currentChapter]?.floor;

  const backSrc = `/popcard/${currentChapter}/back.webp`;

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

  // 1. Back card: stage.base.back (rest .97, tabs at 90 and base.back.w - 136)
  leftStands.push({
    id: 'back',
    y: base.back.y,
    castConfig: {
      x: base.back.x,
      y: base.back.y,
      w: base.back.w,
    },
    render: () => (
      <Stand
        key="back"
        noCast
        castRef={getCastRef('back')}
        x={base.back.x}
        y={base.back.y}
        w={base.back.w}
        h={base.back.h}
        d={base.back.d}
        rest={base.back.rest ?? 0.97}
        tabs={[90, base.back.w - 136]}
        style={{ '--up': base.back.rest ?? 0.97 } as React.CSSProperties}
      >
        <img
          src={backSrc}
          alt=""
          className="mix-back-img"
          onError={() => console.log(`[art missing] ${backSrc}`)}
        />
      </Stand>
    ),
  });

  // 2. The doll: a Stand with P.L.doll (tabs at w/2 - 70 and w/2 + 24)
  leftStands.push({
    id: 'doll',
    y: P.L.doll.y,
    castConfig: {
      x: P.L.doll.x,
      y: P.L.doll.y,
      w: P.L.doll.w,
    },
    render: () => {
      const worldSlug = worldOf(level).slug;
      const slapWordList = SLAP_WORDS[worldSlug] || SLAP_WORDS['giao-thoa'];
      const slapWord =
        slapActive !== null
          ? slapWordList[Math.abs(slapActive - 1) % slapWordList.length]
          : '';
      const streetSticker =
        slapActive !== null
          ? STREET_SMALL[Math.abs(slapActive - 1) % STREET_SMALL.length]
          : '';

      return (
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
        >
          <div
            className="mix-doll-container"
            style={
              hopTransform
                ? {
                    transform: hopTransform,
                    transition: 'none',
                  }
                : undefined
            }
          >
            <PaperDoll
              side={currentSide}
              chapter={currentChapter}
              worn={worn}
              colorHex={colorHex}
              pieceColors={pieceColors}
              height={P.L.doll.h}
              className="mix-die-cut"
            />
            <PatchLayer />
            {slapActive !== null && (
              <div key={slapActive} className={`mix-slap w-${worldSlug}`}>
                {worldSlug === 'chuan' && (
                  <span className="mix-slap-word">{slapWord}</span>
                )}
                {worldSlug === 'giao-thoa' && (
                  <>
                    <span className="mix-slap-word">{slapWord}</span>
                    <div className="mix-slap-confetti-wrap" aria-hidden="true">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className="mix-confetti-bit"
                          style={
                            {
                              '--angle': `${i * 36 + (i % 2 === 0 ? 14 : -14)}deg`,
                              '--dist': `${60 + (i % 4) * 14}px`,
                              '--rot': `${i * 68}deg`,
                              '--color': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
                {worldSlug === 'duong-pho' && (
                  <>
                    <div className="mix-slap-shutter">
                      <span className="mix-slap-neon">{slapWord}</span>
                    </div>
                    {streetSticker && (
                      <img
                        src={streetSticker}
                        alt=""
                        className="mix-slap-street-sticker"
                        onError={() => console.log(`[art missing] ${streetSticker}`)}
                      />
                    )}
                    <div className="mix-slap-confetti-wrap" aria-hidden="true">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className="mix-confetti-bit"
                          style={
                            {
                              '--angle': `${i * 36 + (i % 2 === 0 ? 14 : -14)}deg`,
                              '--dist': `${60 + (i % 4) * 14}px`,
                              '--rot': `${i * 68}deg`,
                              '--color': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Stand>
      );
    },
  });

  // 3. The lantern (Đèn kéo quân): a Stand with P.L.drum
  leftStands.push({
    id: 'drum',
    y: P.L.drum.y,
    castConfig: {
      x: P.L.drum.x,
      y: P.L.drum.y,
      w: P.L.drum.w,
    },
    render: () => (
      <Stand
        key="drum"
        noCast
        castRef={getCastRef('drum')}
        x={P.L.drum.x}
        y={P.L.drum.y}
        w={P.L.drum.w}
        h={P.L.drum.h}
        d={P.L.drum.d}
        tabs={[30, P.L.drum.w - 50]}
      >
        <Lantern
          level={level}
          onLevelChange={(lvl) => {
            setLevel(lvl);
          }}
          allowedLevels={[1, 2, 3]}
        />
      </Stand>
    ),
  });

  // 4. The score ticket: a Stand with P.L.ticket (one tab at 45)
  leftStands.push({
    id: 'ticket',
    y: P.L.ticket.y,
    castConfig: {
      r: P.L.ticket.r,
      y: P.L.ticket.y,
      w: P.L.ticket.w,
    },
    render: () => (
      <Stand
        key="ticket"
        noCast
        castRef={getCastRef('ticket')}
        r={P.L.ticket.r}
        y={P.L.ticket.y}
        w={P.L.ticket.w}
        h={P.L.ticket.h}
        d={P.L.ticket.d}
        tabs={[45]}
      >
        <div className="mix-ticket">
          {/* COPY.mix.score */}
          <span className="mix-ticket-label">{COPY.mix.score}</span>

          {/* Dynamic evaluated score */}
          <span key={evaluation.score} className="mix-ticket-score">
            {evaluation.score}
          </span>

          {/* COPY.mix.scoreUnit */}
          <span className="mix-ticket-unit">{COPY.mix.scoreUnit}</span>

          {/* Stamp: phối đẹp / gần được rồi / nên xem lại */}
          <div className={`mix-ticket-stamp is-${evaluation.band}`}>
            {evaluation.band === 'high'
              ? COPY.mix.ok
              : evaluation.band === 'mid'
                ? COPY.mix.almost
                : COPY.mix.warn}
          </div>

          {/* Three small stars: why the score is what it is */}
          <ul className="mix-ticket-stars" aria-label="Điểm thành phần">
            {(['hon', 'mau', 'mix'] as const).map((k) => (
              <li
                key={k}
                className="mix-ticket-star"
                title={`${STAR_NAMES[k]}: ${evaluation.stars[k]}`}
              >
                <span className="mix-ticket-star-name">{STAR_NAMES[k]}</span>
                <span className="mix-ticket-star-bar">
                  <span
                    className={`mix-ticket-star-fill is-${k}`}
                    style={{ width: `${evaluation.stars[k]}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Nghê's cross-world bubble */}
        {shownHint ? (
          <div className="mix-hint" role="status">
            <button
              type="button"
              className="mix-hint-close"
              aria-label={COPY.mix.worldHint.close}
              onClick={dismissHint}
            >
              ×
            </button>
            <p className="mix-hint-text">
              {(
                (COPY.mix.worldHint.lines as Record<string, string>)[String(shownHint.to)] || ''
              )
                .replace(
                  '{from}',
                  (COPY.mix.worldHint.here as Record<string, string>)[String(shownHint.from)]
                )
                .replace('{fromScore}', String(shownHint.fromScore))
                .replace('{toScore}', String(shownHint.toScore))
                .split('**')
                .map((chunk, i) => (i % 2 === 1 ? <b key={i}>{chunk}</b> : chunk))}
            </p>
            <button type="button" className="mix-hint-go" onClick={goToHintWorld}>
              {COPY.mix.worldHint.go} →
            </button>
          </div>
        ) : null}
      </Stand>
    ),
  });

  leftStands.push({
    id: 'preview',
    y: P.L.preview.y,
    castConfig: {
      x: P.L.preview.x,
      y: P.L.preview.y,
      w: P.L.preview.w,
    },
    render: () => (
      <Stand
        key="preview"
        noCast
        castRef={getCastRef('preview')}
        x={P.L.preview.x}
        y={P.L.preview.y}
        w={P.L.preview.w}
        h={P.L.preview.h}
        d={P.L.preview.d}
        tabs={[50, P.L.preview.w - 70]}
      >
        <button
          type="button"
          className="mix-action-btn mix-action-btn-son"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
          onClick={handlePreviewClick}
        >
          {COPY.preview.button}
        </button>
      </Stand>
    ),
  });

  // Sort far first (ascending y)
  leftStands.sort((a, b) => a.y - b.y);

  return (
    <div className="mix-page">
      {/* Floor */}
      {floorSrc ? (
        <div
          className="mix-floor"
          style={{ backgroundImage: `url("${floorSrc}")` }}
          aria-hidden="true"
        />
      ) : null}

      {/* Cast shadows */}
      <div className="mix-casts">
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
// Right Page: Sticker Sheet, Color Dots, 3 Action Buttons
// ----------------------------------------------------
const VIBE_COLORS = [
  '#D6246E',
  '#3B3B3B',
  '#8E6A43',
  '#2C3E63',
  '#C2410C',
  '#4D7C3A',
];

const LAYER_GROUP_ORDER: readonly string[] = [
  'over',
  'under',
  'bottom',
  'feet',
  'head',
  'jewel',
  'carry',
  'waist',
];

function shortenGuName(name: string): string {
  return name
    .replace(' thanh lịch', '')
    .replace(' rực rỡ', '')
    .replace(' thôn quê', '')
    .replace(' Hà Nội', '')
    .trim();
}

export function MixRight({ chapter, side }: MixProps) {
  const { state, dispatch } = useStore();
  const currentChapter = chapter ?? state.chapter;
  const currentSide = side ?? state.side;

  const gHook = useGarment();
  const g = garmentById(gidOf(currentChapter, currentSide)) ?? gHook;

  const defaultColorId = g?.colors_classic?.[0] || COLORS[0].id;
  const highestLevel = Math.max(...(g?.levels || [1]));
  const { worn, setWorn, colorId, setColorId, level, vibe, setVibe, triggerSwap, setLevel } =
    useMixSpreadState(currentChapter, currentSide, defaultColorId, highestLevel);
  const stuckPatches = usePatches();
  const pieceColors = usePieceColors();

  const [makingPhoto, setMakingPhoto] = useState(isPhotoMaking());
  const [makingCard, setMakingCard] = useState(false);
  const [cardMade, setCardMade] = useState(false);
  useEffect(() => {
    setCardMade(false);
  }, [currentChapter, currentSide]);

  useEffect(() => {
    return subscribePhotoMaking(setMakingPhoto);
  }, []);

  const handlePhotoClick = () => {
    takePhoto({
      chapter: currentChapter,
      side: currentSide,
      worn,
      colorId,
    });
  };

  const handleCardClick = async () => {
    if (makingCard) return;
    setMakingCard(true);
    setCardMade(true);
    try {
      await exportCard({
        chapter: currentChapter,
        side: currentSide,
        worn,
        colorId,
        level,
        material: state.material,
        vibe: state.vibe,
        paperPick: state.paperPick,
        weave: state.weave,
      });
    } catch (err) {
      console.error('Failed to export card:', err);
    } finally {
      setMakingCard(false);
    }
  };

  const queueRef = useRef<string[]>([]);

  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  const P = STAGE.spreads.mix;
  const firstColorId = g?.colors_classic?.[0] || COLORS[0].id;
  const steps = [
    { label: 'Chọn gu', done: Boolean(vibe) },
    { label: 'Dán sticker', done: worn.length > 0 },
    {
      label: 'Màu · huy hiệu',
      done: Boolean((colorId && colorId !== firstColorId) || stuckPatches.length > 0),
    },
    { label: 'In thẻ khoe', done: cardMade },
  ];
  const nextIndex = steps.findIndex((s) => !s.done);

  const manifestRef = useRef<Manifest | null>(null);
  const [manifestPieces, setManifestPieces] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    loadManifest()
      .then((m) => {
        manifestRef.current = m;
        const sidePieces = new Set(
          m.pieces.filter((p) => p.side === currentSide).map((p) => p.id)
        );
        setManifestPieces(sidePieces);
      })
      .catch(() => {});
  }, [currentSide]);

  const getPieceLayer = (pieceId: string): string => {
    const m = modernById(pieceId);
    if (m?.layer && m.layer !== 'swap') return m.layer;
    const p = manifestRef.current?.pieces.find(
      (mp) => mp.id === pieceId && mp.side === currentSide
    );
    if (p?.layer) return p.layer;
    if (m?.layer === 'swap') return 'bottom';
    const acc = accessoryById(pieceId);
    if (acc?.category) {
      if (acc.category === 'Đầu') return 'head';
      if (acc.category === 'Trang sức') return 'jewel';
      if (acc.category === 'Cầm tay') return 'carry';
      if (acc.category === 'Chân') return 'feet';
    }
    return 'waist';
  };

  const conflicts = useMemo(() => new Set(g?.remix?.conflict || []), [g]);
  const isBlocked = (id: string) => conflicts.has(id);

  // Stepped clock at 12 fps
  const step = useStepped(12);

  // Shake state for blocked piece: 3 frames ±3px
  const [shakeState, setShakeState] = useState<{ itemId: string; frame: number } | null>(null);
  const prevShakeStepRef = useRef(step);

  useEffect(() => {
    if (prevShakeStepRef.current !== step) {
      prevShakeStepRef.current = step;
      if (shakeState) {
        if (shakeState.frame >= 3) {
          setShakeState(null);
        } else {
          setShakeState((s) => (s ? { ...s, frame: s.frame + 1 } : null));
        }
      }
    }
  }, [step, shakeState]);

  // Peel animation state: 2 frames corner lift, 4 frames flight in curve to doll
  interface PeelState {
    itemId: string;
    frame: number; // 0, 1 = lift corner; 2, 3, 4, 5 = flight
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    targetX: number;
    targetY: number;
    targetW: number;
    targetH: number;
    pieceSrc: string;
  }

  const [peelState, setPeelState] = useState<PeelState | null>(null);
  const prevPeelStepRef = useRef(step);

  useEffect(() => {
    if (prevPeelStepRef.current !== step) {
      prevPeelStepRef.current = step;
      if (peelState) {
        if (peelState.frame >= 5) {
          const finishedItemId = peelState.itemId;
          setPeelState(null);
          const targetLayer = getPieceLayer(finishedItemId);
          setWorn((prev) => {
            const filtered = prev.filter(
              (wId) => getPieceLayer(wId) !== targetLayer
            );
            return [...filtered, finishedItemId];
          });
          triggerSwap();
          snap();

          if (queueRef.current.length > 0) {
            setTimeout(() => {
              startNextPeel();
            }, 80);
          }
        } else {
          setPeelState((prev) =>
            prev ? { ...prev, frame: prev.frame + 1 } : null
          );
        }
      }
    }
  }, [step, peelState]);

  useEffect(() => {
    setPeelState(null);
    setShakeState(null);
  }, [currentChapter, currentSide]);

  const lastClickTimeRef = useRef(0);

  const startNextPeel = () => {
    if (queueRef.current.length === 0) return;
    const nextId = queueRef.current.shift()!;
    const btnEl =
      stickerRefs.current.get(nextId) ||
      (document.querySelector(`button[aria-label="${pieceName(nextId)}"]`) as HTMLElement | null) ||
      (document.querySelector('.mix-stickers-grid') as HTMLElement | null);

    if (btnEl) {
      handleWear(nextId, btnEl);
    } else {
      const targetLayer = getPieceLayer(nextId);
      setWorn((prev) => {
        const filtered = prev.filter(
          (wId) => getPieceLayer(wId) !== targetLayer
        );
        return [...filtered, nextId];
      });
      triggerSwap();
      startNextPeel();
    }
  };

  const handleApplyPreset = (preset: Preset, immediate?: boolean) => {
    setLevel(preset.level);
    dispatch(setCollage(preset.level as CollageLevel));
    setColorId(preset.base_color_id);

    const targetPieces = preset.pieceIds || [];

    if (immediate || isReducedMotion()) {
      setWorn(() => targetPieces);
      triggerSwap();
    } else {
      setWorn(() => []);
      triggerSwap();

      if (targetPieces.length > 0) {
        queueRef.current = [...targetPieces];
        setTimeout(() => {
          startNextPeel();
        }, 60);
      }
    }
  };

  // A card picked in the card box ("Mặc lên búp bê") dresses the doll once this page shows its áo and side
  const applyRef = useRef(handleApplyPreset);
  applyRef.current = handleApplyPreset;
  useEffect(() => {
    const check = () => {
      const card = takeWear(currentChapter, currentSide);
      if (card) window.setTimeout(() => applyRef.current(card.preset, false), 160);
    };
    check();
    return subscribeWear(check);
  }, [currentChapter, currentSide]);

  const handleWear = (itemId: string, btnEl: HTMLElement) => {
    const targetLayer = getPieceLayer(itemId);

    const applyWearNow = () => {
      setWorn((prev) => {
        const filtered = prev.filter(
          (wId) => getPieceLayer(wId) !== targetLayer
        );
        return [...filtered, itemId];
      });
      triggerSwap();
      snap();
    };

    if (isReducedMotion()) {
      applyWearNow();
      return;
    }

    if (peelState) return;

    const btnRect = btnEl.getBoundingClientRect();
    const dollCanvas = document.querySelector(
      '.mix-doll-container .paper-doll-canvas'
    ) as HTMLCanvasElement | null;
    const dollEl = document.querySelector(
      '.mix-doll-container'
    ) as HTMLElement | null;
    const dollRect = (dollCanvas || dollEl)?.getBoundingClientRect();

    const piece = manifestRef.current?.pieces.find(
      (p) => p.id === itemId && p.side === currentSide
    );

    let fracX = 0.5;
    let fracY = 0.45;
    let boxW = 400;
    let boxH = 400;

    if (piece?.box) {
      const [bx, by, bw, bh] = piece.box;
      fracX = (bx + bw / 2) / 1200;
      fracY = (by + bh / 2) / 1600;
      boxW = bw;
      boxH = bh;
    } else {
      const l = targetLayer;
      if (l === 'head') fracY = 0.16;
      else if (l === 'feet') fracY = 0.88;
      else if (l === 'bottom') fracY = 0.65;
      else if (l === 'waist') fracY = 0.5;
      else if (l === 'carry') {
        fracX = 0.72;
        fracY = 0.55;
      } else if (l === 'jewel') fracY = 0.32;
      else fracY = 0.45;
    }

    const startX = btnRect.left + btnRect.width / 2;
    const startY = btnRect.top + btnRect.height / 2;
    const startW = btnRect.width;
    const startH = btnRect.height;

    const targetX = dollRect
      ? dollRect.left + fracX * dollRect.width
      : startX - 350;
    const targetY = dollRect
      ? dollRect.top + fracY * dollRect.height
      : startY;
    const targetW = dollRect
      ? Math.max(36, (boxW / 1200) * dollRect.width)
      : startW;
    const targetH = dollRect
      ? Math.max(36, (boxH / 1600) * dollRect.height)
      : startH;

    const pieceSrc = `/doll/${currentSide}/${itemId}.webp`;

    setPeelState({
      itemId,
      frame: 0,
      startX,
      startY,
      startW,
      startH,
      targetX,
      targetY,
      targetW,
      targetH,
      pieceSrc,
    });
  };

  const handleUnwear = (itemId: string) => {
    setWorn((prev) => prev.filter((id) => id !== itemId));
    triggerSwap();
  };

  // Recolour worn pieces (modern pieces and accessories, never the áo itself)
  const recolorable = useMemo(
    () => worn.filter((id) => (modernById(id) || accessoryById(id)) && id !== 'khan-ran'),
    [worn]
  );
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const targetId =
    colorTarget && recolorable.includes(colorTarget)
      ? colorTarget
      : recolorable[recolorable.length - 1] ?? null;

  const scoreParams = useMemo(
    () => ({
      garment: (g || garmentById(gidOf(currentChapter, currentSide)))!,
      worn,
      colorId,
      vibe,
    }),
    [g, currentChapter, currentSide, worn, colorId, vibe]
  );

  const rankedSwatches = useMemo(() => {
    if (!targetId || !scoreParams.garment) return PIECE_SWATCHES.map((sw) => sw.hex);
    return rankSwatches(scoreParams, level as WorldLevel, pieceColors, targetId);
  }, [targetId, scoreParams, level, pieceColors]);

  const aoHexNow = COLORS.find((c) => c.id === colorId)?.hex || COLORS[0].hex;

  const handleSwatch = (hex: string | null) => {
    if (!targetId) return;
    setPieceColor(targetId, hex);
    triggerSwap();
    snap();
    if (hex) {
      const sw = PIECE_SWATCHES.find((x) => x.hex.toLowerCase() === hex.toLowerCase());
      const line = pairLine(aoHexNow, hex);
      say(
        `<p><b>${sw?.name || 'Màu mới'}</b> cho ${pieceName(targetId) || 'món này'}.</p>${
          line ? `<p>${line}</p>` : ''
        }`
      );
    } else {
      say(`Về màu gốc cho ${pieceName(targetId) || 'món này'} nhé.`);
    }
  };

  const handleSuggestColors = () => {
    if (recolorable.length === 0) return;
    let next = { ...getPieceColors() };
    for (const id of recolorable) {
      next = { ...next, [id]: bestSwatchFor(scoreParams, level as WorldLevel, next, id) };
    }
    setManyPieceColors(next);
    triggerSwap();
    snap();
    const lead = recolorable[0];
    const line = next[lead] ? pairLine(aoHexNow, next[lead]) : null;
    say(`<p>${COPY.mix.recolor.suggestSay}</p>${line ? `<p>${line}</p>` : ''}`);
  };

  const colorDotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const colorSpeechTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (colorSpeechTimerRef.current) {
        clearTimeout(colorSpeechTimerRef.current);
      }
    };
  }, []);

  const handleSelectColor = (c: (typeof orderedColors)[0]) => {
    setColorId(c.id);

    // Nghê says the colour's name; 1.2s after outfit stops changing, advice triggers
    say(c.name);
    if (colorSpeechTimerRef.current) {
      clearTimeout(colorSpeechTimerRef.current);
      colorSpeechTimerRef.current = null;
    }
  };

  const handleBlocked = (itemId: string) => {
    if (colorSpeechTimerRef.current) {
      clearTimeout(colorSpeechTimerRef.current);
      colorSpeechTimerRef.current = null;
    }
    say(COPY.mix.blockedTap);
    if (!isReducedMotion()) {
      setShakeState({ itemId, frame: 1 });
    }
  };

  const handleStickerClick = (itemId: string, btnEl: HTMLElement) => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 50) return;
    lastClickTimeRef.current = now;

    if (isBlocked(itemId)) {
      handleBlocked(itemId);
      return;
    }

    if (worn.includes(itemId)) {
      handleUnwear(itemId);
    } else {
      handleWear(itemId, btnEl);
    }
  };

  // All companion IDs across all garments and sides
  const allCompanions = useMemo(() => {
    const set = new Set<string>();
    const comps = COMPANIONS as Record<string, Record<string, string[]>>;
    for (const s of ['nu', 'nam']) {
      const byG = comps[s] || {};
      for (const list of Object.values(byG)) {
        for (const id of list) set.add(id);
      }
    }
    return set;
  }, []);

  // Filter available stickers: every MODERN_PIECES & ACCESSORIES in manifest and not companion
  const availableStickers = useMemo(() => {
    const items = [...MODERN_PIECES, ...ACCESSORIES];
    return items.filter(
      (item) =>
        (!manifestPieces.size || manifestPieces.has(item.id)) &&
        !allCompanions.has(item.id)
    );
  }, [manifestPieces, allCompanions]);

  const availableStickerIds = useMemo(
    () => new Set(availableStickers.map((s) => s.id)),
    [availableStickers]
  );

  // Active vibe object
  const activeVibe = useMemo(() => (vibe ? vibeById(vibe) : null), [vibe]);

  // While a gu is chosen, Nghê says vibe.desc
  useEffect(() => {
    if (activeVibe?.desc) {
      say(activeVibe.desc);
    }
  }, [activeVibe]);

  // The grid shows: with a gu, ONLY that gu's affinity pieces (in affinity order);
  // with "Tủ chung", every available sticker grouped by layer: over, under, bottom, feet, head, jewel, carry, waist.
  const orderedStickers = useMemo(() => {
    if (activeVibe && activeVibe.affinity && activeVibe.affinity.length > 0) {
      const byId = new Map(availableStickers.map((s) => [s.id, s]));
      const affinityPieces: typeof availableStickers = [];
      for (const affId of activeVibe.affinity) {
        const piece = byId.get(affId);
        if (piece) {
          affinityPieces.push(piece);
        }
      }
      return affinityPieces;
    }

    // Tủ chung: every available sticker grouped by layer: over, under, bottom, feet, head, jewel, carry, waist
    const grouped: typeof availableStickers = [];
    for (const layer of LAYER_GROUP_ORDER) {
      for (const piece of availableStickers) {
        if (getPieceLayer(piece.id) === layer) {
          grouped.push(piece);
        }
      }
    }
    for (const piece of availableStickers) {
      const l = getPieceLayer(piece.id);
      if (!LAYER_GROUP_ORDER.includes(l)) {
        grouped.push(piece);
      }
    }
    return grouped;
  }, [availableStickers, activeVibe, currentSide, manifestPieces]);

  // FLIP animation with spring on sticker grid reorder
  const stickerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setStickerRef = (id: string, el: HTMLElement | null) => {
    if (el) stickerRefs.current.set(id, el);
    else stickerRefs.current.delete(id);
  };

  const prevPositionsRef = useRef<Map<string, { left: number; top: number }>>(
    new Map()
  );

  useLayoutEffect(() => {
    if (isReducedMotion()) {
      const newPos = new Map<string, { left: number; top: number }>();
      stickerRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        newPos.set(id, { left: rect.left, top: rect.top });
      });
      prevPositionsRef.current = newPos;
      return;
    }

    const prevPositions = prevPositionsRef.current;
    const newPositions = new Map<string, { left: number; top: number }>();

    interface ActiveSpring {
      id: string;
      el: HTMLElement;
      sx: SpringState;
      sy: SpringState;
    }

    const activeSprings: ActiveSpring[] = [];

    stickerRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      newPositions.set(id, { left: rect.left, top: rect.top });

      const prevPos = prevPositions.get(id);
      if (prevPos) {
        const dx = prevPos.left - rect.left;
        const dy = prevPos.top - rect.top;

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
          el.style.transition = 'none';

          activeSprings.push({
            id,
            el,
            sx: { t: dx, v: 0 },
            sy: { t: dy, v: 0 },
          });
        }
      }
    });

    prevPositionsRef.current = newPositions;

    if (activeSprings.length === 0) return;

    let rafId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      let allSettled = true;

      for (const item of activeSprings) {
        const settledX = stepSpring(item.sx, 0, dt);
        const settledY = stepSpring(item.sy, 0, dt);

        if (settledX && settledY) {
          item.el.style.transform = '';
        } else {
          allSettled = false;
          item.el.style.transform = `translate3d(${item.sx.t.toFixed(2)}px, ${item.sy.t.toFixed(2)}px, 0)`;
        }
      }

      if (!allSettled) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      activeSprings.forEach((item) => {
        item.el.style.transform = '';
      });
    };
  }, [orderedStickers]);

  // Color dots list: g.colors_classic first, then other COLORS (total 9)
  const orderedColors = useMemo(() => {
    const classicIds = g?.colors_classic || [];
    const classics = classicIds
      .map((id) => COLORS.find((c) => c.id === id))
      .filter((c): c is (typeof COLORS)[0] => Boolean(c));
    const others = COLORS.filter((c) => !classicIds.includes(c.id));
    return [...classics, ...others].slice(0, 9);
  }, [g]);

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

  // 5. Sticker sheet: Stand with P.R.sheet (rest .97, tabs at 120 and w - 166)
  rightStands.push({
    id: 'sheet',
    y: P.R.sheet.y,
    castConfig: {
      x: P.R.sheet.x,
      y: P.R.sheet.y,
      w: P.R.sheet.w,
    },
    render: () => {
      const worldSlug = worldOf(level).slug;
      return (
        <Stand
          key="sheet"
          noCast
          castRef={getCastRef('sheet')}
          x={P.R.sheet.x}
          y={P.R.sheet.y}
          w={P.R.sheet.w}
          h={P.R.sheet.h}
          d={P.R.sheet.d}
          rest={P.R.sheet.rest ?? 0.97}
          tabs={[120, P.R.sheet.w - 166]}
          style={{ '--up': P.R.sheet.rest ?? 0.97 } as React.CSSProperties}
        >
          <div className={`mix-sheet w-${worldSlug}`}>
          <ol className="mix-steps" aria-label="Các bước phối đồ">
            {steps.map((step, idx) => {
              const isDone = step.done;
              const isNext = !isDone && idx === nextIndex;
              return (
                <li
                  key={step.label}
                  className={`mix-step${isDone ? ' is-done' : isNext ? ' is-next' : ''}`}
                >
                  <span className="mix-step-num">{isDone ? '✓' : idx + 1}</span>
                  <span className="mix-step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>

          {/* Gu tabs (role tablist "Chọn gu") */}
          <div className="mix-gu-tabs" role="tablist" aria-label="Chọn gu">
            <button
              type="button"
              className="mix-today-btn"
              onClick={() => openToday()}
            >
              📅 Hôm nay mặc gì?
            </button>
            <button
              type="button"
              className="mix-today-btn mix-weave-open-btn"
              onClick={() => dispatch(setWeaveOpen(true))}
            >
              {'🧵 ' + HT_COPY.weaveBtn}
            </button>

            {/* Tủ chung */}
            <button
              ref={(el) => {
                tabRefs.current[0] = el;
              }}
              role="tab"
              type="button"
              className={`mix-gu-tab${!vibe ? ' is-selected' : ''}`}
              style={{ '--c': 'var(--ink)' } as React.CSSProperties}
              aria-selected={!vibe}
              tabIndex={!vibe ? 0 : -1}
              onClick={() => {
                if (colorSpeechTimerRef.current) {
                  clearTimeout(colorSpeechTimerRef.current);
                  colorSpeechTimerRef.current = null;
                }
                setVibe(null);
                say(COPY.mix.scoreLines.high);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  tabRefs.current[1]?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  tabRefs.current[VIBES.length]?.focus();
                }
              }}
            >
              <span className="mix-gu-tab-name">Tủ chung</span>
              <span className="mix-gu-tab-count">
                {availableStickers.length}
              </span>
            </button>

            {/* One tab per VIBES gu */}
            {VIBES.map((v, idx) => {
              const isSelected = vibe === v.id;
              const tabIdx = idx + 1;
              const color = VIBE_COLORS[idx] || 'var(--ink)';
              const count = (v.affinity || []).filter((id) =>
                availableStickerIds.has(id)
              ).length;
              const shortName = shortenGuName(v.name);

              return (
                <button
                  key={v.id}
                  ref={(el) => {
                    tabRefs.current[tabIdx] = el;
                  }}
                  role="tab"
                  type="button"
                  className={`mix-gu-tab${isSelected ? ' is-selected' : ''}`}
                  style={{ '--c': color } as React.CSSProperties}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => {
                    if (colorSpeechTimerRef.current) {
                      clearTimeout(colorSpeechTimerRef.current);
                      colorSpeechTimerRef.current = null;
                    }
                    const nextVibe = isSelected ? null : v.id;
                    setVibe(nextVibe);
                    if (nextVibe) {
                      const vObj = vibeById(nextVibe);
                      if (vObj?.desc) say(vObj.desc);
                    } else {
                      say(COPY.mix.scoreLines.high);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = (tabIdx + 1) % (VIBES.length + 1);
                      tabRefs.current[next]?.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prev =
                        (tabIdx - 1 + (VIBES.length + 1)) % (VIBES.length + 1);
                      tabRefs.current[prev]?.focus();
                    }
                  }}
                >
                  <span className="mix-gu-tab-name">{shortName}</span>
                  <span className="mix-gu-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Wrap the grid in div.mix-stickers-scroll */}
          <div className="mix-stickers-scroll">
            <div className="mix-stickers-grid">
              {orderedStickers.map((item) => {
                const isWorn = worn.includes(item.id);
                const label = pieceName(item.id) || item.id;
                const pieceSrc = `/doll/${currentSide}/${item.id}.webp`;

                const isPeelingCorner =
                  peelState?.itemId === item.id && peelState.frame < 2;
                const isPeelingFlight =
                  peelState?.itemId === item.id && peelState.frame >= 2;
                const isShaking = shakeState?.itemId === item.id;

                let btnStyle: React.CSSProperties | undefined = undefined;
                let imgStyle: React.CSSProperties | undefined = undefined;

                if (isShaking) {
                  const dx = shakeState.frame === 2 ? 3 : -3;
                  btnStyle = {
                    transform: `translateX(${dx}px)`,
                    transition: 'none',
                  };
                } else if (isPeelingCorner) {
                  imgStyle = {
                    transform: 'rotate(-8deg) scale(1.08)',
                    transformOrigin: 'bottom left',
                    transition: 'none',
                  };
                } else if (isPeelingFlight) {
                  imgStyle = {
                    opacity: 0,
                    transition: 'none',
                  };
                }

                return (
                  <button
                    key={item.id}
                    ref={(el) => setStickerRef(item.id, el)}
                    type="button"
                    className={`mix-sticker-btn${isWorn ? ' is-worn' : ''}`}
                    style={btnStyle}
                    onClick={(e) => handleStickerClick(item.id, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStickerClick(item.id, e.currentTarget);
                      }
                    }}
                    aria-label={label}
                    aria-pressed={isWorn}
                  >
                    <img
                      src={pieceSrc}
                      alt=""
                      className="mix-sticker-img"
                      style={imgStyle}
                      onError={() => console.log(`[art missing] ${pieceSrc}`)}
                    />
                    {isWorn ? (
                      <span className="mix-sticker-wearing">
                        {COPY.mix.wearing}
                      </span>
                    ) : null}
                    {isWorn && item.id === 'khan-ran' ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="mix-sticker-weave"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setWeaveOpen(true));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            dispatch(setWeaveOpen(true));
                          }
                        }}
                      >
                        {'🧵 ' + HT_COPY.weaveBtn}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patch row under sticker grid */}
          <div className="mix-patch-row">
            <div className="mix-patch-label">
              <span className="mix-patch-title">Huy hiệu</span>
              <span className="mix-patch-count">{stuckPatches.length}/4</span>
            </div>
            <div className="mix-patch-list">
              {PATCHES.map((patch) => {
                const isOn = stuckPatches.some((p) => p.id === patch.id);
                return (
                  <button
                    key={patch.id}
                    type="button"
                    className={`mix-patch-btn${isOn ? ' is-on' : ''}`}
                    aria-label={patch.name}
                    aria-pressed={isOn}
                    onClick={() => {
                      const added = addPatch(patch.id);
                      if (added) {
                        snap();
                        say(`<b>${patch.name}</b> · ${patch.say}`);
                      }
                    }}
                  >
                    <img
                      src={patch.src}
                      alt=""
                      className="mix-patch-btn-img"
                      onError={() => console.log(`[art missing] ${patch.src}`)}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Stand>
    );
  },
});

  // 7. Three buttons as Stands: lucky, photo, card
  rightStands.push({
    id: 'lucky',
    y: P.R.lucky.y,
    castConfig: {
      x: P.R.lucky.x,
      y: P.R.lucky.y,
      w: P.R.lucky.w,
    },
    render: () => (
      <Stand
        key="lucky"
        noCast
        castRef={getCastRef('lucky')}
        x={P.R.lucky.x}
        y={P.R.lucky.y}
        w={P.R.lucky.w}
        h={P.R.lucky.h}
        d={P.R.lucky.d}
        tabs={[50, P.R.lucky.w - 70]}
      >
        <button
          type="button"
          className="mix-action-btn mix-action-btn-son"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
          onClick={() => {
            whoosh();
            openCardBox();
          }}
        >
          {CARD_COPY.button}
        </button>
      </Stand>
    ),
  });

  rightStands.push({
    id: 'photo',
    y: P.R.photo.y,
    castConfig: {
      x: P.R.photo.x,
      y: P.R.photo.y,
      w: P.R.photo.w,
    },
    render: () => (
      <Stand
        key="photo"
        noCast
        castRef={getCastRef('photo')}
        x={P.R.photo.x}
        y={P.R.photo.y}
        w={P.R.photo.w}
        h={P.R.photo.h}
        d={P.R.photo.d}
        tabs={[50, P.R.photo.w - 70]}
      >
        <button
          type="button"
          className="mix-action-btn mix-action-btn-white"
          style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}
          onClick={handlePhotoClick}
          disabled={makingPhoto}
        >
          📷 {COPY.photo.button}
        </button>
      </Stand>
    ),
  });

  rightStands.push({
    id: 'card',
    y: P.R.card.y,
    castConfig: {
      r: P.R.card.r,
      y: P.R.card.y,
      w: P.R.card.w,
    },
    render: () => (
      <Stand
        key="card"
        noCast
        castRef={getCastRef('card')}
        r={P.R.card.r}
        y={P.R.card.y}
        w={P.R.card.w}
        h={P.R.card.h}
        d={P.R.card.d}
        tabs={[50, P.R.card.w - 70]}
      >
        <button
          type="button"
          className="mix-action-btn mix-action-btn-son"
          style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}
          onClick={handleCardClick}
          disabled={makingCard}
        >
          {COPY.mix.card}
        </button>
      </Stand>
    ),
  });

  // Sort far first (ascending y)
  rightStands.sort((a, b) => a.y - b.y);

  let peelFlightNode: React.ReactNode = null;
  if (peelState && peelState.frame >= 2 && typeof document !== 'undefined') {
    const flightStep = peelState.frame - 1; // 1, 2, 3, 4
    const t = flightStep / 4; // 0.25, 0.50, 0.75, 1.00
    const arc = 70 * 4 * t * (1 - t);
    const x = peelState.startX + (peelState.targetX - peelState.startX) * t;
    const y = peelState.startY + (peelState.targetY - peelState.startY) * t - arc;
    const w = peelState.startW + (peelState.targetW - peelState.startW) * t;
    const h = peelState.startH + (peelState.targetH - peelState.startH) * t;
    const rot = -8 * (1 - t);
    const scale = 1.08 - 0.08 * t;

    peelFlightNode = createPortal(
      <div
        style={{
          position: 'fixed',
          left: `${x - w / 2}px`,
          top: `${y - h / 2}px`,
          width: `${w}px`,
          height: `${h}px`,
          transform: `rotate(${rot}deg) scale(${scale})`,
          zIndex: 9999,
          pointerEvents: 'none',
          transformOrigin: 'center center',
          transition: 'none',
        }}
      >
        <img
          src={peelState.pieceSrc}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter:
              'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 4px 6px rgba(42, 33, 27, 0.35))',
          }}
        />
      </div>,
      document.body
    );
  }

  return (
    <div className="mix-right-page">
      {/* Thin red frame from prompt 12 */}
      <div className="mix-red-frame" aria-hidden="true" />

      {/* 6. Colour dots lying flat at P.R.colors */}
      <div
        className="mix-colors-row"
        role="radiogroup"
        aria-label={COPY.mix.colors}
        style={{
          left: `${P.R.colors.x}px`,
          top: `${P.R.colors.y}px`,
          width: `${P.R.colors.w}px`,
        }}
      >
        {orderedColors.map((c, idx) => {
          const isSelected = colorId === c.id;
          const selectedIdx = orderedColors.findIndex((col) => col.id === colorId);
          const tabIndex =
            isSelected ? 0 : selectedIdx === -1 && idx === 0 ? 0 : -1;

          return (
            <button
              key={c.id}
              ref={(el) => {
                colorDotRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIndex}
              className={`mix-color-dot${isSelected ? ' active' : ''}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => handleSelectColor(c)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  const nextIdx = (idx + 1) % orderedColors.length;
                  colorDotRefs.current[nextIdx]?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  const prevIdx =
                    (idx - 1 + orderedColors.length) % orderedColors.length;
                  colorDotRefs.current[prevIdx]?.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectColor(c);
                }
              }}
              title={c.name}
              aria-label={c.name}
            />
          );
        })}
      </div>

      {/* Recolour worn pieces, lying flat under the áo colour dots */}
      <div
        className="mix-recolor"
        aria-label={COPY.mix.recolor.title}
        style={{
          left: `${P.R.colors.x}px`,
          top: `${P.R.colors.y + 58}px`,
          width: `${P.R.colors.w}px`,
        }}
      >
        <div className="mix-recolor-head">
          <span className="mix-recolor-title">{COPY.mix.recolor.title}</span>
          {recolorable.length > 0 ? (
            <div className="mix-recolor-pieces" role="tablist" aria-label={COPY.mix.recolor.for}>
              {recolorable.map((id) => {
                const hex = pieceHex(id, pieceColors);
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={id === targetId}
                    className={`mix-recolor-piece${id === targetId ? ' is-on' : ''}`}
                    title={pieceName(id) || id}
                    onClick={() => setColorTarget(id)}
                  >
                    <img src={`/doll/${currentSide}/${id}.webp`} alt={pieceName(id) || id} />
                    <span
                      className="mix-recolor-chip"
                      style={{ backgroundColor: hex || '#ccc' }}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="mix-recolor-empty">{COPY.mix.recolor.empty}</span>
          )}
          {recolorable.length > 0 ? (
            <button type="button" className="mix-recolor-suggest" onClick={handleSuggestColors}>
              ✨ {COPY.mix.recolor.suggest}
            </button>
          ) : null}
        </div>
        {targetId ? (
          <div className="mix-recolor-swatches" role="radiogroup" aria-label={COPY.mix.recolor.title}>
            <button
              type="button"
              className={`mix-recolor-reset${pieceColors[targetId] ? '' : ' is-on'}`}
              title={COPY.mix.recolor.reset}
              aria-label={COPY.mix.recolor.reset}
              onClick={() => handleSwatch(null)}
            >
              ↺
            </button>
            {rankedSwatches.map((hex, i) => {
              const sw = PIECE_SWATCHES.find((x) => x.hex === hex)!;
              const on = pieceColors[targetId]?.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`mix-recolor-dot${on ? ' is-on' : ''}`}
                  style={{ backgroundColor: hex }}
                  title={i === 0 ? `${sw.name} · ${COPY.mix.recolor.best}` : sw.name}
                  aria-label={sw.name}
                  onClick={() => handleSwatch(hex)}
                >
                  {i === 0 ? <span className="mix-recolor-best" aria-hidden="true">✨</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Cast shadows */}
      <div className="mix-casts">
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

      {/* 2. Peel animation flight portal */}
      {peelFlightNode}

      {/* WeaveCard */}
      {state.weaveOpen && (
        <WeaveCard
          onWearPiece={(pieceId, headPieceIds) => {
            setWorn((prev) => {
              const withoutHead = prev.filter((id) => !headPieceIds.has(id));
              if (!withoutHead.includes(pieceId)) {
                return [...withoutHead, pieceId];
              }
              return withoutHead;
            });
            triggerSwap();
          }}
        />
      )}

    </div>
  );
}

// Default export renders left or right page based on `page` prop
export default function Mix({ chapter, side, page = 'L' }: MixProps) {
  if (page === 'R') {
    return <MixRight chapter={chapter} side={side} />;
  }
  return <MixLeft chapter={chapter} side={side} />;
}
