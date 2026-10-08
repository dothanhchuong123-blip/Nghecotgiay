import {
  loadManifest,
  gidOf,
  COMPANIONS,
  DollPiece,
  Manifest,
} from '../data';
import { dyeGarment, dyeAuto } from './dye';
import { PieceColors, getPieceColors, pieceColorsKey } from '../mix/pieceColors';
import { wovenTile } from './woven';
import { WeaveState } from '../state';

export interface ComposeOptions {
  side: 'nu' | 'nam';
  chapter: string;
  worn: string[];
  off?: string[];
  colorHex?: string;
  weave?: WeaveState;
  /** custom dye per worn piece; falls back to the shared store */
  pieceColors?: PieceColors;
}

export const LAYER_ORDER: readonly string[] = [
  'under',
  'bottom',
  'feet',
  'ao',
  'waist',
  'over',
  'jewel',
  'carry',
  'head',
];

// Cache images once by src (Map by src)
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[art missing] ${src}`);
      reject(new Error(`Failed to load ${src}`));
    };
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

// Cache whole results by their arguments
const composeCache = new Map<string, Promise<HTMLCanvasElement>>();

function getCacheKey(options: ComposeOptions): string {
  const { side, chapter, worn = [], off = [], colorHex = '', weave } = options;
  const sortedWorn = [...worn].sort().join(',');
  const sortedOff = [...off].sort().join(',');
  const weaveKey = weave?.wearing
    ? `w:${weave.mode}:${weave.rows.join('-')}`
    : 'no-weave';
  const pcKey = pieceColorsKey(options.pieceColors ?? getPieceColors());
  return `${side}|${chapter}|${sortedWorn}|${sortedOff}|${colorHex}|${weaveKey}|${pcKey}`;
}

function findPiece(
  pieces: DollPiece[],
  id: string,
  side: 'nu' | 'nam'
): DollPiece | undefined {
  return pieces.find((p) => p.id === id && p.side === side);
}

function getLayerRank(layer: string): number {
  const idx = LAYER_ORDER.indexOf(layer);
  return idx !== -1 ? idx : 999;
}

async function renderDoll(options: ComposeOptions): Promise<HTMLCanvasElement> {
  const { side, chapter, worn, off = [], colorHex } = options;

  // 1. loadManifest(). Canvas 1200×1600 (manifest canvas).
  const manifest: Manifest = await loadManifest();
  const canvas = document.createElement('canvas');
  canvas.width = manifest.canvas?.w || 1200;
  canvas.height = manifest.canvas?.h || 1600;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context for doll canvas');
  }

  // 2. The outfit = the áo (the piece with id gidOf(chapter, side)) + COMPANIONS[side][chapter]
  // without the ids in off + worn. A worn piece REPLACES any companion with the same manifest
  // layer (e.g. jeans replace quần lụa; a cap replaces khăn vấn); the áo is never replaced.
  // Pieces not in the manifest for this side are skipped with console.warn.

  // Worn pieces
  const wornPieces: DollPiece[] = [];
  for (const wornId of worn) {
    const piece = findPiece(manifest.pieces, wornId, side);
    if (!piece) {
      console.warn(`[doll] Piece not in manifest for ${side}: ${wornId}`);
    } else {
      wornPieces.push(piece);
    }
  }
  const wornLayers = new Set(wornPieces.map((p) => p.layer));

  // The áo piece
  const aoId = gidOf(chapter, side);
  const aoPiece = findPiece(manifest.pieces, aoId, side);
  if (!aoPiece) {
    console.warn(`[doll] Piece not in manifest for ${side}: ${aoId}`);
  }

  // Companions
  const sideCompanions =
    (COMPANIONS as Record<string, Record<string, string[]>>)[side] ?? {};
  const companionsList =
    sideCompanions[chapter] ?? sideCompanions[gidOf(chapter, side)] ?? [];

  const offSet = new Set(off);
  const wornSet = new Set(worn);

  const keptCompanionPieces: DollPiece[] = [];
  for (const compId of companionsList) {
    if (offSet.has(compId) || wornSet.has(compId)) {
      continue;
    }
    const compPiece = findPiece(manifest.pieces, compId, side);
    if (!compPiece) {
      console.warn(`[doll] Piece not in manifest for ${side}: ${compId}`);
      continue;
    }
    // A worn piece REPLACES any companion with the same manifest layer
    if (wornLayers.has(compPiece.layer)) {
      continue;
    }
    keptCompanionPieces.push(compPiece);
  }

  const pieceDye = options.pieceColors ?? getPieceColors();

  // Assemble outfit
  const outfitPieces: DollPiece[] = [];
  if (aoPiece) {
    outfitPieces.push(aoPiece);
  }
  for (const comp of keptCompanionPieces) {
    outfitPieces.push(comp);
  }
  for (const w of wornPieces) {
    // The áo is never replaced; if a worn piece has the same id as the áo, do not duplicate
    if (aoPiece && w.id === aoPiece.id) {
      continue;
    }
    outfitPieces.push(w);
  }

  // Draw bodies[side] (or bodiesLegs if any piece in the outfit has hidesShorts)
  const hasHidesShorts = outfitPieces.some((p) => p.hidesShorts);
  const bodySrc = (hasHidesShorts && manifest.bodiesLegs?.[side])
    ? manifest.bodiesLegs[side]
    : manifest.bodies?.[side];
  if (bodySrc) {
    try {
      const bodyImg = await loadImage(bodySrc);
      ctx.drawImage(bodyImg, 0, 0, canvas.width, canvas.height);
    } catch {
      // Missing art logged by loadImage
    }
  } else {
    console.warn(`[doll] Body not in manifest for ${side}`);
  }

  // 3. Draw in this layer order: under, bottom, feet, ao, waist, over, jewel, carry, head.
  // Each piece at box [x, y, w, h].
  outfitPieces.sort((a, b) => getLayerRank(a.layer) - getLayerRank(b.layer));

  for (const piece of outfitPieces) {
    try {
      const img = await loadImage(piece.src);
      const [x, y, w, h] = piece.box;

      if (piece.id === 'khan-ran' && options.weave?.wearing) {
        try {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = w;
          pieceCanvas.height = h;
          const pCtx = pieceCanvas.getContext('2d');
          if (pCtx) {
            pCtx.filter = 'grayscale(1) brightness(1.55) contrast(.85)';
            pCtx.drawImage(img, 0, 0, w, h);
            pCtx.filter = 'none';

            pCtx.globalCompositeOperation = 'multiply';
            const cell = w / 14;
            const tile = wovenTile(options.weave, cell);
            const pattern = pCtx.createPattern(tile, 'repeat');
            if (pattern) {
              pCtx.fillStyle = pattern;
              pCtx.fillRect(0, 0, w, h);
            }

            pCtx.globalCompositeOperation = 'destination-in';
            pCtx.drawImage(img, 0, 0, w, h);

            pCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(pieceCanvas, x, y, w, h);
          } else {
            ctx.drawImage(img, x, y, w, h);
          }
        } catch {
          ctx.drawImage(img, x, y, w, h);
        }
      } else if (colorHex && piece.dye && (piece.layer === 'ao' || piece.id === aoId)) {
        try {
          const dyedCanvas = await dyeGarment(piece.src, piece.dye, colorHex);
          ctx.drawImage(dyedCanvas, x, y, w, h);
        } catch {
          ctx.drawImage(img, x, y, w, h);
        }
      } else if (pieceDye[piece.id] && piece.id !== aoId && wornSet.has(piece.id)) {
        try {
          const dyed = await dyeAuto(piece.src, pieceDye[piece.id]);
          ctx.drawImage(dyed, x, y, w, h);
        } catch {
          ctx.drawImage(img, x, y, w, h);
        }
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    } catch {
      // Missing art logged by loadImage
    }
  }

  return canvas;
}

export function compose(options: ComposeOptions): Promise<HTMLCanvasElement> {
  const key = getCacheKey(options);
  const cached = composeCache.get(key);
  if (cached) {
    return cached;
  }

  const promise = renderDoll(options);
  composeCache.set(key, promise);
  return promise;
}

export function clearDollCache() {
  composeCache.clear();
}
