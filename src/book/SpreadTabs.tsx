import { useState, useRef, useEffect } from 'react';
import { COPY, hasPair } from '../data';
import { useStore, SpreadIndex } from '../state';
import { go } from './turn';
import './spread-tabs.css';

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

export interface SpreadTabsProps {
  currentSpread?: SpreadIndex;
  chapter?: string;
  onSelectSpread?: (s: SpreadIndex) => void;
}

export default function SpreadTabs({
  currentSpread,
  chapter: propChapter,
  onSelectSpread,
}: SpreadTabsProps) {
  const { state } = useStore();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pop, setPop] = useState(0);
  const [popping, setPopping] = useState(false);
  const popTimeoutRef = useRef<number | null>(null);
  const isFirstMount = useRef(true);

  const activeSpread = currentSpread ?? state.spread;
  const activeChapter = propChapter ?? state.chapter;
  const pairExists = hasPair(activeChapter);

  const availableSpreads = SPREADS.filter(
    (s) => s.key !== 'compare' || pairExists
  );

  useEffect(() => {
    return () => {
      if (popTimeoutRef.current) {
        window.clearTimeout(popTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (pop > 0) {
      const mixIdx = availableSpreads.findIndex((s) => s.index === 4);
      if (mixIdx !== -1 && document.activeElement === document.body) {
        tabRefs.current[mixIdx]?.focus();
      }
    }
  }, [pop, availableSpreads]);

  function handleClick(idx: SpreadIndex) {
    if (idx === 4) {
      setPop((p) => p + 1);
      setPopping(true);
      if (popTimeoutRef.current) {
        window.clearTimeout(popTimeoutRef.current);
      }
      popTimeoutRef.current = window.setTimeout(() => {
        setPopping(false);
      }, 520);
    }
    if (idx === activeSpread) return;
    if (onSelectSpread) {
      onSelectSpread(idx);
    } else {
      go({ spread: idx });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, curIndex: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (curIndex + 1) % availableSpreads.length;
      const target = availableSpreads[nextIdx];
      handleClick(target.index);
      tabRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx =
        (curIndex - 1 + availableSpreads.length) % availableSpreads.length;
      const target = availableSpreads[prevIdx];
      handleClick(target.index);
      tabRefs.current[prevIdx]?.focus();
    }
  }

  return (
    <nav className="index-tabs-row" aria-label="Trang sách">
      {availableSpreads.map((s, idx) => {
        const isActive = s.index === activeSpread;
        const isMix = s.index === 4;
        const buttonKey = isMix ? `${s.key}-${pop}` : s.key;
        const tabClassName = [
          'index-tab',
          isMix ? 'is-mix' : '',
          isActive ? 'active' : '',
          isMix && popping ? 'popping' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={buttonKey}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            type="button"
            className={tabClassName}
            onClick={() => handleClick(s.index)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            aria-current={isActive ? 'page' : undefined}
          >
            {isMix ? (
              <>
                <span className="mix-star" aria-hidden="true">✦</span>
                <span className="mix-label">{s.label}</span>
                <span className="mix-badge" aria-hidden="true">HOT</span>
                {Array.from({ length: 10 }, (_, k) => (
                  <i
                    key={k}
                    className="mix-sparkle"
                    style={{ '--a': `${k * 36}deg` } as React.CSSProperties}
                    aria-hidden="true"
                  />
                ))}
              </>
            ) : (
              s.label
            )}
          </button>
        );
      })}
    </nav>
  );
}
