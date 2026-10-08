import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HANG_TRONG, HT_COPY, COMPANIONS, loadManifest } from '../data';
import {
  useStore,
  setWeaveRow,
  setWeaveMode,
  setWeavePick,
  clearWeave,
  setWeaveWearing,
  setWeaveOpen,
} from '../state';
import { loadImage } from '../doll/compose';
import { say } from '../nghe/say';
import { useFocusTrap } from '../paper/focusTrap';
import './weave.css';

export interface WeaveCardProps {
  onWearPiece?: (pieceId: string, headPieceIds: Set<string>) => void;
}

export default function WeaveCard({ onWearPiece }: WeaveCardProps) {
  const { state, dispatch } = useStore();
  const { weave } = state;
  const G = HANG_TRONG.weave.geo;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  // Focus trap for dialog: Escape closes, restores focus to weave button on close
  const dialogRef = useFocusTrap(
    true,
    () => dispatch(setWeaveOpen(false)),
    '.weave-close-btn'
  );

  // Load all images needed
  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      const urls = [HANG_TRONG.weave.card, ...HANG_TRONG.weave.strips.map((s) => s.src)];
      const map = new Map<string, HTMLImageElement>();
      await Promise.all(
        urls.map(async (url) => {
          try {
            const img = await loadImage(url);
            map.set(url, img);
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled) {
        setImages(map);
      }
    }

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Draw weaving canvas
  useEffect(() => {
    if (!images) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, G.size, G.size);

    const rowH = (G.bottom - G.top) / G.rows;
    const x0 = G.slits[0][0] - 2;
    const x1 = G.slits[G.slits.length - 1][1] + 2;
    const fullW = x1 - x0;

    // (a) every filled row's strip at full length (under card)
    for (let r = 0; r < G.rows; r++) {
      const stripId = weave.rows[r];
      if (!stripId) continue;
      const strip = HANG_TRONG.weave.strips.find((s) => s.id === stripId);
      if (!strip) continue;
      const stripImg = images.get(strip.src);
      if (!stripImg) continue;

      const rowY = G.top + r * rowH + 0.03 * rowH;
      const rowHeight = 0.94 * rowH;

      const sx = (x0 / G.size) * stripImg.width;
      const sw = (fullW / G.size) * stripImg.width;

      ctx.drawImage(stripImg, sx, 0, sw, stripImg.height, x0, rowY, fullW, rowHeight);
    }

    // (b) card picture HANG_TRONG.weave.card at G.size x G.size
    const cardImg = images.get(HANG_TRONG.weave.card);
    if (cardImg) {
      ctx.drawImage(cardImg, 0, 0, G.size, G.size);
    }

    // (c) for each filled row r and each i from 0 to slits.length - 2:
    // if (i + r) mod (2 * mode) < mode, the strip from middle of slit i to middle of slit i + 1,
    // on top of card, with shadow rgba(40,20,5,.35) blur 4 offset-y 3.
    const period = 2 * weave.mode;
    for (let r = 0; r < G.rows; r++) {
      const stripId = weave.rows[r];
      if (!stripId) continue;
      const strip = HANG_TRONG.weave.strips.find((s) => s.id === stripId);
      if (!strip) continue;
      const stripImg = images.get(strip.src);
      if (!stripImg) continue;

      const rowY = G.top + r * rowH + 0.03 * rowH;
      const rowHeight = 0.94 * rowH;

      for (let i = 0; i < G.slits.length - 1; i++) {
        if ((i + r) % period < weave.mode) {
          const midI = (G.slits[i][0] + G.slits[i][1]) / 2;
          const midNext = (G.slits[i + 1][0] + G.slits[i + 1][1]) / 2;
          const pieceW = midNext - midI;

          const sx = (midI / G.size) * stripImg.width;
          const sw = (pieceW / G.size) * stripImg.width;

          ctx.save();
          ctx.shadowColor = 'rgba(40,20,5,.35)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 3;
          ctx.drawImage(stripImg, sx, 0, sw, stripImg.height, midI, rowY, pieceW, rowHeight);
          ctx.restore();
        }
      }
    }

    // Highlight focused row if selected via keyboard
    if (focusedRow !== null && focusedRow >= 0 && focusedRow < G.rows) {
      const rowY = G.top + focusedRow * rowH + 0.03 * rowH;
      const rowHeight = 0.94 * rowH;
      ctx.save();
      ctx.strokeStyle = '#b84336';
      ctx.lineWidth = 4;
      ctx.strokeRect(x0, rowY, fullW, rowHeight);
      ctx.restore();
    }
  }, [images, weave, focusedRow, G]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = e.clientY - rect.top;
    const canvasY = clientY * (G.size / rect.height);
    const rowH = (G.bottom - G.top) / G.rows;
    const r = Math.floor((canvasY - G.top) / rowH);

    if (r >= 0 && r < G.rows) {
      setFocusedRow(r);
      if (weave.rows[r] === weave.pick) {
        dispatch(setWeaveRow(r, null));
      } else {
        dispatch(setWeaveRow(r, weave.pick));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRow((prev) => (prev === null ? 0 : Math.min(G.rows - 1, prev + 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRow((prev) => (prev === null ? G.rows - 1 : Math.max(0, prev - 1)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const r = focusedRow ?? 0;
      if (weave.rows[r] === weave.pick) {
        dispatch(setWeaveRow(r, null));
      } else {
        dispatch(setWeaveRow(r, weave.pick));
      }
    } else if (e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      const idx = parseInt(e.key, 10) - 1;
      const s = HANG_TRONG.weave.strips[idx];
      if (s) {
        dispatch(setWeavePick(s.id));
      }
    }
  };

  const handleWear = () => {
    dispatch(setWeaveWearing(true));

    const side = state.side;
    const chapter = state.chapter;
    const sideCompanions = (COMPANIONS as Record<string, Record<string, string[]>>)[side] ?? {};
    const companionsList = sideCompanions[chapter] ?? [];
    const isCompanion = companionsList.includes('khan-ran');

    if (!isCompanion && onWearPiece) {
      loadManifest().then((m) => {
        const headPieceIds = new Set(
          m.pieces.filter((p) => p.layer === 'head' && p.side === side).map((p) => p.id)
        );
        onWearPiece('khan-ran', headPieceIds);
      });
    }

    dispatch(setWeaveOpen(false));
    say(HT_COPY.weaveSay);
  };

  const card = (
    <div
      ref={dialogRef}
      className="weave-card"
      role="dialog"
      aria-modal="true"
      aria-label={HT_COPY.weaveTitle}
    >
      <div className="weave-header">
        <h2 className="weave-title">{HT_COPY.weaveTitle}</h2>
        <button
          type="button"
          className="weave-close-btn"
          onClick={() => dispatch(setWeaveOpen(false))}
        >
          {HT_COPY.weaveClose}
        </button>
      </div>

      <div className="weave-note">{HT_COPY.weaveNote}</div>

      <div className="weave-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="weave-canvas"
          width={G.size}
          height={G.size}
          tabIndex={0}
          onClick={handleCanvasClick}
          onKeyDown={handleKeyDown}
          aria-label={HT_COPY.weaveTitle}
        />
      </div>

      <div className="weave-controls">
        {/* 8 strip buttons */}
        <div className="weave-strips-row" role="radiogroup" aria-label="Màu nan">
          {HANG_TRONG.weave.strips.map((s) => {
            const isChosen = weave.pick === s.id;
            const stripTitle = (HT_COPY.strips as Record<string, string>)[s.id] || s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`weave-strip-btn${isChosen ? ' chosen' : ''}`}
                style={{ backgroundImage: `url(${s.src})` }}
                title={stripTitle}
                aria-label={stripTitle}
                aria-pressed={isChosen}
                onClick={() => dispatch(setWeavePick(s.id))}
              />
            );
          })}
        </div>

        {/* Mode buttons, clear, wear */}
        <div className="weave-actions-row">
          <button
            type="button"
            className={`weave-action-btn${weave.mode === 1 ? ' active-mode' : ''}`}
            onClick={() => dispatch(setWeaveMode(1))}
          >
            {HT_COPY.weaveOne}
          </button>
          <button
            type="button"
            className={`weave-action-btn${weave.mode === 2 ? ' active-mode' : ''}`}
            onClick={() => dispatch(setWeaveMode(2))}
          >
            {HT_COPY.weaveTwo}
          </button>
          <button
            type="button"
            className="weave-action-btn"
            onClick={() => dispatch(clearWeave())}
          >
            {HT_COPY.weaveClear}
          </button>
          <button
            type="button"
            className="weave-action-btn wear-btn"
            onClick={handleWear}
          >
            {'✓ ' + HT_COPY.weaveWear}
          </button>
        </div>
      </div>
    </div>
  );

  const frame = document.querySelector('.design-frame-canvas, .design-frame-mobile');
  return frame ? createPortal(card, frame) : card;
}
