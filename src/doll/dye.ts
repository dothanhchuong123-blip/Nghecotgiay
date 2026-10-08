import { loadImage } from './compose';

// Precomputed sRGB byte (0..255) to linear float [0..1] table
const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] =
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

export function rgbToOklab(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const lr = SRGB_TO_LINEAR[r];
  const lg = SRGB_TO_LINEAR[g];
  const lb = SRGB_TO_LINEAR[b];

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_val = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  return [L, a, b_val];
}

export function oklabToRgb(
  L: number,
  a: number,
  b: number
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const r = Math.round(Math.max(0, Math.min(255, linearToSrgb(lr) * 255)));
  const g = Math.round(Math.max(0, Math.min(255, linearToSrgb(lg) * 255)));
  const b_res = Math.round(Math.max(0, Math.min(255, linearToSrgb(lb) * 255)));

  return [r, g, b_res];
}

export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned =
      cleaned[0] +
      cleaned[0] +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2];
  }
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) {
    return [0, 0, 0];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// 2. Target colour hex → OKLab → (Lt, Ct, Ht) (chroma and hue from a, b)
// 3. Build a 1024-entry lookup table over L:
//    Ln = clamp(Lt + (L − Lref), 0.02, 0.99);
//    Cn = Ct · clamp(1 − |Ln − Lt|·1.2, 0.35, 1);
//    colour = OKLab(Ln, Cn·cos Ht, Cn·sin Ht) → sRGB.
export function buildLut(colorHex: string, Lref: number): Uint8Array {
  const [rt, gt, bt] = hexToRgb(colorHex);
  const [Lt, at, btLab] = rgbToOklab(rt, gt, bt);

  const Ct = Math.sqrt(at * at + btLab * btLab);
  const Ht = Math.atan2(btLab, at);

  const cosHt = Math.cos(Ht);
  const sinHt = Math.sin(Ht);

  const lut = new Uint8Array(1024 * 3);

  for (let k = 0; k < 1024; k++) {
    const L = k / 1023;
    const Ln = clamp(Lt + (L - Lref), 0.02, 0.99);
    const Cn = Ct * clamp(1 - Math.abs(Ln - Lt) * 1.2, 0.35, 1);

    const a = Cn * cosHt;
    const b = Cn * sinHt;

    const [r, g, bRes] = oklabToRgb(Ln, a, b);

    lut[k * 3] = r;
    lut[k * 3 + 1] = g;
    lut[k * 3 + 2] = bRes;
  }

  return lut;
}

interface PiecePrepData {
  width: number;
  height: number;
  origPixels: Uint8ClampedArray;
  maskWeights: Float32Array;
  pixelLutIndices: Int16Array;
  Lref: number;
}

const prepCache = new Map<string, Promise<PiecePrepData>>();

async function getPiecePrep(
  pieceSrc: string,
  dyeSrc: string
): Promise<PiecePrepData> {
  const key = `${pieceSrc}|${dyeSrc}`;
  const cached = prepCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const [pieceImg, maskImg] = await Promise.all([
      loadImage(pieceSrc),
      loadImage(dyeSrc),
    ]);

    const width = pieceImg.naturalWidth || pieceImg.width;
    const height = pieceImg.naturalHeight || pieceImg.height;

    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = width;
    pieceCanvas.height = height;
    const pieceCtx = pieceCanvas.getContext('2d');
    if (!pieceCtx) {
      throw new Error('Failed to get 2d context for piece');
    }
    pieceCtx.drawImage(pieceImg, 0, 0, width, height);
    const pieceImageData = pieceCtx.getImageData(0, 0, width, height);
    const pieceData = pieceImageData.data;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      throw new Error('Failed to get 2d context for dye mask');
    }
    maskCtx.drawImage(maskImg, 0, 0, width, height);
    const maskImageData = maskCtx.getImageData(0, 0, width, height);
    const maskData = maskImageData.data;

    const total = width * height;
    const maskWeights = new Float32Array(total);
    const pixelLutIndices = new Int16Array(total);

    let sumL = 0;
    let count = 0;

    // 1. For each masked pixel compute OKLab L. Lref = average L of masked pixels.
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      const maskVal = maskData[pi];
      const alpha = pieceData[pi + 3];

      if (alpha === 0 || maskVal === 0) {
        maskWeights[i] = 0;
        pixelLutIndices[i] = -1;
        continue;
      }

      const r = pieceData[pi];
      const g = pieceData[pi + 1];
      const b = pieceData[pi + 2];

      const [L] = rgbToOklab(r, g, b);

      if (maskVal > 128) {
        sumL += L;
        count++;
      }

      maskWeights[i] = maskVal / 255;
      let idx = Math.round(L * 1023);
      if (idx < 0) idx = 0;
      else if (idx > 1023) idx = 1023;
      pixelLutIndices[i] = idx;
    }

    const Lref = count > 0 ? sumL / count : 0.5;

    return {
      width,
      height,
      origPixels: pieceData,
      maskWeights,
      pixelLutIndices,
      Lref,
    };
  })();

  prepCache.set(key, promise);
  return promise;
}

// 5. Cache the result per (piece src, hex). Target: under 30 ms per colour.
const dyeResultCache = new Map<string, Promise<HTMLCanvasElement>>();

