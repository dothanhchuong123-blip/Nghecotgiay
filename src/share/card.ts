import {
  COPY,
  LEVELS,
  COLORS,
  HANG_TRONG,
  garmentById,
  gidOf,
  pieceName,
  loadManifest,
  DollPiece,
  Manifest,
  COMPANIONS,
} from '../data';
import { AppState, Side, liveStore } from '../state';
import { currentPaper, paperId } from '../book/paper';
import { compose, loadImage } from '../doll/compose';
import { evaluateOutfit } from '../mix/advice';
import { getGlobalMixOutfit } from '../spreads/Mix';
import { say } from '../nghe/say';
import { drawCard3 } from './card3';

export { drawCard3 } from './card3';

export interface CardState {
  chapter?: string;
  side?: Side;
  level?: number;
  collage?: number;
  worn?: string[];
  colorId?: string;
  colorHex?: string;
  material?: string | null;
  vibe?: string | null;
  paperPick?: string | null;
  cardPhoto?: string | null;
  photoUrl?: string | null;
  score?: number;
  line?: string;
  [key: string]: any;
}

let activeCardPhoto: string | null = null;

export function setCardPhoto(url: string | null): void {
  activeCardPhoto = url;
}

export function getCardPhoto(): string | null {
  return activeCardPhoto;
}

export function clearCardPhoto(): void {
  activeCardPhoto = null;
}

const AFTER_LAYERS = new Set(['waist', 'over', 'jewel', 'carry', 'head']);

/**
 * Renders the gấm layer onto dollCanvas once with light at top-left
 */
async function applyGamLayer(
  dollCanvas: HTMLCanvasElement,
  chapter: string,
  side: 'nu' | 'nam',
  worn: string[],
  gamId: string
): Promise<void> {
  try {
    const manifest: Manifest = await loadManifest();
    const aoId = gidOf(chapter, side);
    const aoPiece = manifest.pieces.find((p) => p.id === aoId && p.side === side);
    if (!aoPiece || !aoPiece.dye) return;

    const box = aoPiece.box; // [x, y, w, h] on 1200x1600
    const cw = box[2];
    const ch = box[3];
    if (cw <= 0 || ch <= 0) return;

    const [aoImg, dyeImg] = await Promise.all([
      loadImage(aoPiece.src),
      loadImage(aoPiece.dye),
    ]);

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

    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = cw;
    aoCanvas.height = ch;
    const aoCtx = aoCanvas.getContext('2d')!;
    aoCtx.drawImage(aoImg, 0, 0, cw, ch);
    const aoData = aoCtx.getImageData(0, 0, cw, ch).data;

    const dyeCanvas = document.createElement('canvas');
    dyeCanvas.width = cw;
    dyeCanvas.height = ch;
    const dyeCtx = dyeCanvas.getContext('2d')!;
    dyeCtx.drawImage(dyeImg, 0, 0, cw, ch);
    const dyeData = dyeCtx.getImageData(0, 0, cw, ch).data;

    const afterCanvas = document.createElement('canvas');
    afterCanvas.width = cw;
    afterCanvas.height = ch;
    const afterCtx = afterCanvas.getContext('2d')!;
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

    const gamItem = HANG_TRONG.gam.find((g) => g.id === gamId) ?? HANG_TRONG.gam[0];
    const gamImg = await loadImage(gamItem.src);

    const hCanvas = document.createElement('canvas');
    hCanvas.width = cw;
    hCanvas.height = ch;
    const hCtx = hCanvas.getContext('2d')!;
    hCtx.filter = 'blur(2.2px)';
    const tileSize = 190;
    const tCanvas = document.createElement('canvas');
    tCanvas.width = tileSize;
    tCanvas.height = tileSize;
    const tCtx = tCanvas.getContext('2d')!;
    tCtx.drawImage(gamImg, 0, 0, tileSize, tileSize);
    const pattern = hCtx.createPattern(tCanvas, 'repeat');
    if (pattern) {
      hCtx.fillStyle = pattern;
      hCtx.fillRect(0, 0, cw, ch);
    }
    const hData = hCtx.getImageData(0, 0, cw, ch).data;
    const H = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      H[i] = hData[i * 4] / 255;
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cw;
    outCanvas.height = ch;
    const outCtx = outCanvas.getContext('2d')!;
    const outImageData = outCtx.createImageData(cw, ch);
    const outData = outImageData.data;

    const lz = 0.3 * cw;
    const invWidth = 1.0 / cw;

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

          const nx = dx * invLen;
          const ny = dy * invLen;
          const nz = 1.0 * invLen;

          // Light at top-left: lx = 0, ly = 0
          const ldx = -x;
          const ldy = -y;
          const distSq = ldx * ldx + ldy * ldy;
          const dist = Math.sqrt(distSq);
          const lLen = Math.sqrt(distSq + lz * lz);
          const invLLen = 1.0 / lLen;

          const Lx = ldx * invLLen;
          const Ly = ldy * invLLen;
          const Lz = lz * invLLen;

          const dot = nx * Lx + ny * Ly + nz * Lz;
          const v = (dot - Lz) * 1.7;

          const dRatio = 1.0 - 1.5 * dist * invWidth;
          const sheen = dRatio > 0 ? dRatio * dRatio * 0.16 : 0;

          const pi = i * 4;
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
      }
    }

    outCtx.putImageData(outImageData, 0, 0);
    const dollCtx = dollCanvas.getContext('2d')!;
    dollCtx.drawImage(outCanvas, box[0], box[1]);
  } catch (err) {
    console.warn('Failed to apply gam layer to card doll:', err);
  }
}

