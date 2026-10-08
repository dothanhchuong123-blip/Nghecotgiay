import React, { useEffect, useRef, useState } from 'react';
import { loadManifest, gidOf, COMPANIONS, HANG_TRONG, DollPiece, Manifest } from '../data';
import { loadImage } from './compose';
import { isReducedMotion } from '../paper/motion';
import './doll.css';

export interface GamLayerProps {
  side: 'nu' | 'nam';
  chapter: string;
  worn?: string[];
  gamId: string;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

const AFTER_LAYERS = new Set(['waist', 'over', 'jewel', 'carry', 'head']);

interface SetupData {
  cw: number;
  ch: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  activeCount: number;
  activeX: Float32Array;
  activeY: Float32Array;
  activeNx: Float32Array;
  activeNy: Float32Array;
  activeNz: Float32Array;
  activeA: Float32Array;
  activePi: Int32Array;
  outImageData: ImageData;
  outData: Uint8ClampedArray;
}

export default function GamLayer({
  side,
  chapter,
  worn = [],
  gamId,
  height,
  className = '',
  style,
}: GamLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const lastPointerRef = useRef({ time: 0, lx: 0, ly: 0 });
  const setupRef = useRef<SetupData | null>(null);
  setupRef.current = setup;

  // 1. Set-up (again whenever a prop changes)
  useEffect(() => {
    let cancelled = false;

    async function performSetup() {
      try {
        const manifest: Manifest = await loadManifest();
        if (cancelled) return;

        const aoId = gidOf(chapter, side);
        const aoPiece = manifest.pieces.find((p) => p.id === aoId && p.side === side);
        if (!aoPiece || !aoPiece.dye) {
          setSetup(null);
          return;
        }

        const box = aoPiece.box; // [x, y, w, h]
        const scale = height / 1600;
        const R = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

        const cssW = Math.round(box[2] * scale);
        const cssH = Math.round(box[3] * scale);
        const cssX = Math.round(box[0] * scale);
        const cssY = Math.round(box[1] * scale);

        const cw = Math.round(box[2] * scale * R);
        const ch = Math.round(box[3] * scale * R);
        if (cw <= 0 || ch <= 0) {
          setSetup(null);
          return;
        }

        // a. Mask A per pixel = dye mask × áo alpha × (1 − alpha of every piece compose draws after áo)
        const [aoImg, dyeImg] = await Promise.all([
          loadImage(aoPiece.src),
          loadImage(aoPiece.dye),
        ]);
        if (cancelled) return;

        // Pieces drawn after áo
        const wornPieces: DollPiece[] = [];
        for (const wId of worn) {
          const piece = manifest.pieces.find((p) => p.id === wId && p.side === side);
          if (piece) wornPieces.push(piece);
        }
        const wornLayers = new Set(wornPieces.map((p) => p.layer));

        const sideCompanions =
          (COMPANIONS as Record<string, Record<string, string[]>>)[side] ?? {};
        const companionsList =
          sideCompanions[chapter] ?? sideCompanions[gidOf(chapter, side)] ?? [];
        const keptCompanions: DollPiece[] = [];
        for (const compId of companionsList) {
          if (worn.includes(compId)) continue;
          const compPiece = manifest.pieces.find((p) => p.id === compId && p.side === side);
          if (compPiece && !wornLayers.has(compPiece.layer)) {
            keptCompanions.push(compPiece);
          }
        }

        const outfitPieces = [...keptCompanions, ...wornPieces].filter((p) => p.id !== aoId);
        const piecesAfter = outfitPieces.filter((p) => AFTER_LAYERS.has(p.layer));

        // Offscreen canvas for aoImg
        const aoCanvas = document.createElement('canvas');
        aoCanvas.width = cw;
        aoCanvas.height = ch;
        const aoCtx = aoCanvas.getContext('2d');
        if (!aoCtx) return;
        aoCtx.drawImage(aoImg, 0, 0, cw, ch);
        const aoData = aoCtx.getImageData(0, 0, cw, ch).data;

        // Offscreen canvas for dyeImg
        const dyeCanvas = document.createElement('canvas');
        dyeCanvas.width = cw;
        dyeCanvas.height = ch;
        const dyeCtx = dyeCanvas.getContext('2d');
        if (!dyeCtx) return;
        dyeCtx.drawImage(dyeImg, 0, 0, cw, ch);
        const dyeData = dyeCtx.getImageData(0, 0, cw, ch).data;

        // Offscreen canvas for piecesAfter
        const afterCanvas = document.createElement('canvas');
        afterCanvas.width = cw;
        afterCanvas.height = ch;
        const afterCtx = afterCanvas.getContext('2d');
        if (!afterCtx) return;

        const sx = cw / box[2];
        const sy = ch / box[3];
        for (const p of piecesAfter) {
          try {
            const pImg = await loadImage(p.src);
            const px = (p.box[0] - box[0]) * sx;
            const py = (p.box[1] - box[1]) * sy;
            const pw = p.box[2] * sx;
            const ph = p.box[3] * sy;
            afterCtx.drawImage(pImg, px, py, pw, ph);
          } catch {
            // ignore missing art
          }
        }
        const afterData = afterCtx.getImageData(0, 0, cw, ch).data;

        const total = cw * ch;
        const maskA = new Float32Array(total);
        for (let i = 0; i < total; i++) {
          const pi = i * 4;
          const dyeVal = dyeData[pi] / 255;
          const aoAlpha = aoData[pi + 3] / 255;
          const afterAlpha = afterData[pi + 3] / 255;
          maskA[i] = dyeVal * aoAlpha * (1 - afterAlpha);
        }

        // b. Height map H (0..1): gấm picture drawn repeating, tile size 190 CSS px × R, blur(2.2px)
        const gamItem = HANG_TRONG.gam.find((g) => g.id === gamId) ?? HANG_TRONG.gam[0];
        const gamImg = await loadImage(gamItem.src);
        if (cancelled) return;

        const hCanvas = document.createElement('canvas');
        hCanvas.width = cw;
        hCanvas.height = ch;
        const hCtx = hCanvas.getContext('2d');
        if (!hCtx) return;

        hCtx.filter = 'blur(2.2px)';
        const tileSize = Math.max(1, Math.round(190 * R));
        const tCanvas = document.createElement('canvas');
        tCanvas.width = tileSize;
        tCanvas.height = tileSize;
        const tCtx = tCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(gamImg, 0, 0, tileSize, tileSize);
          const pattern = hCtx.createPattern(tCanvas, 'repeat');
          if (pattern) {
            hCtx.fillStyle = pattern;
            hCtx.fillRect(0, 0, cw, ch);
          }
        }
        const hData = hCtx.getImageData(0, 0, cw, ch).data;
        const H = new Float32Array(total);
        for (let i = 0; i < total; i++) {
          H[i] = hData[i * 4] / 255;
        }

        // c. Slopes, once: dx = (H[x−1] − H[x+1]) × 3.4, dy = (H[y−1] − H[y+1]) × 3.4
        let activeCount = 0;
        for (let i = 0; i < total; i++) {
          if (maskA[i] > 0.02) activeCount++;
        }

        const activeX = new Float32Array(activeCount);
        const activeY = new Float32Array(activeCount);
        const activeNx = new Float32Array(activeCount);
        const activeNy = new Float32Array(activeCount);
        const activeNz = new Float32Array(activeCount);
        const activeA = new Float32Array(activeCount);
        const activePi = new Int32Array(activeCount);

        let ptr = 0;
        for (let y = 0; y < ch; y++) {
          const rowOffset = y * cw;
          const rowUOffset = Math.max(0, y - 1) * cw;
          const rowDOffset = Math.min(ch - 1, y + 1) * cw;

          for (let x = 0; x < cw; x++) {
            const i = rowOffset + x;
            const a = maskA[i];
            if (a > 0.02) {
              const xL = Math.max(0, x - 1);
              const xR = Math.min(cw - 1, x + 1);

              const hL = H[rowOffset + xL];
              const hR = H[rowOffset + xR];
              const hU = H[rowUOffset + x];
              const hD = H[rowDOffset + x];

              const dx = (hL - hR) * 3.4;
              const dy = (hU - hD) * 3.4;
              const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + 1.0);

              activeX[ptr] = x;
              activeY[ptr] = y;
              activeNx[ptr] = dx * invLen;
              activeNy[ptr] = dy * invLen;
              activeNz[ptr] = 1.0 * invLen;
              activeA[ptr] = a;
              activePi[ptr] = i * 4;
              ptr++;
            }
          }
        }

        const dummyCanvas = document.createElement('canvas');
        const dummyCtx = dummyCanvas.getContext('2d')!;
        const outImageData = dummyCtx.createImageData(cw, ch);
        const outData = outImageData.data;

        if (cancelled) return;

        setSetup({
          cw,
          ch,
          boxX: cssX,
          boxY: cssY,
          boxW: cssW,
          boxH: cssH,
          activeCount,
          activeX,
          activeY,
          activeNx,
          activeNy,
          activeNz,
          activeA,
          activePi,
          outImageData,
          outData,
        });
      } catch (err) {
        console.error('Failed to setup GamLayer:', err);
      }
    }

    performSetup();

    return () => {
      cancelled = true;
    };
  }, [side, chapter, worn, gamId, height]);

  // Helper render frame
  const renderFrame = (s: SetupData, lx: number, ly: number, lz: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = s.activeCount;
    const width = s.cw;
    const invWidth = 1.0 / width;
    const outData = s.outData;

    for (let j = 0; j < count; j++) {
      const x = s.activeX[j];
      const y = s.activeY[j];
      const dx = lx - x;
      const dy = ly - y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      const lLen = Math.sqrt(distSq + lz * lz);
      const invLLen = 1.0 / lLen;

      const Lx = dx * invLLen;
      const Ly = dy * invLLen;
      const Lz = lz * invLLen;

      const dot = s.activeNx[j] * Lx + s.activeNy[j] * Ly + s.activeNz[j] * Lz;
      const v = (dot - Lz) * 1.7;

      const dRatio = 1.0 - 1.5 * dist * invWidth;
      const sheen = dRatio > 0 ? dRatio * dRatio * 0.16 : 0;

      const pi = s.activePi[j];
      const a = s.activeA[j];

      if (v + sheen > 0) {
        let alpha = v + sheen;
        if (alpha > 1) alpha = 1;
        alpha = alpha * a * 190;
        outData[pi] = 255;
        outData[pi + 1] = 255;
        outData[pi + 2] = 245;
        outData[pi + 3] = alpha | 0;
      } else {
        let alpha = -v;
        if (alpha > 1) alpha = 1;
        alpha = alpha * a * 120;
        outData[pi] = 40;
        outData[pi + 1] = 24;
        outData[pi + 2] = 14;
        outData[pi + 3] = alpha | 0;
      }
    }

    ctx.putImageData(s.outImageData, 0, 0);
  };

  // 2 & 3. Animation loop & pointer tracking
  useEffect(() => {
    if (!setup) return;

    const reduced = isReducedMotion();

    // Initial draw for reduced motion or fallback
    if (reduced) {
      renderFrame(setup, 0, 0, 0.3 * setup.cw);
    }

    function onPointerMove(e: PointerEvent) {
      if (!canvasRef.current || !setupRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      const lx = cssX * (setupRef.current.cw / rect.width);
      const ly = cssY * (setupRef.current.ch / rect.height);

      lastPointerRef.current = {
        time: performance.now(),
        lx,
        ly,
      };

      if (reduced) {
        renderFrame(setupRef.current, lx, ly, 0.3 * setupRef.current.cw);
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let rafId = 0;
    function loop(now: number) {
      if (document.hidden) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const s = setupRef.current;
      if (!s) return;

      const isCircling =
        lastPointerRef.current.time === 0 || now - lastPointerRef.current.time > 2500;

      let lx = 0;
      let ly = 0;
      if (isCircling) {
        const angle = now / 1500;
        const cx = s.cw * 0.5;
        const cy = s.ch * 0.5;
        const rx = 0.95 * s.cw;
        const ry = 0.8 * s.ch;
        lx = cx + rx * Math.cos(angle);
        ly = cy + ry * Math.sin(angle);
      } else {
        lx = lastPointerRef.current.lx;
        ly = lastPointerRef.current.ly;
      }

      const lz = 0.3 * s.cw;
      renderFrame(s, lx, ly, lz);

      rafId = requestAnimationFrame(loop);
    }

    if (!reduced) {
      rafId = requestAnimationFrame(loop);
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!reduced && !rafId) {
        rafId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [setup]);

  if (!setup) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`gam-layer-canvas ${className}`.trim()}
      width={setup.cw}
      height={setup.ch}
      style={{
        position: 'absolute',
        left: `${setup.boxX}px`,
        top: `${setup.boxY}px`,
        width: `${setup.boxW}px`,
        height: `${setup.boxH}px`,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
