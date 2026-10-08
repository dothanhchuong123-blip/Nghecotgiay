import React, { useEffect, useRef, useState } from 'react';
import { STAGE } from '../data';
import { CollageLevel, SpreadIndex, useStore } from '../state';
import { attachScene } from './BookMotion';
import { initBookTurn, openBook, goNext, goPrev } from './turn';
import { currentPaper, paperId, paperBackground } from './paper';
import { isReducedMotion } from '../paper/motion';
import { WORLDS } from '../world/worlds';
import SpreadTabs from './SpreadTabs';
import Cover from './Cover';
import './book.css';

export interface BookProps {
  currentSpread?: SpreadIndex;
  chapter?: string;
  onSelectSpread?: (s: SpreadIndex) => void;
  leftPage?: React.ReactNode;
  rightPage?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Book({
  currentSpread,
  chapter,
  onSelectSpread,
  children,
}: BookProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const book3dRef = useRef<HTMLDivElement>(null);
  const [missingArt, setMissingArt] = useState<Record<string, boolean>>({});
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const [seenWorlds, setSeenWorlds] = useState<CollageLevel[]>([state.collage]);
  if (!seenWorlds.includes(state.collage)) {
    setSeenWorlds([...seenWorlds, state.collage]);
  }

  const [mobileScale, setMobileScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return (window.innerWidth - 16) / 600;
  });

  useEffect(() => {
    function handleResize() {
      setMobileScale((window.innerWidth - 16) / 600);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Horizontal swipe of at least 60px where horizontal distance dominates
    if (Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  const P = currentPaper(state);
  const activePaperId = paperId(state);

  const [tableBg, setTableBg] = useState<string>(() => paperBackground(P));
  const [animatingSheet, setAnimatingSheet] = useState<{ id: string; bg: string } | null>(null);
  const prevPaperIdRef = useRef<string>(activePaperId);

  useEffect(() => {
    if (prevPaperIdRef.current === activePaperId) return;
    prevPaperIdRef.current = activePaperId;

    const newBg = paperBackground(P);

    if (isReducedMotion()) {
      setTableBg(newBg);
      setAnimatingSheet(null);
      return;
    }

    setAnimatingSheet({ id: activePaperId, bg: newBg });
  }, [activePaperId, P]);

  // Safety fallback timeout in case onAnimationEnd doesn't fire
  useEffect(() => {
    if (!animatingSheet) return;
    const timer = setTimeout(() => {
      setTableBg(animatingSheet.bg);
      setAnimatingSheet(null);
    }, 750);
    return () => clearTimeout(timer);
  }, [animatingSheet]);

  useEffect(() => {
    if (sceneRef.current) {
      attachScene(sceneRef.current);
    }
    return () => {
      attachScene(null);
    };
  }, []);

  useEffect(() => {
    if (!book3dRef.current) return;
    const cleanup = initBookTurn(
      book3dRef.current,
      () => stateRef.current,
      dispatch
    );
    return cleanup;
  }, [dispatch]);

  useEffect(() => {
    const assets = [
      STAGE.paper.board,
      STAGE.paper.page,
      STAGE.paper.indexTab,
      STAGE.paper.redCard,
    ];

    assets.forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.onerror = () => {
        console.log(`[art missing] ${src}`);
        setMissingArt((prev) => ({ ...prev, [src]: true }));
      };
      img.src = src;
    });
  }, []);

  const customStyle: React.CSSProperties = {
    ['--board-img' as string]: missingArt[STAGE.paper.board]
      ? 'none'
      : `url("${STAGE.paper.board}")`,
    ['--page-img' as string]: missingArt[STAGE.paper.page]
      ? 'none'
      : `url("${STAGE.paper.page}")`,
    ['--index-tab-img' as string]: missingArt[STAGE.paper.indexTab]
      ? 'none'
      : `url("${STAGE.paper.indexTab}")`,
    ['--red-card-img' as string]: missingArt[STAGE.paper.redCard]
      ? 'none'
      : `url("${STAGE.paper.redCard}")`,
    ['--mobile-scale' as string]: String(mobileScale),
  };

  return (
    <div
      ref={sceneRef}
      className="scene"
      style={customStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={book3dRef}
        className={`book3d${state.screen === 'cover' ? ' is-cover' : ''}`}
        data-step={state.mobileStep || 1}
      >
        {/* a. .desk-table, the desk the book lies on (in 3D, not a flat backdrop) */}
        <div
          className="desk-table"
          aria-hidden="true"
          style={{ background: tableBg }}
        >
          {animatingSheet ? (
            <div
              key={animatingSheet.id}
              className="table-sheet"
              style={{ background: animatingSheet.bg }}
              onAnimationEnd={() => {
                setTableBg(animatingSheet.bg);
                setAnimatingSheet(null);
              }}
            />
          ) : null}
        </div>

        {/* Wall standing upright at the far edge of the desk */}
        <div className="room-wall" aria-hidden="true">
          {([1, 2, 3] as const)
            .filter((w) => seenWorlds.includes(w))
            .map((w) => (
              <div
                key={w}
                className={`room-wall-face${state.collage === w ? ' on' : ''}`}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={WORLDS[w].wall}
                    alt=""
                    decoding="async"
                    className={`room-wall-tile${i === 1 || i === 3 ? ' flip' : ''}`}
                    onError={() => console.log(`[art missing] ${WORLDS[w].wall}`)}
                  />
                ))}
              </div>
            ))}
          <div className="room-wall-skirt" />
        </div>

        {/* b. the book's shadow on the table */}
        <div className="book-shadow" aria-hidden="true" />

        {/* c. the board (cover) */}
        <div className="board" aria-hidden="true" />

        {/* d. the page block (facing you) */}
        <div className="page-block" aria-hidden="true" />

        {/* e. two "under" pages */}
        <div className="pg-under l" aria-hidden="true" />
        <div className="pg-under r" aria-hidden="true" />

        {/* g. the fold */}
        <div className="fold" aria-hidden="true" />

        {/* 6. index tabs row hanging over near edge */}
        {state.screen === 'book' && (
          <SpreadTabs
            currentSpread={currentSpread}
            chapter={chapter}
            onSelectSpread={onSelectSpread}
          />
        )}

        {/* Cover when book is closed */}
        {state.screen === 'cover' && (
          <Cover onOpen={() => openBook()} onMix={() => openBook(4)} />
        )}

        {children}
      </div>
    </div>
  );
}
