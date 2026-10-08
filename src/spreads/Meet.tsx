import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE,
  SCENES,
  COPY,
  fullSrc,
  garmentById,
  gidOf,
} from '../data';
import { useStore, Side, CollageLevel } from '../state';
import Stand, { Cast } from '../paper/Stand';
import { useReducedMotion } from '../paper/motion';
import './meet.css';

export interface MeetProps {
  chapter?: string;
  side?: Side;
  collage?: CollageLevel;
}

interface PieceDef {
  id: string;
  src: string;
  x?: number;
  r?: number;
  y: number;
  w?: number;
  h: number;
  lift?: number;
  d?: number;
  rest?: number;
  tabs?: (number | string)[];
  style?: React.CSSProperties;
  className?: string;
  folding?: boolean;
  onFolded?: () => void;
  content: React.ReactNode;
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

interface DecoState {
  id: string;
  folding: boolean;
  deco: DecoDef;
}

export default function Meet({
  chapter: propChapter,
  side: propSide,
  collage: propCollage,
}: MeetProps) {
  const { state } = useStore();
  const id = propChapter ?? state.chapter;
  const currentSide = propSide ?? state.side;
  const currentCollage = propCollage ?? state.collage;
  const reduced = useReducedMotion();

  const [failedImgs, setFailedImgs] = useState<Record<string, boolean>>({});
  const castRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  function getCastRef(key: string) {
    if (!castRefs.current[key]) {
      castRefs.current[key] = React.createRef<HTMLDivElement>();
    }
    return castRefs.current[key];
  }

  function handleArtError(src: string) {
    console.log(`[art missing] ${src}`);
    setFailedImgs((prev) => ({ ...prev, [src]: true }));
  }

  // Floor source
  const floorSrc =
    (STAGE.chapters as Record<string, { floor?: string } | undefined>)[id]?.floor;

  // Chapter decos
  const chapterData = (
    STAGE.chapters as Record<
      string,
      | {
          deco?: DecoDef[];
        }
      | undefined
    >
  )[id];

  const allDecos = useMemo(() => chapterData?.deco || [], [chapterData]);

  // Active decos state for collage level changes (rising and folding down)
  const [activeDecos, setActiveDecos] = useState<DecoState[]>(() => {
    return allDecos
      .filter((d) => d.level <= currentCollage)
      .map((d) => ({ id: d.id, folding: false, deco: d }));
  });

  // Track collage level changes:
  // "when store.collage changes, decorations whose level is now <= collage rise
  // from t = 0 with the same rule, and the ones above it fold down to 0 and are then removed."
  useEffect(() => {
    setActiveDecos((prev) => {
      const next: DecoState[] = [];
      const prevMap = new Map(prev.map((item) => [item.id, item]));

      allDecos.forEach((d) => {
        const existing = prevMap.get(d.id);
        if (d.level <= currentCollage) {
          next.push({ id: d.id, folding: false, deco: d });
        } else if (existing) {
          next.push({ id: d.id, folding: true, deco: d });
        }
      });

      return next;
    });
  }, [currentCollage, allDecos, id]);

  // In reduced motion: decorations appear or disappear with a 150 ms fade
  useEffect(() => {
    if (!reduced) return;
    const foldingItems = activeDecos.filter((item) => item.folding);
    if (foldingItems.length === 0) return;

    const timer = setTimeout(() => {
      setActiveDecos((prev) => prev.filter((item) => !item.folding));
    }, 150);

    return () => clearTimeout(timer);
  }, [activeDecos, reduced]);

  const handleDecoFolded = (decoId: string) => {
    setActiveDecos((prev) =>
      prev.filter((item) => !(item.id === decoId && item.folding))
    );
  };

  // Build pieces
  const { sortedPieces, fgPiece, allValidPieces } = useMemo(() => {
    const list: PieceDef[] = [];
    const base = STAGE.base;

    // 1. back piece
    const backSrc = `/popcard/${id}/back.webp`;
    list.push({
      id: 'back',
      src: backSrc,
      x: base.back.x,
      y: base.back.y,
      w: base.back.w,
      h: base.back.h,
      d: base.back.d,
      rest: base.back.rest ?? 0.97,
      tabs: [90, base.back.w - 136],
      style: { ['--up' as string]: base.back.rest ?? 0.97 },
      content: (
        <img
          src={backSrc}
          alt=""
          className="meet-back-img"
          onError={() => handleArtError(backSrc)}
        />
      ),
    });

    // 2. wings or mid
    const scene = (
      SCENES as Record<
        string,
        | {
            wings?: boolean;
            mid?: 'left' | 'right' | null;
            prop?: 'left' | 'right';
          }
        | undefined
      >
    )[id];

    if (scene?.wings) {
      const wingLSrc = `/popcard/${id}/wing-l.webp`;
      list.push({
        id: 'wing-l',
        src: wingLSrc,
        x: base['wing-l'].x,
        y: base['wing-l'].y,
        h: base['wing-l'].h,
        d: base['wing-l'].d,
        content: (
          <img
            src={wingLSrc}
            alt=""
            style={{ height: `${base['wing-l'].h}px`, width: 'auto' }}
            className="meet-die-cut"
            onError={() => handleArtError(wingLSrc)}
          />
        ),
      });

      const wingRSrc = `/popcard/${id}/wing-r.webp`;
      list.push({
        id: 'wing-r',
        src: wingRSrc,
        r: base['wing-r'].r,
        y: base['wing-r'].y,
        h: base['wing-r'].h,
        d: base['wing-r'].d,
        content: (
          <img
            src={wingRSrc}
            alt=""
            style={{ height: `${base['wing-r'].h}px`, width: 'auto' }}
            className="meet-die-cut"
            onError={() => handleArtError(wingRSrc)}
          />
        ),
      });
    } else if (scene?.mid) {
      const midKey = `mid-${scene.mid}` as 'mid-left' | 'mid-right';
      const midCfg = base[midKey];
      const midSrc = `/popcard/${id}/mid.webp`;
      list.push({
        id: 'mid',
        src: midSrc,
        x: 'x' in midCfg ? midCfg.x : undefined,
        r: 'r' in midCfg ? midCfg.r : undefined,
        y: midCfg.y,
        h: midCfg.h,
        d: midCfg.d,
        content: (
          <img
            src={midSrc}
            alt=""
            style={{ height: `${midCfg.h}px`, width: 'auto' }}
            className="meet-die-cut"
            onError={() => handleArtError(midSrc)}
          />
        ),
      });
    }

    // 3. prop
    if (scene?.prop) {
      const propKey = `prop-${scene.prop}` as 'prop-left' | 'prop-right';
      const propCfg = base[propKey];
      const propSrc = `/popcard/${id}/prop.webp`;
      list.push({
        id: 'prop',
        src: propSrc,
        x: 'x' in propCfg ? propCfg.x : undefined,
        r: 'r' in propCfg ? propCfg.r : undefined,
        y: propCfg.y,
        h: propCfg.h,
        d: propCfg.d,
        content: (
          <img
            src={propSrc}
            alt=""
            style={{ height: `${propCfg.h}px`, width: 'auto' }}
            className="meet-die-cut"
            onError={() => handleArtError(propSrc)}
          />
        ),
      });
    }

    // 4. doll
    const primaryDollSrc = fullSrc(id, currentSide);
    const thumbDollSrc = `/popcard/${id}/thumb-${currentSide}.webp`;
    const dollSrc = failedImgs[primaryDollSrc] ? thumbDollSrc : primaryDollSrc;
    const sideName =
      currentSide === 'nam'
        ? COPY.side.nam.toLowerCase()
        : COPY.side.nu.toLowerCase();
    const garment = garmentById(gidOf(id, currentSide));
    const garmentName = garment?.name || id;
    const dollAlt = `Người giấy ${sideName} mặc ${garmentName}`;

    list.push({
      id: 'doll',
      src: dollSrc,
      x: base.doll.x,
      y: base.doll.y,
      w: base.doll.w,
      h: base.doll.h,
      d: base.doll.d,
      content: (
        <img
          src={dollSrc}
          alt={dollAlt}
          style={{
            width: `${base.doll.w}px`,
            height: `${base.doll.h}px`,
            objectFit: 'contain',
          }}
          className="meet-die-cut"
          onError={() => handleArtError(dollSrc)}
        />
      ),
    });

    // 5. active decorations (with rising or folding animation)
    activeDecos.forEach(({ id: decoId, folding, deco }) => {
      list.push({
        id: `deco-${decoId}`,
        src: deco.src,
        x: deco.x,
        r: deco.r,
        y: deco.y,
        h: deco.h,
        lift: deco.lift,
        d: deco.d,
        folding,
        onFolded: () => handleDecoFolded(decoId),
        className: reduced
          ? folding
            ? 'meet-deco-fade-out'
            : 'meet-deco-fade-in'
          : '',
        content: (
          <img
            src={deco.src}
            alt=""
            style={{ height: `${deco.h}px`, width: 'auto' }}
            className="meet-die-cut"
            onError={() => handleArtError(deco.src)}
          />
        ),
      });
    });

    // 6. fg
    const fgSrc = `/popcard/${id}/fg.webp`;
    const fg: PieceDef = {
      id: 'fg',
      src: fgSrc,
      x: base.fg.x,
      y: base.fg.y,
      w: base.fg.w,
      h: 120,
      d: base.fg.d,
      content: (
        <img
          src={fgSrc}
          alt=""
          style={{ width: `${base.fg.w}px`, height: '120px' }}
          className="meet-fg-img"
          onError={() => handleArtError(fgSrc)}
        />
      ),
    };

    // Filter out missing
    const validNonFg = list.filter((p) => !failedImgs[p.src]);
    const validFg = !failedImgs[fg.src] ? fg : null;

    // Sort by y (far first)
    validNonFg.sort((a, b) => a.y - b.y);

    const allValid = validFg ? [...validNonFg, validFg] : [...validNonFg];

    return {
      sortedPieces: validNonFg,
      fgPiece: validFg,
      allValidPieces: allValid,
    };
  }, [id, currentSide, activeDecos, failedImgs, reduced]);

  // Asset validation on mount & chapter/side/collage change
  useEffect(() => {
    if (floorSrc) {
      const img = new Image();
      img.onerror = () => handleArtError(floorSrc);
      img.src = floorSrc;
    }

    allValidPieces.forEach((p) => {
      const img = new Image();
      img.onerror = () => handleArtError(p.src);
      img.src = p.src;
    });
  }, [id, currentSide, currentCollage]);

  return (
    <div className="meet-page">
      {/* 1. The floor */}
      {floorSrc && !failedImgs[floorSrc] ? (
        <div
          className="meet-floor"
          style={{ backgroundImage: `url("${floorSrc}")` }}
          aria-hidden="true"
        />
      ) : null}

      {/* 2. All casts placed before all stands */}
      <div className="meet-casts">
        {allValidPieces.map((p) => (
          <Cast
            key={`cast-${p.id}`}
            ref={getCastRef(p.id)}
            x={p.x}
            r={p.r}
            y={p.y}
            w={p.w}
          />
        ))}
      </div>

      {/* 3. Every Stand sorted by y (far first) */}
      {sortedPieces.map((p) => (
        <Stand
          key={p.id}
          noCast
          castRef={getCastRef(p.id)}
          x={p.x}
          r={p.r}
          y={p.y}
          w={p.w}
          h={p.h}
          lift={p.lift}
          d={p.d}
          rest={p.rest}
          tabs={p.tabs}
          style={p.style}
          className={p.className}
          folding={p.folding}
          onFolded={p.onFolded}
        >
          {p.content}
        </Stand>
      ))}

      {/* 4. fg last */}
      {fgPiece ? (
        <Stand
          key="fg"
          noCast
          castRef={getCastRef('fg')}
          x={fgPiece.x}
          y={fgPiece.y}
          w={fgPiece.w}
          h={fgPiece.h}
          d={fgPiece.d}
        >
          {fgPiece.content}
        </Stand>
      ) : null}
    </div>
  );
}
