import {
  Garment,
  COPY,
  colorById,
  modernById,
  accessoryById,
  vibeById,
  pieceName,
} from '../data';
import { PieceColors } from './pieceColors';
import {
  lchOf,
  isLoud,
  isNeutral,
  isDongHo,
  pairHarmony,
  pairLine,
  hueGap,
  PIECE_SWATCHES,
} from './colour';

// How Nghê scores an outfit. The same outfit is scored in all three worlds,
// each world weighs the three stars differently (docs/MIX-RULES.md + MIX-SCORE.md).

export type WorldLevel = 1 | 2 | 3;
export type ScoreBand = 'high' | 'mid' | 'low';

export interface ScoreParams {
  garment: Garment;
  worn: string[];
  colorId: string;
  vibe: string | null;
}

export interface Stars {
  /** Giữ hồn áo: shape rules, the garment stays itself */
  hon: number;
  /** Hợp màu: colour harmony */
  mau: number;
  /** Dám mix: right amount of modern for this world */
  mix: number;
}

export interface WorldScore {
  level: WorldLevel;
  score: number;
  band: ScoreBand;
  stars: Stars;
  /** shape-rule problems (shown as a list under Nghê's line) */
  issues: string[];
  /** colour / mix hints, one kind line each */
  tips: string[];
}

export const STAR_NAMES: Record<keyof Stars, string> = {
  hon: 'Giữ hồn áo',
  mau: 'Hợp màu',
  mix: 'Dám mix',
};

const WEIGHTS: Record<WorldLevel, Stars> = {
  1: { hon: 0.65, mau: 0.25, mix: 0.1 },
  2: { hon: 0.35, mau: 0.3, mix: 0.35 },
  3: { hon: 0.15, mau: 0.35, mix: 0.5 },
};

// shape penalties are softer in the street world and stricter in the formal one
const SHAPE_FACTOR: Record<WorldLevel, number> = { 1: 1.15, 2: 1, 3: 0.6 };
const LOUD_FACTOR: Record<WorldLevel, number> = { 1: 1.2, 2: 1, 3: 0.45 };

type Slot = 'over' | 'under' | 'bottom' | 'feet' | 'head' | 'carry' | 'jewel' | 'waist';

const AREA: Record<Slot, number> = {
  over: 0.22,
  under: 0.08,
  bottom: 0.15,
  feet: 0.03,
  head: 0.03,
  carry: 0.03,
  jewel: 0.01,
  waist: 0.02,
};
const AO_AREA = 0.5;

const BIG: Slot[] = ['over', 'under', 'bottom'];

function slotOf(id: string): Slot {
  const m = modernById(id);
  if (m) {
    if (m.layer === 'swap') return 'bottom';
    return (m.layer as Slot) in AREA ? (m.layer as Slot) : 'waist';
  }
  const acc = accessoryById(id);
  if (acc) {
    if (acc.category === 'Đầu') return 'head';
    if (acc.category === 'Chân') return 'feet';
    if (acc.category === 'Túi' || acc.category === 'Cầm tay') return 'carry';
    return 'jewel';
  }
  return 'waist';
}

