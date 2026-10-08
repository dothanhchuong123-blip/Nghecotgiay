import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePatches, movePatch, patchById, addPatch, StuckPatch } from './patches';
import { isReducedMotion } from '../paper/motion';

export interface PatchLayerProps {
  className?: string;
}

export default function PatchLayer({ className = '' }: PatchLayerProps) {
  const patches = usePatches();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [dollSize, setDollSize] = useState<{ w: number; h: number }>({ w: 443, h: 590 });
  const [slappingKeys, setSlappingKeys] = useState<Set<string>>(new Set());
  const prevKeysRef = useRef<Set<string>>(new Set());

  // Measure sibling .paper-doll to ensure pixel-perfect match with the doll box
  useLayoutEffect(() => {
    const parent = layerRef.current?.parentElement;
    const dollEl = parent?.querySelector('.paper-doll') as HTMLElement | null;
    if (dollEl && dollEl.offsetWidth > 0 && dollEl.offsetHeight > 0) {
      setDollSize({ w: dollEl.offsetWidth, h: dollEl.offsetHeight });
    }
  }, []);

  // Track newly added patches for slap-in animation
  useEffect(() => {
    if (isReducedMotion()) return;
    const currentKeys = new Set(patches.map((p) => p.key));
    const newKeys: string[] = [];
    currentKeys.forEach((k) => {
      if (!prevKeysRef.current.has(k)) {
        newKeys.push(k);
      }
    });
    prevKeysRef.current = currentKeys;

    if (newKeys.length > 0) {
      setSlappingKeys((prev) => {
        const next = new Set(prev);
        newKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  }, [patches]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLImageElement>,
    patch: StuckPatch
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const layer = layerRef.current;
    if (!layer) return;

    setSlappingKeys((prev) => {
      if (!prev.has(patch.key)) return prev;
      const next = new Set(prev);
      next.delete(patch.key);
      return next;
    });

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (moveEvt.pointerId !== e.pointerId) return;
      const rect = layer.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const fx = (moveEvt.clientX - rect.left) / rect.width;
      const fy = (moveEvt.clientY - rect.top) / rect.height;
      movePatch(patch.key, fx, fy);
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      if (upEvt.pointerId !== e.pointerId) return;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLImageElement>,
    patch: StuckPatch
  ) => {
    const delta = e.shiftKey ? 0.08 : 0.03;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      movePatch(patch.key, patch.fx - delta, patch.fy);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      movePatch(patch.key, patch.fx + delta, patch.fy);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      movePatch(patch.key, patch.fx, patch.fy - delta);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      movePatch(patch.key, patch.fx, patch.fy + delta);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      addPatch(patch.id);
    }
  };

  return (
    <div
      ref={layerRef}
      className={`mix-patch-layer ${className}`.trim()}
      style={{
        width: `${dollSize.w}px`,
        height: `${dollSize.h}px`,
      }}
      aria-label="Lớp huy hiệu trên áo"
    >
      {patches.map((p) => {
        const patchDef = patchById(p.id);
        if (!patchDef) return null;
        const isSlap = slappingKeys.has(p.key) && !isReducedMotion();

        return (
          <img
            key={p.key}
            src={patchDef.src}
            alt={patchDef.name}
            tabIndex={0}
            role="button"
            aria-label={`${patchDef.name} (kéo hoặc dùng phím mũi tên để di chuyển)`}
            className={`mix-patch-item${isSlap ? ' slap' : ''}`}
            style={
              {
                '--fx': p.fx,
                '--fy': p.fy,
                '--rot': `${p.rot}deg`,
              } as React.CSSProperties
            }
            onPointerDown={(e) => handlePointerDown(e, p)}
            onKeyDown={(e) => handleKeyDown(e, p)}
            onAnimationEnd={() => {
              setSlappingKeys((prev) => {
                const next = new Set(prev);
                next.delete(p.key);
                return next;
              });
            }}
            onError={() => console.log(`[art missing] ${patchDef.src}`)}
          />
        );
      })}
    </div>
  );
}