/**
 * Draws a 1080×1920 PNG on a canvas matching the mockup specs.
 */
export async function drawCard(stateInput?: CardState | AppState): Promise<Blob> {
  const s = (stateInput || {}) as CardState;
  const photoUrl = s.cardPhoto ?? s.photoUrl ?? activeCardPhoto;

  const level = Number(s.level ?? s.collage ?? liveStore.get().collage ?? 1);

  if (level === 3 && !photoUrl) {
    const live = liveStore.get();
    const globalOutfit = getGlobalMixOutfit();
    const chapter = s.chapter ?? live.chapter ?? 'ao-dai';
    const side: Side = s.side ?? live.side ?? 'nu';
    const worn: string[] = s.worn ?? globalOutfit.worn ?? [];
    const colorId = s.colorId ?? globalOutfit.colorId ?? COLORS[0].id;
    const vibe = s.vibe !== undefined ? s.vibe : (live.vibe ?? null);

    return drawCard3({
      chapter,
      side,
      worn,
      colorId,
      level,
      vibe,
    });
  }

  // First await document.fonts.load for "800 150px Bricolage Grotesque" and "700 30px Be Vietnam Pro"
  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('800 150px "Bricolage Grotesque"'),
        document.fonts.load('700 30px "Be Vietnam Pro"'),
        document.fonts.load('700 40px "Be Vietnam Pro"'),
        document.fonts.load('700 28px "Be Vietnam Pro"'),
        document.fonts.load('800 20px "Be Vietnam Pro"'),
        document.fonts.load('800 110px "Bricolage Grotesque"'),
        document.fonts.load('italic 40px "Be Vietnam Pro"'),
      ]);
    } catch (e) {
      console.warn('Font load error:', e);
    }
  }

  const globalOutfit = getGlobalMixOutfit();
  const chapter = s.chapter || 'ao-dai';
  const side: Side = s.side || 'nu';
  const worn: string[] = s.worn ?? globalOutfit.worn ?? [];
  const colorId = s.colorId ?? globalOutfit.colorId ?? COLORS[0].id;
  const activeColor = COLORS.find((c) => c.id === colorId) || COLORS[0];
  const colorHex = s.colorHex || activeColor.hex;
  const material = s.material !== undefined ? s.material : null;

  const g = garmentById(gidOf(chapter, side)) || garmentById(chapter) || {
    name: chapter,
    levels: [1, 2, 3],
    must_show: [],
    colors_classic: [],
  };

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas 2D context');
  }

  // 1. Background: the current Hàng Trống paper (paperId, 27c) fills the card;
  // on it a #F4ECDD sheet inset 40px with faint dots, so the paper shows as a 40px frame.
  const paperState = {
    spread: 4,
    chapter,
    vibe: stateInput?.vibe ?? null,
    paperPick: stateInput?.paperPick ?? null,
  };
  const activePaperKey = paperId(paperState);
  const paper = currentPaper(paperState);

  // Fill card with base colour
  ctx.fillStyle = paper.base || '#3C9D8D';
  ctx.fillRect(0, 0, 1080, 1920);

  try {
    const paperImg = await loadImage(paper.src);
    if (paper.mode === 'tile') {
      const tileDim = paper.tile || 760;
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tileDim;
      tileCanvas.height = tileDim;
      const tCtx = tileCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(paperImg, 0, 0, tileDim, tileDim);
        const pat = ctx.createPattern(tileCanvas, 'repeat');
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, 0, 1080, 1920);
        }
      }
    } else {
      // Cover-fit paper
      const scale = Math.max(1080 / paperImg.width, 1920 / paperImg.height);
      const sw = 1080 / scale;
      const sh = 1920 / scale;
      const sx = (paperImg.width - sw) / 2;
      const sy = (paperImg.height - sh) * 0.69;
      ctx.drawImage(paperImg, sx, sy, sw, sh, 0, 0, 1080, 1920);
    }
  } catch (err) {
    console.warn(`[art missing] ${paper.src}`);
  }

  // #F4ECDD sheet inset 40px with faint dots
  ctx.save();
  ctx.fillStyle = '#F4ECDD';
  ctx.fillRect(40, 40, 1000, 1840);

  // Faint dots grid
  ctx.beginPath();
  ctx.rect(40, 40, 1000, 1840);
  ctx.clip();
  ctx.fillStyle = 'rgba(42, 33, 27, 0.07)';
  const dotSpacing = 24;
  for (let x = 40 + dotSpacing; x < 1040; x += dotSpacing) {
    for (let y = 40 + dotSpacing; y < 1880; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 2. Draw /icons/giay-192.png at (80, 80), 96 × 96, rotate −4°
  try {
    const sealImg = await loadImage('/icons/giay-192.png');
    ctx.save();
    ctx.translate(80 + 48, 80 + 48);
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.drawImage(sealImg, -48, -48, 96, 96);
    ctx.restore();
  } catch (err) {
    console.warn('[art missing] /icons/giay-192.png');
  }

  // 3. Date top-right: "dd · mm · yyyy", 700 28px, #6A5B4D, right-aligned at x 1000, y 140
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const dateStr = `${dd} · ${mm} · ${yyyy}`;

  ctx.save();
  ctx.font = '700 28px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#6A5B4D';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(dateStr, 1000, 140);
  ctx.restore();

  // 4. Garment name: 800 150px Bricolage Grotesque, #2A211B, at (80, 330) baseline (shrink to fit 920px)
  const garmentName = g.name || chapter;
  ctx.save();
  let titleFontSize = 150;
  ctx.font = `800 ${titleFontSize}px "Bricolage Grotesque", sans-serif`;
  let titleWidth = ctx.measureText(garmentName).width;
  if (titleWidth > 920) {
    titleFontSize = Math.floor(150 * (920 / titleWidth));
    ctx.font = `800 ${titleFontSize}px "Bricolage Grotesque", sans-serif`;
  }
  ctx.fillStyle = '#2A211B';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(garmentName, 80, 330);
  ctx.restore();

  // 10. Two tape strips rgba(233,215,170,.75):
  // Strip 1: 220×52 at (740, 330) rotate 12°
  ctx.save();
  ctx.translate(740 + 110, 330 + 26);
  ctx.rotate((12 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(233, 215, 170, 0.75)';
  ctx.fillRect(-110, -26, 220, 52);
  ctx.restore();

  // 5. Level pill: LEVELS[level].name, 700 40px white on #2C3E63, padding 10/28, rotate −3°,
  // at (80, 375), with a 5px white outline.
  const levelObj = (LEVELS as Record<string, any>)[String(level)] || LEVELS['1'];
  const levelName = levelObj?.name || 'Chuẩn cổ phục';

  ctx.save();
  ctx.font = '700 40px "Be Vietnam Pro", sans-serif';
  const levelTextW = ctx.measureText(levelName).width;
  const pillW = levelTextW + 28 * 2;
  const pillH = 40 + 10 * 2; // 60px

  ctx.translate(80, 375);
  ctx.rotate((-3 * Math.PI) / 180);

  ctx.beginPath();
  ctx.roundRect(0, 0, pillW, pillH, pillH / 2);
  ctx.fillStyle = level === 2 ? '#2F7D6B' : '#2C3E63';
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(levelName, pillW / 2, pillH / 2);
  ctx.restore();

  // 6. The doll: compose() result drawn at (165, 480), 750×1000, with a 3px white edge around it
  // (draw the doll's silhouette in white offset in 8 directions first) and a soft shadow.
  // If the photo from prompt 34 was sent with P.toCard, draw the photo instead (cover-fit into 750×1000, white 12px border, rotate 2°).
  // If store.material is set, draw the gấm layer (27e) once on the doll with the light at the top-left.
  // A woven khăn (27f) is already in compose().
  if (photoUrl) {
    try {
      const photoImg = await loadImage(photoUrl);
      ctx.save();
      ctx.translate(165 + 375, 480 + 500);
      ctx.rotate((2 * Math.PI) / 180);

      // Soft shadow
      ctx.shadowColor = 'rgba(42, 33, 27, 0.24)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12;

      // White card base
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-375, -500, 750, 1000);
      ctx.shadowColor = 'transparent';

      // Inner image 12px border
      const iw = 750 - 24;
      const ih = 1000 - 24;
      const imgScale = Math.max(iw / photoImg.width, ih / photoImg.height);
      const sw = iw / imgScale;
      const sh = ih / imgScale;
      const sx = (photoImg.width - sw) / 2;
      const sy = (photoImg.height - sh) / 2;

      ctx.beginPath();
      ctx.rect(-375 + 12, -500 + 12, iw, ih);
      ctx.clip();
      ctx.drawImage(photoImg, sx, sy, sw, sh, -375 + 12, -500 + 12, iw, ih);
      ctx.restore();
    } catch {
      console.warn(`[art missing] ${photoUrl}`);
    }
  } else {
    try {
      const dollCanvas = await compose({
        side,
        chapter,
        worn,
        colorHex,
        weave: stateInput?.weave,
      });

      // If store.material is set, apply gấm layer once
      if (material) {
        await applyGamLayer(dollCanvas, chapter, side, worn, material);
      }

      // Create silhouette canvas (750x1000)
      const silCanvas = document.createElement('canvas');
      silCanvas.width = 750;
      silCanvas.height = 1000;
      const silCtx = silCanvas.getContext('2d')!;
      silCtx.drawImage(dollCanvas, 0, 0, 750, 1000);
      silCtx.globalCompositeOperation = 'source-in';
      silCtx.fillStyle = '#FFFFFF';
      silCtx.fillRect(0, 0, 750, 1000);

      // Soft shadow
      ctx.save();
      ctx.shadowColor = 'rgba(42, 33, 27, 0.22)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12;
      ctx.drawImage(silCanvas, 165, 480, 750, 1000);
      ctx.restore();

      // Draw silhouette in white offset in 8 directions by 3px
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        const ox = Math.round(3 * Math.cos(rad));
        const oy = Math.round(3 * Math.sin(rad));
        ctx.drawImage(silCanvas, 165 + ox, 480 + oy, 750, 1000);
      }
      ctx.restore();

      // Draw doll on top
      ctx.drawImage(dollCanvas, 165, 480, 750, 1000);
    } catch (err) {
      console.warn('Failed to compose doll for card:', err);
    }
  }

  // 7. Worn pieces as pills down the left: pieceName, 700 30px, white pills with a 4px white edge,
  // from (60, 900), 64px tall, 18px apart, alternating rotate ±2°.
  if (worn.length > 0) {
    ctx.save();
    ctx.font = '700 30px "Be Vietnam Pro", sans-serif';

    worn.forEach((pieceId: string, idx: number) => {
      const name = pieceName(pieceId) || pieceId;
      const tw = ctx.measureText(name).width;
      const pw = tw + 28 * 2;
      const ph = 64;
      const py = 900 + idx * (64 + 18);
      const rotDeg = idx % 2 === 0 ? -2 : 2;

      ctx.save();
      ctx.translate(60, py + 32);
      ctx.rotate((rotDeg * Math.PI) / 180);

      // Soft paper shadow
      ctx.shadowColor = 'rgba(42, 33, 27, 0.16)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.beginPath();
      ctx.roundRect(0, -32, pw, ph, 32);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Reset shadow for outline
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#2A211B';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 28, 0);

      ctx.restore();
    });
    ctx.restore();
  }

  // Strip 2: 200×50 at (120, 1360) rotate −14°
  ctx.save();
  ctx.translate(120 + 100, 1360 + 25);
  ctx.rotate((-14 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(233, 215, 170, 0.75)';
  ctx.fillRect(-100, -25, 200, 50);
  ctx.restore();

  // Evaluate outfit for score & line
  const evaluation = evaluateOutfit({
    garment: g as any,
    worn,
    colorId,
    level,
    side,
    chapter,
    vibe: s.vibe ?? null,
  });

  // 8. Nghê's line in a box (80, 1510) 700 wide: #EADFCB, italic 40px/1.35 Be Vietnam Pro, then "— Nghê" 700 30px #B4302B.
  let rawLine =
    s.line ||
    COPY.mix.scoreLines[evaluation.band] ||
    COPY.mix.scoreLines.high;
  if (!rawLine.startsWith('“') && !rawLine.startsWith('"')) {
    rawLine = `“${rawLine}”`;
  }

  ctx.save();
  ctx.font = 'italic 40px "Be Vietnam Pro", sans-serif';
  const words = rawLine.split(' ');
  const quoteLines: string[] = [];
  let cur = '';
  const maxTextW = 700 - 36 * 2; // 628px
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxTextW) {
      cur = test;
    } else {
      if (cur) quoteLines.push(cur);
      cur = w;
    }
  }
  if (cur) quoteLines.push(cur);

  const quoteLineHeight = 40 * 1.35; // 54px
  const padTop = 36;
  const padBottom = 36;
  const quoteH = quoteLines.length * quoteLineHeight;
  const gap = 16;
  const authorH = 30;
  const boxH = padTop + quoteH + gap + authorH + padBottom;

  // Box background
  ctx.fillStyle = '#EADFCB';
  ctx.beginPath();
  ctx.roundRect(80, 1510, 700, boxH, 8);
  ctx.fill();

  // Text
  ctx.fillStyle = '#2A211B';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  quoteLines.forEach((ql, qIdx) => {
    ctx.fillText(ql, 80 + 36, 1510 + padTop + qIdx * quoteLineHeight);
  });

  // "— Nghê"
  ctx.fillStyle = '#B4302B';
  ctx.font = '700 30px "Be Vietnam Pro", sans-serif';
  ctx.fillText('— Nghê', 80 + 36, 1510 + padTop + quoteH + gap);
  ctx.restore();

  // 9. Score card: (810, 1530) 190×190, white, rotate 4°: COPY.mix.score 700 22px #B4302B and the number 800 110px.
  ctx.save();
  ctx.translate(810 + 95, 1530 + 95);
  ctx.rotate((4 * Math.PI) / 180);

  // Soft shadow
  ctx.shadowColor = 'rgba(42, 33, 27, 0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(-95, -95, 190, 190, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // COPY.mix.score
  ctx.fillStyle = '#B4302B';
  ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText((COPY.mix.score || 'Nghê chấm').toUpperCase(), 0, -95 + 24);

  // The number
  const finalScore = s.score ?? evaluation.score;
  ctx.fillStyle = '#2A211B';
  ctx.font = '800 110px "Bricolage Grotesque", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(finalScore), 0, 16);
  ctx.restore();

  // 11. Footer COPY.mix.cardFooter centred at y 1860, 700 30px #6A5B4D
  ctx.save();
  ctx.font = '700 30px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#6A5B4D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(COPY.mix.cardFooter, 540, 1860);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create canvas blob'));
    }, 'image/png');
  });
}

/**
 * Handles the card export flow:
 * 1. Nghê says COPY.mix.cardMaking
 * 2. Draws the card
 * 3. Shares via navigator.canShare({files}) or downloads as "nghe-cot-<chapter>-<level>.png"
 * 4. Nghê says COPY.mix.cardSaved
 */
export async function exportCard(params?: CardState): Promise<void> {
  say(COPY.mix.cardMaking);
  // Wait a small tick so speech bubble renders
  await new Promise((r) => setTimeout(r, 60));

  try {
    const blob = await drawCard(params);
    const chapter = params?.chapter || 'ao-dai';
    const level = params?.level ?? params?.collage ?? 1;
    const fileName = `nghe-cot-${chapter}-${level}.png`;

    const file = new File([blob], fileName, { type: 'image/png' });
    let shared = false;

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        shared = true;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          shared = true; // User cancelled, don't trigger download
        }
      }
    }

    if (!shared) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    say(COPY.mix.cardSaved);
  } catch (err) {
    console.error('Failed to export card:', err);
  }
}