export function dyeGarment(
  pieceSrc: string,
  dyeSrc: string,
  colorHex: string
): Promise<HTMLCanvasElement> {
  const normalizedHex = colorHex.trim().toLowerCase();
  const cacheKey = `${pieceSrc}|${normalizedHex}`;

  const cached = dyeResultCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const prep = await getPiecePrep(pieceSrc, dyeSrc);
    const lut = buildLut(normalizedHex, prep.Lref);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = prep.width;
    outCanvas.height = prep.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      throw new Error('Failed to get 2d context for dyed canvas');
    }

    const outImageData = outCtx.createImageData(prep.width, prep.height);
    const outPixels = outImageData.data;
    const orig = prep.origPixels;
    const weights = prep.maskWeights;
    const indices = prep.pixelLutIndices;
    const total = prep.width * prep.height;

    // 4. Each masked pixel takes the table colour at its L, keeps its alpha. Unmasked pixels stay.
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      const w = weights[i];

      if (w <= 0) {
        outPixels[pi] = orig[pi];
        outPixels[pi + 1] = orig[pi + 1];
        outPixels[pi + 2] = orig[pi + 2];
        outPixels[pi + 3] = orig[pi + 3];
      } else {
        const lutIdx = indices[i] * 3;
        const lutR = lut[lutIdx];
        const lutG = lut[lutIdx + 1];
        const lutB = lut[lutIdx + 2];

        if (w >= 1) {
          outPixels[pi] = lutR;
          outPixels[pi + 1] = lutG;
          outPixels[pi + 2] = lutB;
          outPixels[pi + 3] = orig[pi + 3];
        } else {
          outPixels[pi] = Math.round(lutR * w + orig[pi] * (1 - w));
          outPixels[pi + 1] = Math.round(lutG * w + orig[pi + 1] * (1 - w));
          outPixels[pi + 2] = Math.round(lutB * w + orig[pi + 2] * (1 - w));
          outPixels[pi + 3] = orig[pi + 3];
        }
      }
    }

    outCtx.putImageData(outImageData, 0, 0);
    return outCanvas;
  })();

  dyeResultCache.set(cacheKey, promise);
  return promise;
}

export function clearDyeCache() {
  prepCache.clear();
  dyeResultCache.clear();
  autoPrepCache.clear();
  autoResultCache.clear();
}

// ---------------------------------------------------------------------------
// Auto-dye: worn modern pieces have no hand-made dye mask, so the piece's own
// pixels make one. Dark outlines / stitching and near-white highlights stay,
// everything in the middle takes the new colour with its shading kept.
// ---------------------------------------------------------------------------
const autoResultCache = new Map<string, Promise<HTMLCanvasElement>>();
const autoPrepCache = new Map<
  string,
  Promise<{
    width: number;
    height: number;
    orig: Uint8ClampedArray;
    weights: Float32Array;
    idx: Int16Array;
    Lref: number;
  }>
>();

function smooth(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

async function getAutoPrep(pieceSrc: string) {
  const cached = autoPrepCache.get(pieceSrc);
  if (cached) return cached;
  const promise = (async () => {
    const img = await loadImage(pieceSrc);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context for auto dye');
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const total = width * height;
    const weights = new Float32Array(total);
    const idx = new Int16Array(total);
    let sumL = 0;
    let wSum = 0;
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      if (data[pi + 3] < 8) {
        idx[i] = -1;
        continue;
      }
      const [L] = rgbToOklab(data[pi], data[pi + 1], data[pi + 2]);
      // keep outlines (dark) and highlights / white soles (very light)
      const w = smooth(0.2, 0.34, L) * (1 - smooth(0.9, 0.97, L));
      weights[i] = w;
      idx[i] = clamp(Math.round(L * 1023), 0, 1023);
      sumL += L * w;
      wSum += w;
    }
    return {
      width,
      height,
      orig: data,
      weights,
      idx,
      Lref: wSum > 0 ? sumL / wSum : 0.5,
    };
  })();
  autoPrepCache.set(pieceSrc, promise);
  return promise;
}

export function dyeAuto(pieceSrc: string, colorHex: string): Promise<HTMLCanvasElement> {
  const hex = colorHex.trim().toLowerCase();
  const key = `${pieceSrc}|auto|${hex}`;
  const cached = autoResultCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const prep = await getAutoPrep(pieceSrc);
    const lut = buildLut(hex, prep.Lref);
    const out = document.createElement('canvas');
    out.width = prep.width;
    out.height = prep.height;
    const octx = out.getContext('2d');
    if (!octx) throw new Error('Failed to get 2d context for auto-dyed canvas');
    const imageData = octx.createImageData(prep.width, prep.height);
    const px = imageData.data;
    const total = prep.width * prep.height;
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      const w = prep.weights[i];
      if (w <= 0) {
        px[pi] = prep.orig[pi];
        px[pi + 1] = prep.orig[pi + 1];
        px[pi + 2] = prep.orig[pi + 2];
      } else {
        const li = prep.idx[i] * 3;
        px[pi] = Math.round(lut[li] * w + prep.orig[pi] * (1 - w));
        px[pi + 1] = Math.round(lut[li + 1] * w + prep.orig[pi + 1] * (1 - w));
        px[pi + 2] = Math.round(lut[li + 2] * w + prep.orig[pi + 2] * (1 - w));
      }
      px[pi + 3] = prep.orig[pi + 3];
    }
    octx.putImageData(imageData, 0, 0);
    return out;
  })();
  autoResultCache.set(key, promise);
  return promise;
}
