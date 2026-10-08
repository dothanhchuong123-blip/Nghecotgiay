import React, { useEffect, useRef } from 'react';
import { compose } from './compose';
import { useStore, WeaveState } from '../state';
import { PieceColors, pieceColorsKey } from '../mix/pieceColors';
import './doll.css';

export interface PaperDollProps {
  side: 'nu' | 'nam';
  chapter: string;
  worn?: string[];
  off?: string[];
  colorHex?: string;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  weave?: WeaveState;
  pieceColors?: PieceColors;
}

export default function PaperDoll({
  side,
  chapter,
  worn = [],
  off,
  colorHex,
  height,
  className = '',
  style,
  children,
  weave,
  pieceColors,
}: PaperDollProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = Math.round(height * 0.75);

  let storeWeave: WeaveState | undefined;
  try {
    const store = useStore();
    storeWeave = store.state.weave;
  } catch {
    // optional outside store
  }
  const currentWeave = weave ?? storeWeave;
  const pcKey = pieceColors ? pieceColorsKey(pieceColors) : '';

  useEffect(() => {
    let cancelled = false;

    compose({
      side,
      chapter,
      worn,
      off,
      colorHex,
      weave: currentWeave,
      pieceColors,
    })
      .then((composedCanvas) => {
        if (cancelled) return;
        const displayCanvas = canvasRef.current;
        if (!displayCanvas) return;
        const ctx = displayCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        ctx.drawImage(composedCanvas, 0, 0);
      })
      .catch((err) => {
        console.error('Failed to compose paper doll:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [side, chapter, worn, off, colorHex, currentWeave, pcKey]);

  return (
    <div
      className={`paper-doll ${className}`.trim()}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={1600}
        className="paper-doll-canvas"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
      {children}
    </div>
  );
}
