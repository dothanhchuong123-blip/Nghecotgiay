import { PRESETS, Preset } from '../data';
import { lookById } from '../preview/closest';

// The 35 fixed outfits as trading cards. Level 1/2/3 of an outfit is its world.

export type World = 1 | 2 | 3;

export interface CardInfo {
  id: string;
  side: 'nu' | 'nam';
  chapter: string;
  world: World;
  title: string;
  sub: string;
  poster: string;
  photo: string;
  preset: Preset;
}

export const WORLD_NAME: Record<World, string> = {
  1: 'Chuẩn cổ phục',
  2: 'Giao thoa',
  3: 'Đường phố',
};

export const CARDS: CardInfo[] = PRESETS.flatMap((preset) => {
  const look = lookById(preset.id);
  if (!look || !look.files.C) return [];
  return [
    {
      id: preset.id,
      side: preset.side as 'nu' | 'nam',
      chapter: look.chapter,
      world: (preset.level as World) || 1,
      title: look.title ?? '',
      sub: look.sub ?? '',
      poster: look.files.C,
      photo: look.files.A,
      preset,
    },
  ];
});

export function cardsOf(world: World | 0): CardInfo[] {
  return world ? CARDS.filter((c) => c.world === world) : CARDS;
}

let lastDrawn: string | null = null;
export function drawCard(world: World | 0): CardInfo {
  const pool = cardsOf(world);
  const fresh = pool.filter((c) => c.id !== lastDrawn);
  const list = fresh.length ? fresh : pool;
  const card = list[Math.floor(Math.random() * list.length)];
  lastDrawn = card.id;
  return card;
}

// ---- cards seen on this device ----

const SEEN_KEY = 'nghe-giay-cards-seen';
let seen: Set<string> | null = null;

export function seenCards(): Set<string> {
  if (seen) return seen;
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    seen = new Set(Array.isArray(list) ? list : []);
  } catch {
    seen = new Set();
  }
  return seen;
}

export function markSeen(id: string) {
  const s = seenCards();
  if (s.has(id)) return;
  s.add(id);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch {
    // private window: kept for this visit only
  }
}

// ---- open the card box from anywhere (desk box, Rút thẻ button) ----

type BoxListener = (open: boolean) => void;
const boxListeners = new Set<BoxListener>();

export function openCardBox() {
  boxListeners.forEach((fn) => fn(true));
}

export function subscribeCardBox(fn: BoxListener): () => void {
  boxListeners.add(fn);
  return () => {
    boxListeners.delete(fn);
  };
}

// ---- "Mặc lên búp bê": the mix page picks this up once it shows the card's áo and side ----

let pending: CardInfo | null = null;
const wearListeners = new Set<() => void>();

export function requestWear(card: CardInfo) {
  pending = card;
  wearListeners.forEach((fn) => fn());
}

/** Takes the waiting card if it belongs on this page (same chapter and side). */
export function takeWear(chapter: string, side: string): CardInfo | null {
  if (!pending || pending.chapter !== chapter || pending.side !== side) return null;
  const card = pending;
  pending = null;
  return card;
}

export function subscribeWear(fn: () => void): () => void {
  wearListeners.add(fn);
  return () => {
    wearListeners.delete(fn);
  };
}
