import looksJson from '../data/looks.json';
import { colorById, garmentById, modernById, accessoryById, vibeById } from '../data';
import { lchOf } from '../mix/colour';
import { scoreAllWorlds, WorldLevel } from '../mix/score';

export interface LookEntry {
  id: string;
  kind: 'preset' | 'gu';
  side: 'nu' | 'nam';
  chapter: string;
  gid: string;
  level: number | null;
  vibe: string | null;
  worn: string[];
  colorId: string;
  title: string | null;
  sub: string | null;
  files: {
    A: string;
    B?: string;
    C?: string;
  };
  thumb: string;
}

export interface LookQuery {
  side: 'nu' | 'nam';
  gid: string;
  colorId: string;
  vibe: string | null;
  worn: string[];
  /** the world the visitor is in (1 Chuẩn, 2 Giao thoa, 3 Đường phố) */
  level?: number | null;
}

export interface LookMatch {
  look: LookEntry;
  exact: boolean;
  /** 0..100, how alike the photo is to the visitor's outfit */
  score: number;
  /** short Vietnamese reasons shown under the card */
  reasons: string[];
}

const looks: LookEntry[] = looksJson as unknown as LookEntry[];

// How much each part of the outfit counts (sums to 100).
const W = { colour: 30, big: 35, small: 12, world: 13, vibe: 10 };

type Slot = 'over' | 'under' | 'bottom' | 'feet' | 'head' | 'carry' | 'jewel' | 'waist';
const BIG: Slot[] = ['over', 'under', 'bottom'];
const SMALL: Slot[] = ['feet', 'head', 'carry', 'jewel', 'waist'];
// share of the body each slot covers: what the eye sees first counts most
const AREA: Record<Slot, number> = {
  over: 0.22,
  under: 0.08,
  bottom: 0.15,
  feet: 0.04,
  head: 0.04,
  carry: 0.03,
  jewel: 0.01,
  waist: 0.02,
};

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

/** 1 = the same colour to the eye, 0 = clearly different (OKLab distance) */
function colourCloseness(a: string, b: string): number {
  if (a === b) return 1;
  const ha = colorById(a)?.hex;
  const hb = colorById(b)?.hex;
  if (!ha || !hb) return 0;
  const A = lchOf(ha);
  const B = lchOf(hb);
  const ra = (A.h * Math.PI) / 180;
  const rb = (B.h * Math.PI) / 180;
  const d = Math.hypot(A.L - B.L, A.C * Math.cos(ra) - B.C * Math.cos(rb), A.C * Math.sin(ra) - B.C * Math.sin(rb));
  return Math.max(0, 1 - d / 0.22);
}

/**
 * How alike two sets of pieces are inside a group of slots, weighted by slot area.
 * Same piece = 1, something else in the same slot = 0.4, only one side has it = 0.
 * Missing and extra pieces both pull the score down. Both bare = alike.
 */
function piecesAlike(q: string[], l: string[], slots: Slot[]): number {
  let sum = 0;
  let weight = 0;
  for (const s of slots) {
    const qs = q.filter((id) => slotOf(id) === s);
    const ls = l.filter((id) => slotOf(id) === s);
    if (qs.length === 0 && ls.length === 0) continue;
    const shared = qs.filter((id) => ls.includes(id)).length;
    const union = new Set([...qs, ...ls]).size;
    const sim = shared > 0 ? shared / union : qs.length && ls.length ? 0.4 : 0;
    sum += sim * AREA[s];
    weight += AREA[s];
  }
  return weight === 0 ? 1 : sum / weight;
}

// presets carry their world; a gu look gets the world it scores best in (worked out once)
const worldCache = new Map<string, number>();
function worldOfLook(look: LookEntry): number {
  if (look.level) return look.level;
  const hit = worldCache.get(look.id);
  if (hit) return hit;
  let best = 2;
  const garment = garmentById(look.gid);
  if (garment) {
    const all = scoreAllWorlds({ garment, worn: look.worn, colorId: look.colorId, vibe: look.vibe }, {});
    best = ([1, 2, 3] as WorldLevel[]).reduce((a, b) => (all[b].score > all[a].score ? b : a), 2 as WorldLevel);
  }
  worldCache.set(look.id, best);
  return best;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((id) => sb.has(id));
}

export function lookById(id: string): LookEntry | null {
  return looks.find((entry) => entry.id === id) ?? null;
}

function scoreLook(q: LookQuery, look: LookEntry): LookMatch {
  const colour = colourCloseness(q.colorId, look.colorId);
  const big = piecesAlike(q.worn, look.worn, BIG);
  const small = piecesAlike(q.worn, look.worn, SMALL);

  let world = 0.5;
  if (q.level) {
    const gap = Math.abs(worldOfLook(look) - q.level);
    world = gap === 0 ? 1 : gap === 1 ? 0.4 : 0;
  }

  let vibe = 0.5;
  if (q.vibe && look.vibe) {
    if (q.vibe === look.vibe) vibe = 1;
    else vibe = vibeById(q.vibe)?.tone === vibeById(look.vibe)?.tone ? 0.5 : 0.1;
  } else if (q.vibe && !look.vibe) {
    vibe = 0.3;
  }

  const exact = look.kind === 'preset' && look.colorId === q.colorId && sameIds(look.worn, q.worn);
  const raw = W.colour * colour + W.big * big + W.small * small + W.world * world + W.vibe * vibe;
  const score = exact ? 100 : Math.min(99, Math.round(raw));

  const reasons: string[] = ['cùng áo'];
  if (look.colorId === q.colorId) reasons.push('cùng màu');
  else if (colour >= 0.55) reasons.push('màu gần giống');
  const shared = q.worn.filter((id) => look.worn.includes(id)).length;
  if (q.worn.length > 0) reasons.push(`${shared}/${q.worn.length} món giống`);
  if (q.level && worldOfLook(look) === q.level) reasons.push('cùng thế giới');
  if (q.vibe && look.vibe === q.vibe) reasons.push('cùng gu');

  return { look, exact, score, reasons };
}

/** The n photos nearest to the visitor's outfit, best first (same side and áo only). */
export function closestLooks(q: LookQuery, n = 3): LookMatch[] {
  const candidates = looks.filter((entry) => entry.side === q.side && entry.gid === q.gid);
  return candidates
    .map((look) => scoreLook(q, look))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.look.kind !== b.look.kind) return a.look.kind === 'preset' ? -1 : 1;
      return a.look.id < b.look.id ? -1 : a.look.id > b.look.id ? 1 : 0;
    })
    .slice(0, n);
}

export function closestLook(q: LookQuery): { look: LookEntry; exact: boolean } | null {
  const best = closestLooks(q, 1)[0];
  return best ? { look: best.look, exact: best.exact } : null;
}

/** A preset's own photo, as a match (used when a card or Bốc thăm picks a fixed outfit). */
export function exactMatch(id: string): LookMatch | null {
  const look = lookById(id);
  if (!look) return null;
  return { look, exact: true, score: 100, reasons: [] };
}