export function pieceHex(id: string, pc: PieceColors): string | null {
  if (pc[id]) return pc[id];
  return modernById(id)?.hex ?? accessoryById(id)?.hex ?? null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function bandOf(score: number): ScoreBand {
  return score >= 85 ? 'high' : score >= 60 ? 'mid' : 'low';
}

interface Part {
  id: string;
  slot: Slot;
  hex: string;
  area: number;
}

function partsOf(p: ScoreParams, pc: PieceColors): Part[] {
  const parts: Part[] = [];
  for (const id of p.worn) {
    const hex = pieceHex(id, pc);
    if (!hex) continue;
    const slot = slotOf(id);
    parts.push({ id, slot, hex, area: AREA[slot] });
  }
  return parts;
}

// ---------------------------------------------------------------- shape

function shapeStar(
  p: ScoreParams,
  level: WorldLevel
): { star: number; issues: string[] } {
  const { garment, worn } = p;
  const issues: string[] = [];
  let penalty = 0;
  const add = (msg: string, pts: number) => {
    if (!issues.includes(msg)) {
      issues.push(msg);
      penalty += pts;
    }
  };

  const mustShow = garment.must_show || [];
  const zonesMap = (COPY.mix.zones as Record<string, string>) || {};

  // R1. Signature visible
  for (const id of worn) {
    const m = modernById(id);
    if (!m?.covers) continue;
    for (const z of m.covers) {
      if (!mustShow.includes(z)) continue;
      const zoneName = zonesMap[z] || z;
      const label = m.name || pieceName(id) || id;
      const msg = COPY.mix.issues.R1.replace('{piece}', label).replace('{zone}', zoneName);
      add(msg, z === 'collar' || z === 'closure' ? 22 : 13);
    }
  }

  // R2. The garment is the biggest thing
  const modern = worn.filter((id) => Boolean(modernById(id)));
  const bigModern = modern.filter((id) => BIG.includes(slotOf(id)));
  const limit = level === 1 ? 1 : level === 2 ? 2 : 3;
  const levelOneHero = level === 1 && bigModern.length >= 1;
  if (modern.length > limit || levelOneHero) {
    add(
      COPY.mix.issues.R2.replace('{level}', String(level)),
      15 + Math.max(0, modern.length - limit) * 7
    );
  }

  // R3. Long with short: a mid-length layer ends mid-tà
  const longGarment = mustShow.includes('ta') || /dài|gối|gót|mắt cá/i.test(garment.structure?.hem || '');
  if (longGarment) {
    const midLayer = worn.find((id) => {
      const m = modernById(id);
      return m?.layer === 'over' && m.length === 'mid' && id !== 'ao-mang-to';
    });
    if (midLayer) add(COPY.mix.issues.R3, 11);
  }

  // R4. wide sleeves never take an over-layer
  const sleeves = (garment.structure?.sleeves || '').toLowerCase();
  const isTayThung =
    garment.id === 'ao-tac' ||
    garment.id === 'ao-giao-linh' ||
    garment.id === 'ao-nhat-binh' ||
    sleeves.includes('thụng') ||
    sleeves.includes('rộng');
  if (isTayThung && worn.some((id) => modernById(id)?.layer === 'over')) {
    add(COPY.mix.issues.R4, 17);
  }

  // R5. skirts only with tứ thân / bà ba
  const skirtOk = garment.id === 'ao-tu-than' || garment.id === 'ao-ba-ba';
  if (!skirtOk) {
    const hasSkirt = worn.some((id) => {
      const m = modernById(id);
      return id === 'chan-vay-xep-ly' || id === 'vay-den' || /váy/i.test(m?.name || '') || /váy/i.test(m?.category || '');
    });
    if (hasSkirt) add(COPY.mix.issues.R5skirt, 15);
  }

  // R5. ceremonial robes never swap the bottom
  const ceremonial = ['ao-nhat-binh', 'ao-tac', 'ao-vien-linh', 'ao-giao-linh', 'ao-the'];
  if (ceremonial.includes(garment.id)) {
    const swapped = worn.some((id) => {
      const m = modernById(id);
      return m?.layer === 'swap' || m?.layer === 'bottom';
    });
    if (swapped) add(COPY.mix.issues.R5robe, 15);
  }

  // R6. ceremony robes stay near the ceremony
  if (garment.levels && garment.levels.length && !garment.levels.includes(level)) {
    add(COPY.mix.issues.R6.replace('{level}', String(level)), 24);
  }

  // Formality gap: a very formal robe next to very casual big pieces
  if (bigModern.length > 0) {
    const avg =
      bigModern.reduce((s, id) => s + (modernById(id)?.formality ?? 40), 0) / bigModern.length;
    const gap = (garment.formality ?? 50) - avg;
    if (gap > 45) {
      penalty += Math.min(14, (gap - 45) * 0.35) * (level === 3 ? 0.5 : 1);
    }
  }

  const star = clamp(100 - penalty * SHAPE_FACTOR[level], 20, 100);
  return { star, issues };
}

// ---------------------------------------------------------------- colour

export function colourStar(
  p: ScoreParams,
  level: WorldLevel,
  pc: PieceColors
): { star: number; tips: string[] } {
  const tips: string[] = [];
  const ao = colorById(p.colorId)?.hex || '#B4302B';
  const aoLch = lchOf(ao);
  const parts = partsOf(p, pc);
  const big = parts.filter((x) => BIG.includes(x.slot));

  let star: number;
  if (big.length === 0) {
    // áo alone: safe, nothing to mix yet
    star = 80;
    const small = parts.find((x) => x.slot !== 'waist');
    if (small) {
      const h = pairHarmony(ao, small.hex);
      star += (h - 0.75) * 24;
    }
  } else {
    const totalArea = big.reduce((s, x) => s + x.area, 0);
    let h = big.reduce((s, x) => s + pairHarmony(ao, x.hex) * x.area, 0) / totalArea;
    if (big.length >= 2) {
      let pairSum = 0;
      let pairN = 0;
      for (let i = 0; i < big.length; i++) {
        for (let j = i + 1; j < big.length; j++) {
          pairSum += pairHarmony(big[i].hex, big[j].hex);
          pairN++;
        }
      }
      h = h * 0.65 + (pairSum / pairN) * 0.35;
    }
    star = 40 + 60 * h;

    // one good-looking pair gets a name
    const lead = [...big].sort((a, b) => b.area - a.area)[0];
    if (h >= 0.8) {
      const line = pairLine(ao, lead.hex);
      if (line) tips.push(line);
    } else if (h < 0.62) {
      tips.push(
        `${pieceName(lead.id) || 'Món này'} hơi cãi màu với áo. Thử đổi sang màu trung tính hoặc màu cùng tông nhé.`
      );
    }
  }

  // C4. one loud thing
  const loud = [
    isLoud(aoLch) ? 1 : 0,
    ...parts.filter((x) => x.area >= 0.12 && isLoud(lchOf(x.hex))).map(() => 1),
  ].reduce<number>((s, v) => s + v, 0);
  if (loud > 1) {
    star -= 15 * (loud - 1) * LOUD_FACTOR[level];
    tips.push('Hai mảng màu rực cùng lúc đang giành sân khấu. Cho một món dịu lại sẽ đẹp hơn.');
  }

  // C2. mớ ba: dark outside, bright inside
  if (aoLch.L < 0.4) {
    const accent = parts.find((x) => {
      if (!['under', 'head', 'waist', 'jewel', 'carry'].includes(x.slot)) return false;
      const l = lchOf(x.hex);
      return l.C >= 0.09 && l.L > 0.6;
    });
    if (accent) {
      star += 10;
      tips.push('Áo trầm, lớp trong sáng — đúng lối mớ ba mớ bảy xưa.');
    }
  }

  // C3. Đông Hồ five
  if (big.length > 0 && isDongHo(ao) && big.every((x) => isDongHo(x.hex))) {
    star += 6;
    tips.push('Cả bộ nằm trong năm sắc Đông Hồ, an toàn mà có hồn.');
  }

  // a big piece that melts into the áo
  const over = big.find((x) => x.slot === 'over');
  if (over) {
    const l = lchOf(over.hex);
    if (Math.abs(l.L - aoLch.L) < 0.08 && (isNeutral(l) || isNeutral(aoLch) || hueGap(l.h, aoLch.h) < 18)) {
      star -= 8;
      tips.push('Áo khoác gần cùng màu áo nên mất khối. Đổi sáng hơn hoặc tối hơn một chút nhé.');
    }
  }

  return { star: clamp(star, 25, 100), tips };
}

// ---------------------------------------------------------------- mix

function mixStar(
  p: ScoreParams,
  level: WorldLevel
): { star: number; tips: string[] } {
  const tips: string[] = [];
  const { worn, garment } = p;
  const bigN = worn.filter((id) => modernById(id) && BIG.includes(slotOf(id))).length;
  const smallN = worn.filter((id) => !(modernById(id) && BIG.includes(slotOf(id)))).length;

  let star: number;
  if (level === 1) {
    star = bigN === 0 ? 100 : bigN === 1 ? 55 : 30;
    if (bigN === 0 && smallN >= 3) star = 62;
    else if (bigN === 0 && smallN === 2) star = 82;
    else if (bigN === 0 && smallN === 1) star = 95;
    if (bigN > 0) tips.push('Chuẩn cổ phục thì áo nên đứng một mình, món hiện đại để dành cho Giao thoa nhé.');
  } else if (level === 2) {
    if (bigN === 0) {
      star = smallN >= 1 ? 62 : 38;
      tips.push('Giao thoa cần một món hiện đại. Thử khoác thêm áo ngắn hoặc đổi quần xem sao.');
    } else if (bigN === 1) star = smallN >= 1 ? 96 : 88;
    else if (bigN === 2) star = 86;
    else star = 62;
  } else {
    if (bigN === 0) {
      star = smallN >= 2 ? 52 : smallN === 1 ? 38 : 18;
      tips.push('Đường phố thì phải “phố” hơn, thêm vài món hiện đại nữa là lên đồ.');
    } else if (bigN === 1) star = clamp(58 + smallN * 8, 0, 76);
    else if (bigN === 2) star = clamp(80 + smallN * 5, 0, 92);
    else star = 95;
  }

  if (level !== 1) {
    const vibe = p.vibe ? vibeById(p.vibe) : null;
    if (vibe?.affinity?.length) {
      const hits = worn.filter((id) => vibe.affinity.includes(id)).length;
      if (hits > 0) {
        star += Math.min(10, hits * 5);
        tips.push(`Đúng gu ${vibe.name.toLowerCase()} rồi đó.`);
      }
    }
    // a short layer on a long áo keeps the tà showing
    const longGarment = (garment.must_show || []).includes('ta');
    if (longGarment && worn.some((id) => modernById(id)?.layer === 'over' && modernById(id)?.length === 'short')) {
      star += 4;
    }
  }

  return { star: clamp(star, 15, 100), tips };
}

// ---------------------------------------------------------------- public

export function scoreForWorld(
  p: ScoreParams,
  level: WorldLevel,
  pc: PieceColors
): WorldScore {
  const shape = shapeStar(p, level);
  const col = colourStar(p, level, pc);
  const mix = mixStar(p, level);
  const w = WEIGHTS[level];

  const raw = shape.star * w.hon + col.star * w.mau + mix.star * w.mix;
  const score = raw >= 99.5 ? 100 : clamp(Math.round(raw), 30, 99);

  return {
    level,
    score,
    band: bandOf(score),
    stars: {
      hon: Math.round(shape.star),
      mau: Math.round(col.star),
      mix: Math.round(mix.star),
    },
    issues: shape.issues,
    tips: [...col.tips, ...mix.tips].slice(0, 3),
  };
}

export function scoreAllWorlds(
  p: ScoreParams,
  pc: PieceColors
): Record<WorldLevel, WorldScore> {
  return {
    1: scoreForWorld(p, 1, pc),
    2: scoreForWorld(p, 2, pc),
    3: scoreForWorld(p, 3, pc),
  };
}

// ---------------------------------------------------------------- cross-world hint

export interface WorldHint {
  from: WorldLevel;
  to: WorldLevel;
  fromScore: number;
  toScore: number;
}

export const HINT_BELOW = 70;
export const HINT_GAP = 15;

/** The cross-world bubble: low here, clearly better in another allowed world. */
export function worldHint(
  all: Record<WorldLevel, WorldScore>,
  current: WorldLevel,
  allowed: number[]
): WorldHint | null {
  const here = all[current];
  if (!here || here.score >= HINT_BELOW) return null;
  let best: WorldScore | null = null;
  for (const lv of [1, 2, 3] as WorldLevel[]) {
    if (lv === current) continue;
    if (allowed.length && !allowed.includes(lv)) continue;
    const s = all[lv];
    if (s.score >= here.score + HINT_GAP && (!best || s.score > best.score)) best = s;
  }
  if (!best) return null;
  return { from: current, to: best.level, fromScore: here.score, toScore: best.score };
}

// ---------------------------------------------------------------- recolour helper

/** Best swatch for one piece, given the rest of the outfit (used by "Nghê gợi ý màu"). */
export function bestSwatchFor(
  p: ScoreParams,
  level: WorldLevel,
  pc: PieceColors,
  pieceId: string
): string {
  let best = PIECE_SWATCHES[0].hex;
  let bestScore = -1;
  for (const sw of PIECE_SWATCHES) {
    const trial = { ...pc, [pieceId]: sw.hex };
    const s = colourStar(p, level, trial).star;
    if (s > bestScore) {
      bestScore = s;
      best = sw.hex;
    }
  }
  return best;
}

/** Swatches sorted best-first for one piece (the first one gets the sparkle). */
export function rankSwatches(
  p: ScoreParams,
  level: WorldLevel,
  pc: PieceColors,
  pieceId: string
): string[] {
  return PIECE_SWATCHES.map((sw) => ({
    hex: sw.hex,
    s: colourStar(p, level, { ...pc, [pieceId]: sw.hex }).star,
  }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.hex);
}
