import { useEffect, useRef } from 'react';
import { READY, fullSrc, garmentById, gidOf } from '../data';
import { useStore } from '../state';
import { go } from './turn';
import { isReducedMotion } from '../paper/motion';
import './tabs.css';

export interface ChapterTabsProps {
  currentChapter?: string;
  side?: 'nu' | 'nam';
  onSelectChapter?: (id: string) => void;
}

export default function ChapterTabs({
  currentChapter,
  side: propSide,
  onSelectChapter,
}: ChapterTabsProps) {
  const { state } = useStore();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeChapter = currentChapter ?? state.chapter;
  const activeSide = propSide ?? state.side;

  useEffect(() => {
    const activeIdx = READY.indexOf(activeChapter);
    if (activeIdx !== -1 && tabRefs.current[activeIdx]) {
      tabRefs.current[activeIdx]?.scrollIntoView({
        behavior: isReducedMotion() ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeChapter]);

  function handleSelect(id: string) {
    if (id === activeChapter) return;
    if (onSelectChapter) {
      onSelectChapter(id);
    } else {
      go({ chapter: id });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, curIndex: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (curIndex + 1) % READY.length;
      handleSelect(READY[nextIdx]);
      tabRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (curIndex - 1 + READY.length) % READY.length;
      handleSelect(READY[prevIdx]);
      tabRefs.current[prevIdx]?.focus();
    }
  }

  return (
    <nav className="chapter-tabs" aria-label="Chương sách">
      {READY.map((id, idx) => {
        const isActive = id === activeChapter;
        const targetGid = gidOf(id, activeSide);
        const garment = garmentById(targetGid);
        const name = garment?.name || id;
        const full = fullSrc(id, activeSide);
        const thumb = full.replace('/full-', '/thumb-');

        return (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            type="button"
            className={`chapter-tab${isActive ? ' chapter-tab-active' : ''}`}
            onClick={() => handleSelect(id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            aria-current={isActive ? 'true' : undefined}
          >
            <img
              src={thumb}
              alt=""
              className="chapter-tab-img"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src.includes('/thumb-')) {
                  img.src = full;
                }
              }}
            />
            <span className="chapter-tab-name">{name}</span>
          </button>
        );
      })}
    </nav>
  );
}
