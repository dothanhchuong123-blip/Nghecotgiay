import {
  COLORS,
  garmentById,
  gidOf,
  loadManifest,
  pieceName,
  vibeById,
  Manifest,
  DollPiece,
} from '../data';
import { Side } from '../state';
import { compose, loadImage } from '../doll/compose';
import { worldOf } from '../world/worlds';
import { getPatches, patchById } from '../mix/patches';
import { evaluateOutfit } from '../mix/advice';

export interface DrawCard3Options {
  chapter?: string;
  side?: Side;
  worn?: string[];
  colorId?: string;
  level?: number;
  vibe?: string | null;
}

interface LabelItem {
  piece: DollPiece;
  name: string;
  dotX: number;
  dotY: number;
  isLeft: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  connX: number;
  connY: number;
  index: number;
}

function getPieceName(piece: DollPiece, chapter: string): string {
  return (
    pieceName(piece.id) ||
    garmentById(piece.id)?.name ||
    garmentById(chapter)?.name ||
    piece.id
  );
}

const GU_LOOK_NAMES: Record<string, string> = {
  'duong-pho': 'Ra phố cực cháy',
  'toi-gian': 'Tối giản mà sang',
  'hoai-co': 'Hà Nội ngày xưa',
  'hoc-duong': 'Học bá Hà Nội',
  'le-hoi': 'Đi hội rực rỡ',
  'moc-mac': 'Về quê chill',
};

const NO_GU_LOOK_NAMES: Record<string, string> = {
  chuan: 'Chuẩn chỉnh',
  'giao-thoa': 'Giao thoa xinh xỉu',
  'duong-pho': 'Quẩy phố',
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 4
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      cur = test;
    } else {
      if (lines.length === maxLines - 1) {
        let tr = cur;
        while (tr.length > 0 && ctx.measureText(`${tr}…`).width > maxWidth) {
          const lastSpace = tr.lastIndexOf(' ');
          if (lastSpace > 0) tr = tr.slice(0, lastSpace);
          else tr = tr.slice(0, -1);
        }
        lines.push(`${tr}…`);
        return lines;
      }
      lines.push(cur);
      cur = w;
    }
  }

  if (cur) {
    lines.push(cur);
  }

  return lines.slice(0, maxLines);
}

