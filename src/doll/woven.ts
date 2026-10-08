import { HANG_TRONG } from '../data';
import { WeaveState } from '../state';

export function wovenTile(weave: WeaveState, cell: number): HTMLCanvasElement {
  const G = HANG_TRONG.weave.geo;
  const cols = G.slits.length - 1; // 8 columns
  const rows = G.rows; // 9 rows

  const width = Math.max(1, Math.round(cols * cell));
  const height = Math.max(1, Math.round(rows * cell));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const stripRgbMap = new Map<string, [number, number, number]>();
  for (const s of HANG_TRONG.weave.strips) {
    stripRgbMap.set(s.id, s.rgb);
  }

  const mode = weave.mode;
  const period = 2 * mode;

  for (let r = 0; r < rows; r++) {
    const stripId = weave.rows[r];
    const rgb = stripId ? stripRgbMap.get(stripId) : null;
    const y0 = Math.round(r * cell);
    const y1 = Math.round((r + 1) * cell);
    const h = y1 - y0;

    for (let i = 0; i < cols; i++) {
      const isOnTop = ((i + r) % period) < mode;
      if (isOnTop && rgb) {
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      } else {
        ctx.fillStyle = 'rgb(239, 230, 210)';
      }

      const x0 = Math.round(i * cell);
      const x1 = Math.round((i + 1) * cell);
      const w = x1 - x0;
      ctx.fillRect(x0, y0, w, h);
    }
  }

  return canvas;
}
