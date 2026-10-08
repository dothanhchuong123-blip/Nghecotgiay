import React, { useRef } from 'react';
import { useStore, setCollage, CollageLevel } from '../state';
import { WORLDS, worldOf } from './worlds';
import { setGlobalMixOutfit } from '../spreads/Mix';
import Neon from './Neon';
import './world.css';

const LEVELS: CollageLevel[] = [1, 2, 3];

export default function WorldLever() {
  const { state, dispatch } = useStore();
  const btnRefs = useRef<Record<CollageLevel, HTMLButtonElement | null>>({
    1: null,
    2: null,
    3: null,
  });

  if (state.screen !== 'book' || state.spread !== 4) {
    return null;
  }

  const collage = (state.collage || 2) as CollageLevel;
  const currentWorld = worldOf(collage);
  const slug = currentWorld.slug;

  const handleSelect = (level: CollageLevel) => {
    setGlobalMixOutfit({ level });
    dispatch(setCollage(level));
  };

  const handleKeyDown = (e: React.KeyboardEvent, lvl: CollageLevel) => {
    let nextLvl: CollageLevel | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      nextLvl = (lvl === 3 ? 1 : lvl + 1) as CollageLevel;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      nextLvl = (lvl === 1 ? 3 : lvl - 1) as CollageLevel;
    }

    if (nextLvl !== null) {
      handleSelect(nextLvl);
      btnRefs.current[nextLvl]?.focus();
    }
  };

  const knobLeft = `${((collage - 1) * 100) / 3}%`;

  return (
    <div
      className={`world-lever w-${slug}`}
      role="radiogroup"
      aria-label="Chọn thế giới"
    >
      <div className="world-lever-track">
        <div
          className="world-lever-knob"
          style={{ left: knobLeft }}
          aria-hidden="true"
        />
        {LEVELS.map((lvl) => {
          const isSelected = collage === lvl;
          const world = WORLDS[lvl];
          const isDuongPho = lvl === 3;

          return (
            <button
              key={lvl}
              ref={(el) => {
                btnRefs.current[lvl] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`world-lever-btn${isSelected ? ' is-active' : ''}`}
              onClick={() => handleSelect(lvl)}
              onKeyDown={(e) => handleKeyDown(e, lvl)}
            >
              {isSelected && isDuongPho ? (
                <Neon text="Đường phố" size={16} />
              ) : (
                world.name
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