function drawNeon(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  neonColor: string,
  blurs: number[] = [14, 28, 56]
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = neonColor;
  for (const blur of blurs) {
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(text, x, y);
  }
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draws the 1080×1920 share card for the current world/level.
 */
export async function drawCard3(options: DrawCard3Options): Promise<Blob> {
  // Wait for fonts first
  if (typeof document !== 'undefined' && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load('800 96px "Bricolage Grotesque"'),
        document.fonts.load('800 80px "Bricolage Grotesque"'),
        document.fonts.load('800 76px "Bricolage Grotesque"'),
        document.fonts.load('800 120px "Bricolage Grotesque"'),
        document.fonts.load('800 70px "Bricolage Grotesque"'),
        document.fonts.load('700 32px "Be Vietnam Pro"'),
        document.fonts.load('700 30px "Be Vietnam Pro"'),
        document.fonts.load('700 28px "Be Vietnam Pro"'),
        document.fonts.load('700 42px "Be Vietnam Pro"'),
        document.fonts.load('700 24px "Be Vietnam Pro"'),
        document.fonts.load('24px "Be Vietnam Pro"'),
        document.fonts.load('italic 32px "Be Vietnam Pro"'),
        document.fonts.load('64px "Patrick Hand"'),
        document.fonts.load('38px "Patrick Hand"'),
        document.fonts.load('36px "Patrick Hand"'),
        document.fonts.load('26px "Patrick Hand"'),
      ]);
    } catch (e) {
      console.warn('Font load error:', e);
    }
  }

  const chapter = options.chapter || 'ao-dai';
  const side: Side = options.side || 'nu';
  const worn = options.worn || [];
  const colorId = options.colorId || COLORS[0]?.id || 'son';
  const level = Number(options.level || 1);

  const activeColor = COLORS.find((c) => c.id === colorId) || COLORS[0];
  const colorHex = activeColor?.hex || '#B4302B';

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas 2D context');
  }

  // 1. The frame: worldOf(level).card drawn full size (cream fill if it fails).
  ctx.fillStyle = '#F4ECDD';
  ctx.fillRect(0, 0, 1080, 1920);

  const world = worldOf(level);
  try {
    const frameImg = await loadImage(world.card);
    ctx.drawImage(frameImg, 0, 0, 1080, 1920);
  } catch {
    console.warn(`[art missing] ${world.card}`);
  }

  // 2. The doll from compose({ side, chapter, worn, colorHex }) with a soft shadow:
  // chuan: height 1180 at y 400, centred;
  // giao-thoa: height 820 at y 455, centred on x 536, clipped to the polaroid window (150, 462, 772 × 790);
  // duong-pho: height 880 at y 615, centred.
  // Doll aspect ratio is 1200:1600 (0.75).
  let dh: number;
  let dy: number;
  let dx: number;
  let dw: number;

  const slug = world.slug;
  if (slug === 'chuan') {
    dh = 1180;
    dw = dh * 0.75; // 885
    dy = 400;
    dx = (1080 - dw) / 2; // 97.5
  } else if (slug === 'giao-thoa') {
    dh = 820;
    dw = dh * 0.75; // 615
    dy = 455;
    dx = 536 - dw / 2; // 228.5
  } else {
    // duong-pho
    dh = 880;
    dw = dh * 0.75; // 660
    dy = 615;
    dx = (1080 - dw) / 2; // 210
  }

  try {
    const dollCanvas = await compose({ side, chapter, worn, colorHex });

    ctx.save();
    if (slug === 'giao-thoa') {
      ctx.beginPath();
      ctx.rect(150, 462, 772, 790);
      ctx.clip();
    }

    // Soft shadow
    ctx.shadowColor = 'rgba(42, 33, 27, 0.28)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(dollCanvas, dx, dy, dw, dh);

    // Crisp doll layer on top
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.drawImage(dollCanvas, dx, dy, dw, dh);

    // Then the stuck patches (getPatches) at their fx/fy, 15% of the doll width, rotated.
    const stuckPatches = getPatches();
    const pw = 0.15 * dw;
    const ph = 0.15 * dw;

    for (const p of stuckPatches) {
      const pDef = patchById(p.id);
      if (!pDef) continue;
      try {
        const patchImg = await loadImage(pDef.src);
        const px = dx + p.fx * dw;
        const py = dy + p.fy * dh;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.shadowColor = 'rgba(42, 33, 27, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(patchImg, -pw / 2, -ph / 2, pw, ph);
        ctx.restore();
      } catch {
        console.warn(`[art missing] ${pDef.src}`);
      }
    }

    ctx.restore();
  } catch (err) {
    console.warn('Failed to compose doll for card3:', err);
  }

  // 3. Up to 5 labels: the áo + worn pieces that are in the manifest;
  // each one a curved line from the centre of the piece's box to a label at the left or right edge (alternating),
  // with a dot on the piece.
  // chuan: dotted dark-red line, cream box with a thin dark-red border, Be Vietnam Pro 700 32px;
  // giao-thoa: ink line, yellow sticky note, Patrick Hand 38px;
  // duong-pho: white line with a pink glow, lime dot, round sticker pills (white rim, pink or lime fill).
  try {
    const manifest: Manifest = await loadManifest();
    const aoId = gidOf(chapter, side);
    const aoPiece = manifest.pieces.find((p) => p.id === aoId && p.side === side);

    const labelPieces: DollPiece[] = [];
    if (aoPiece) {
      labelPieces.push(aoPiece);
    }

    for (const wId of worn) {
      if (labelPieces.length >= 5) break;
      const piece = manifest.pieces.find((p) => p.id === wId && p.side === side);
      if (piece && !labelPieces.some((existing) => existing.id === piece.id)) {
        labelPieces.push(piece);
      }
    }

    // Sort pieces by vertical position on the doll so leader lines do not cross
    const sortedPieces = [...labelPieces].sort((a, b) => {
      const ya = a.box[1] + a.box[3] / 2;
      const yb = b.box[1] + b.box[3] / 2;
      return ya - yb;
    });

    // Set font once to measure text
    if (slug === 'chuan') {
      ctx.font = '700 32px "Be Vietnam Pro", sans-serif';
    } else if (slug === 'giao-thoa') {
      ctx.font = '38px "Patrick Hand", cursive';
    } else {
      ctx.font = '700 30px "Be Vietnam Pro", sans-serif';
    }

    const items: LabelItem[] = sortedPieces.map((piece, index) => {
      const name = getPieceName(piece, chapter);
      const textW = ctx.measureText(name).width;

      const [bx, by, bw, bh] = piece.box;
      const dotX = dx + (bx + bw / 2) * (dw / 1200);
      const dotY = dy + (by + bh / 2) * (dh / 1600);

      const isLeft = index % 2 === 0;

      let w = textW + 36;
      let h = 54;
      if (slug === 'giao-thoa') {
        w = textW + 40;
        h = 58;
      } else if (slug === 'duong-pho') {
        w = textW + 44;
        h = 56;
      }

      const marginX = slug === 'giao-thoa' ? 60 : 70;
      const x = isLeft ? marginX : 1080 - marginX - w;
      const y = Math.max(440, Math.min(1680, dotY - h / 2));

      const connX = isLeft ? x + w : x;
      const connY = y + h / 2;

      return {
        piece,
        name,
        dotX,
        dotY,
        isLeft,
        x,
        y,
        w,
        h,
        connX,
        connY,
        index,
      };
    });

    // Prevent overlap for labels on the same side
    const leftItems = items.filter((it) => it.isLeft);
    const rightItems = items.filter((it) => !it.isLeft);

    const adjustSide = (list: LabelItem[]) => {
      const minGap = 20;
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        if (list[i].y < prev.y + prev.h + minGap) {
          list[i].y = prev.y + prev.h + minGap;
          list[i].connY = list[i].y + list[i].h / 2;
        }
      }
      // Ensure within bottom boundary
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].y + list[i].h > 1720) {
          list[i].y = 1720 - list[i].h;
          list[i].connY = list[i].y + list[i].h / 2;
        }
        if (i > 0 && list[i - 1].y + list[i - 1].h + minGap > list[i].y) {
          list[i - 1].y = list[i].y - list[i - 1].h - minGap;
          list[i - 1].connY = list[i - 1].y + list[i - 1].h / 2;
        }
      }
    };

    adjustSide(leftItems);
    adjustSide(rightItems);

    // Draw curved lines
    for (const item of items) {
      ctx.save();
      const cpDist = Math.abs(item.dotX - item.connX) * 0.5;
      const cp1x = item.isLeft ? item.dotX - cpDist * 0.6 : item.dotX + cpDist * 0.6;
      const cp1y = item.dotY;
      const cp2x = item.isLeft ? item.connX + cpDist * 0.6 : item.connX - cpDist * 0.6;
      const cp2y = item.connY;

      ctx.beginPath();
      ctx.moveTo(item.dotX, item.dotY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, item.connX, item.connY);

      if (slug === 'chuan') {
        ctx.strokeStyle = '#7E1F1A';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 6]);
        ctx.stroke();
      } else if (slug === 'giao-thoa') {
        ctx.strokeStyle = '#2A211B';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.stroke();
      } else {
        // duong-pho: white line with a pink glow
        ctx.shadowColor = '#FF2A85';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw dots on the pieces
    for (const item of items) {
      ctx.save();
      ctx.beginPath();
      if (slug === 'chuan') {
        ctx.arc(item.dotX, item.dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#7E1F1A';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(item.dotX, item.dotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFDF8';
        ctx.fill();
      } else if (slug === 'giao-thoa') {
        ctx.arc(item.dotX, item.dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2A211B';
        ctx.fill();
      } else {
        // duong-pho: lime dot
        ctx.shadowColor = '#76FF03';
        ctx.shadowBlur = 8;
        ctx.arc(item.dotX, item.dotY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#76FF03';
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw labels
    for (const item of items) {
      ctx.save();
      if (slug === 'chuan') {
        // cream box with a thin dark-red border, Be Vietnam Pro 700 32px
        ctx.shadowColor = 'rgba(42, 33, 27, 0.16)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#FFFDF8';
        ctx.fillRect(item.x, item.y, item.w, item.h);

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#7E1F1A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(item.x, item.y, item.w, item.h);

        ctx.font = '700 32px "Be Vietnam Pro", sans-serif';
        ctx.fillStyle = '#7E1F1A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name, item.x + item.w / 2, item.y + item.h / 2 + 1);
      } else if (slug === 'giao-thoa') {
        // yellow sticky note, Patrick Hand 38px
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        const rot = (item.index % 2 === 0 ? -2 : 2) * (Math.PI / 180);
        ctx.rotate(rot);

        ctx.shadowColor = 'rgba(42, 33, 27, 0.22)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(-item.w / 2, -item.h / 2, item.w, 8);

        ctx.font = '38px "Patrick Hand", cursive';
        ctx.fillStyle = '#2A211B';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name, 0, 2);
      } else {
        // duong-pho: round sticker pills (white rim, pink or lime fill)
        const isPink = item.index % 2 === 0;
        const fillCol = isPink ? '#FF2A85' : '#76FF03';
        const textCol = isPink ? '#FFFFFF' : '#111827';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.w, item.h, item.h / 2);
        ctx.fillStyle = fillCol;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.font = '700 30px "Be Vietnam Pro", sans-serif';
        ctx.fillStyle = textCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name, item.x + item.w / 2, item.y + item.h / 2 + 1);
      }
      ctx.restore();
    }
  } catch (err) {
    console.warn('Failed to render labels for card3:', err);
  }

  // 4. Garment data, look name and score
  const g = garmentById(gidOf(chapter, side)) || garmentById(chapter) || {
    id: chapter,
    name: chapter,
    period: '',
    summary_vi: '',
    levels: [1, 2, 3],
    must_show: [],
    colors_classic: [],
  };

  const evaluation = evaluateOutfit({
    chapter,
    side,
    garment: g as any,
    worn,
    colorId,
    level,
    vibe: options.vibe ?? null,
  });
  const score = evaluation.score;

  const vibe = options.vibe ?? null;
  const lookName =
    (vibe && GU_LOOK_NAMES[vibe]) ||
    NO_GU_LOOK_NAMES[slug] ||
    'Chuẩn chỉnh';

  if (slug === 'chuan') {
    // - chuan: the period in capitals (dark red, y 160), the áo's name (96px, y 262), “look name”
    // (italic, y 322), all centred; the score as a red square seal at (905, 1722), tilted, cream
    // inner line, the number 70px and "ĐIỂM".
    const periodText = (g.period || '').toUpperCase();
    if (periodText) {
      ctx.save();
      ctx.font = '700 28px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = '#7E1F1A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(periodText, 540, 160);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '800 96px "Bricolage Grotesque", sans-serif';
    ctx.fillStyle = '#2A211B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.name || chapter, 540, 262);
    ctx.restore();

    ctx.save();
    ctx.font = 'italic 32px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#6A5B4D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`“${lookName}”`, 540, 322);
    ctx.restore();

    // Red square seal at (905, 1722), tilted, cream inner line, the number 70px and "ĐIỂM"
    ctx.save();
    ctx.translate(905, 1722);
    ctx.rotate((-4 * Math.PI) / 180);

    ctx.shadowColor = 'rgba(42, 33, 27, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#B8322A';
    ctx.fillRect(-65, -65, 130, 130);

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#F5E6C8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-57, -57, 114, 114);

    ctx.fillStyle = '#F5E6C8';
    ctx.font = '800 70px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), 0, -12);

    ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillText('ĐIỂM', 0, 36);

    ctx.restore();
  } else if (slug === 'giao-thoa') {
    // - giao-thoa: the áo's name (76px) at (90, 230), "gu <gu name>" under it; the look name
    // handwritten (Patrick Hand 64px) + " ♡" on the polaroid's strip at (540, 1345), tilted; the
    // score big and red on the top sticky note at (830, 300) with "điểm phối · xịn!".
    ctx.save();
    ctx.font = '800 76px "Bricolage Grotesque", sans-serif';
    ctx.fillStyle = '#2A211B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(g.name || chapter, 90, 230);
    ctx.restore();

    const guName = vibe ? (vibeById(vibe)?.name || vibe).toLowerCase() : 'giao thoa';
    ctx.save();
    ctx.font = '700 32px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#6A5B4D';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`gu ${guName}`, 90, 280);
    ctx.restore();

    // Look name on polaroid's strip at (540, 1345), tilted
    ctx.save();
    ctx.translate(540, 1345);
    ctx.rotate((-2 * Math.PI) / 180);
    ctx.font = '64px "Patrick Hand", cursive';
    ctx.fillStyle = '#2A211B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${lookName} ♡`, 0, 0);
    ctx.restore();

    // Score on top sticky note at (830, 300) with "điểm phối · xịn!"
    ctx.save();
    ctx.translate(830, 300);
    ctx.rotate((2 * Math.PI) / 180);

    ctx.fillStyle = '#B4302B';
    ctx.font = '800 80px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), 0, -20);

    ctx.fillStyle = '#2A211B';
    ctx.font = '26px "Patrick Hand", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('điểm phối · xịn!', 0, 34);
    ctx.restore();
  } else {
    // - duong-pho: the áo's name as a pink neon sign (80px) at (540, 448) and the look name lime
    // neon (42px) at (540, 528) — neon = the text drawn 3 times with growing coloured shadowBlur
    // then a white core; the score (120px, dark teal) on the yellow round sticker at (900, 1700)
    // with "ĐIỂM PHỐI".
    drawNeon(
      ctx,
      (g.name || chapter).toUpperCase(),
      540,
      448,
      '800 80px "Bricolage Grotesque", sans-serif',
      '#FF2A85',
      [14, 28, 56]
    );

    drawNeon(
      ctx,
      lookName,
      540,
      528,
      '700 42px "Be Vietnam Pro", sans-serif',
      '#76FF03',
      [10, 22, 44]
    );

    // Score on yellow round sticker at (900, 1700) with "ĐIỂM PHỐI"
    ctx.save();
    ctx.fillStyle = '#16302E';
    ctx.font = '800 120px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), 900, 1685);

    ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
    ctx.fillText('ĐIỂM PHỐI', 900, 1762);
    ctx.restore();
  }

  // 5. The world's Nghê (${rig}/full.webp, 300px high; chuan at 110,1500; giao-thoa 640,1540; duong-pho 70,1520)
  const nghePath = `${world.rig}/full.webp`;
  try {
    const ngheImg = await loadImage(nghePath);
    const nh = 300;
    const nw = nh * (ngheImg.width / ngheImg.height);
    let nx = 110;
    let ny = 1500;
    if (slug === 'giao-thoa') {
      nx = 640;
      ny = 1540;
    } else if (slug === 'duong-pho') {
      nx = 70;
      ny = 1520;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(42, 33, 27, 0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(ngheImg, nx, ny, nw, nh);
    ctx.restore();
  } catch {
    console.warn(`[art missing] ${nghePath}`);
  }

  // "Bạn vừa học: <first sentence of the áo's summary_vi>." in a box beside it (giao-thoa: plain handwriting at 90,1450), at most 4 lines, cut with "…"
  let summaryFirst = (g.summary_vi || '').split(/(?<=[.!?])\s+/)[0]?.trim() || '';
  if (summaryFirst.endsWith('.')) {
    summaryFirst = summaryFirst.slice(0, -1);
  }
  const learnText = `Bạn vừa học: ${summaryFirst}.`;

  if (slug === 'chuan') {
    ctx.save();
    const boxX = 360;
    const boxY = 1525;
    const boxW = 460;
    const boxH = 210;

    ctx.shadowColor = 'rgba(42, 33, 27, 0.16)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFF8E6';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#7E1F1A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '24px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#2A211B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const textLines = wrapText(ctx, learnText, boxW - 36, 4);
    const lineHeight = 36;
    const startY = boxY + (boxH - textLines.length * lineHeight) / 2;
    textLines.forEach((line, idx) => {
      ctx.fillText(line, boxX + 18, startY + idx * lineHeight);
    });
    ctx.restore();
  } else if (slug === 'giao-thoa') {
    ctx.save();
    ctx.font = '36px "Patrick Hand", cursive';
    ctx.fillStyle = '#2A211B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const textLines = wrapText(ctx, learnText, 520, 4);
    const lineHeight = 46;
    textLines.forEach((line, idx) => {
      ctx.fillText(line, 90, 1450 + idx * lineHeight);
    });
    ctx.restore();
  } else {
    // duong-pho
    ctx.save();
    const boxX = 340;
    const boxY = 1535;
    const boxW = 460;
    const boxH = 200;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#16302E';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const textLines = wrapText(ctx, learnText, boxW - 36, 4);
    const lineHeight = 36;
    const startY = boxY + (boxH - textLines.length * lineHeight) / 2;
    textLines.forEach((line, idx) => {
      ctx.fillText(line, boxX + 18, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  // 6. Footer centred: "Nghê Cót · Giấy · <world name> · dd/mm/yyyy" (y 1868 chuan, else 1890; white on duong-pho)
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const dateStr = `${dd}/${mm}/${yyyy}`;
  const footerText = `Nghê Cót · Giấy · ${world.name} · ${dateStr}`;

  const footerY = slug === 'chuan' ? 1868 : 1890;
  const footerColor =
    slug === 'duong-pho'
      ? '#FFFFFF'
      : slug === 'chuan'
      ? '#6A5B4D'
      : '#2A211B';

  ctx.save();
  ctx.font = '700 28px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = footerColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(footerText, 540, footerY);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create canvas blob'));
    }, 'image/png');
  });
}
