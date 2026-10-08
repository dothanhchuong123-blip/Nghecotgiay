import { useEffect, useRef } from 'react';
import { COPY, READY, hasPair } from '../data';
import { useStore, SpreadIndex } from '../state';
import { go, stepNext, stepPrev } from './turn';
import './mobile-bottom-bar.css';

interface SpreadDef {
  index: SpreadIndex;
  key: 'meet' | 'parts' | 'story' | 'compare' | 'mix';
  label: string;
}

const SPREADS: SpreadDef[] = [
  { index: 0, key: 'meet', label: COPY.spreads.meet },
  { index: 1, key: 'parts', label: COPY.spreads.parts },
  { index: 2, key: 'story', label: COPY.spreads.story },
  { index: 3, key: 'compare', label: COPY.spreads.compare },
  { index: 4, key: 'mix', label: COPY.spreads.mix },
];

export default function MobileBottomBar() {
  const { state } = useStore();
  const activeSpread = state.spread;
  const activeChapter = state.chapter;
  const mobileStep = state.mobileStep || 1;
  const pairExists = hasPair(activeChapter);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeSpread]);

  function handleSelectSpread(idx: SpreadIndex) {
    if (idx === activeSpread && mobileStep === 1) return;
    go({ spread: idx, mobileStep: 1 });
  }

  // Gặp áo is one flat page on phones, so › moves straight on to the next spread
  const flat = true;
  const prevOf = (n: number): number => (n === 5 ? 4 : n === 4 ? (pairExists ? 3 : 2) : n === 3 ? 2 : n - 1);
  const nextOf = (n: number): number => (n === 1 ? 2 : n === 2 ? (pairExists ? 3 : 4) : n === 3 ? 4 : n === 0 ? 1 : 5);
  const flatPrev = () => go({ spread: Math.max(0, prevOf(activeSpread)) as SpreadIndex, mobileStep: 1 });
  const flatNext = () => go({ spread: nextOf(activeSpread) as SpreadIndex, mobileStep: 1 });
  const isFirst = activeSpread === 0;
  const hasLastPage = activeChapter === READY[READY.length - 1];
  const isLast = activeSpread === 5 || (activeSpread === 4 && !hasLastPage);

  return (
    <nav className="mobile-bottom-bar" aria-label="Trang sách">
      {/* Spread names in scrolling row (14px) */}
      <div className="mobile-spread-tabs-row">
        {SPREADS.map((s) => {
          if (s.key === 'compare' && !pairExists) {
            return null;
          }
          const isActive = s.index === activeSpread;
          return (
            <button
              key={s.key}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              className={`mobile-spread-tab${isActive ? ' active' : ''}`}
              onClick={() => handleSelectSpread(s.index)}
              aria-current={isActive ? 'page' : undefined}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step buttons and small "1/2" or "2/2" for the step */}
      <div className="mobile-step-controls">
        <button
          type="button"
          className="mobile-step-btn prev"
          onClick={() => (flat ? flatPrev() : stepPrev())}
          disabled={isFirst}
          aria-label={COPY.a11y.prev}
        >
          ‹
        </button>
        <button
          type="button"
          className="mobile-step-badge"
          onClick={() => (flat ? flatNext() : stepNext())}
          aria-label={`Bước ${mobileStep}/2`}
        >
          {activeSpread + 1}/{hasLastPage ? 6 : 5}
        </button>
        <button
          type="button"
          className="mobile-step-btn next"
          onClick={() => (flat ? flatNext() : stepNext())}
          disabled={isLast}
          aria-label={COPY.a11y.next}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
