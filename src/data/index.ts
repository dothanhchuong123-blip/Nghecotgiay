import kbJson from './kb.json';
import miscJson from './misc.json';
import presetsJson from './presets.json';
import scenesJson from './scenes.json';
import compareJson from './compare.json';
import copyGiayJson from './copy-giay.json';
import stageJson from './stage.json';
import dollDataJson from './doll-data.json';
import hangTrongJson from './hang-trong.json';

// --- Interfaces based on real JSON structures ---

export interface GarmentStructure {
  collar: string;
  closure: string;
  sleeves: string;
  hem: string;
  worn_with: string[];
}

export interface GarmentPart {
  key: string;
  x: number;
  y: number;
}

export interface GarmentTimelineItem {
  year: string;
  title_vi: string;
  text_vi: string;
  source_ids: string[];
}

export interface GarmentOccasionRule {
  status: string;
  note_vi: string;
}

export interface GarmentConfuseItem {
  name: string;
  how_vi: string;
}

export interface Garment {
  id: string;
  name: string;
  aliases: string[];
  period: string;
  region: string;
  gender: string;
  formality: number;
  must_show: string[];
  levels: number[];
  structure: GarmentStructure;
  parts: GarmentPart[];
  timeline: GarmentTimelineItem[];
  summary_vi: string;
  history_vi: string;
  colors_classic: string[];
  occasion_rules: Record<string, GarmentOccasionRule>;
  dont_confuse_with: GarmentConfuseItem[];
  sources: string[];
  remix?: {
    ok?: string[];
    caution?: string[];
    conflict?: string[];
  };
  verified?: boolean;
  contested_vi?: string[];
}

export interface Color {
  id: string;
  name: string;
  hex: string;
  element: string;
  meaning_vi: string;
  light?: boolean;
  occasion_notes?: Record<string, { status?: string; note_vi?: string }>;
}

export interface ModernPiece {
  id: string;
  name: string;
  category: string;
  formality: number;
  layer: string;
  hex: string;
  hex2?: string;
  covers: string[];
  length?: string;
  bulk: number;
  note_vi: string;
}

export interface Accessory {
  id: string;
  name: string;
  category: string;
  formality?: number;
  classic_with?: string[];
  note_vi: string;
  hex?: string;
}

export interface Vibe {
  id: string;
  name: string;
  desc: string;
  affinity: string[];
  tone?: number;
  prefers_monochrome?: boolean;
}

export interface Occasion {
  id: string;
  name: string;
  short: string;
  formality: number;
  sacred: boolean;
  hint_vi: string;
}

export interface Source {
  id: string;
  title: string;
  kind: string;
  note_vi: string;
  url?: string;
}

export interface DollPiece {
  id: string;
  side: 'nu' | 'nam';
  layer: string;
  src: string;
  box: [number, number, number, number];
  fit: number;
  dye?: string;
  hidesShorts?: boolean;
}

export interface TradPiece {
  id: string;
  name: string;
  note_vi: string;
}

export interface Preset {
  id: string;
  side: 'nu' | 'nam';
  garment_id: string;
  level: number;
  pieceIds: string[] | null;
  companions: string[];
  base_color_id: string;
  score?: number | null;
}

export interface Manifest {
  canvas: { w: number; h: number };
  bodies: Record<string, string>;
  bodiesLegs?: Record<string, string>;
  pieces: DollPiece[];
}

export interface HangTrongPaper {
  label: string;
  src: string;
  mode: 'tile' | 'cover';
  tile: number | null;
  base: string;
  light: boolean;
  made: string;
}

export interface HangTrongGam {
  id: string;
  label: string;
  src: string;
}

export interface WeaveStrip {
  id: string;
  src: string;
  rgb: [number, number, number];
}

export interface WeaveGeo {
  size: number;
  slits: [number, number][];
  top: number;
  bottom: number;
  rows: number;
}

export interface WeaveData {
  card: string;
  target: string;
  strips: WeaveStrip[];
  geo: WeaveGeo;
}

export interface HangTrongCopy {
  paperTag: string;
  paperFrom: string;
  paperAuto: string;
  paperPick: string;
  material: string;
  plain: string;
  gamSay: string;
  weaveBtn: string;
  weaveTitle: string;
  weaveNote: string;
  weaveOne: string;
  weaveTwo: string;
  weaveClear: string;
  weaveWear: string;
  weaveClose: string;
  weaveSay: string;
  strips: Record<string, string>;
  [key: string]: string | Record<string, string>;
}

export interface HangTrongData {
  note?: string;
  papers: Record<string, HangTrongPaper>;
  byChapter: Record<string, string>;
  byVibe: Record<string, string>;
  gam: HangTrongGam[];
  weave: WeaveData;
  copy: HangTrongCopy;
}

// --- Data Exports ---

export const GARMENTS: Garment[] = kbJson.GARMENTS as unknown as Garment[];
export const COLORS: Color[] = kbJson.COLORS as unknown as Color[];
export const MODERN_PIECES: ModernPiece[] = kbJson.MODERN_PIECES as unknown as ModernPiece[];
export const ACCESSORIES: Accessory[] = kbJson.ACCESSORIES as unknown as Accessory[];
export const VIBES: Vibe[] = kbJson.VIBES as unknown as Vibe[];
export const OCCASIONS: Occasion[] = kbJson.OCCASIONS as unknown as Occasion[];
export const SOURCES: Source[] = kbJson.SOURCES as unknown as Source[];
export const PART_LABELS_VI: Record<string, string> = kbJson.PART_LABELS_VI;

export const PRESETS: Preset[] = presetsJson as unknown as Preset[];
export const LEVELS = miscJson.LEVELS;
export const SCENES = scenesJson.scenes;
export const COMPARE = compareJson.pairs;
export const COPY = copyGiayJson;
export const STAGE = stageJson;
export const TRAD_PIECES: TradPiece[] = dollDataJson.TRAD_PIECES as unknown as TradPiece[];
export const COMPANIONS = dollDataJson.COMPANIONS;
export const NAM_OF: Record<string, string> = dollDataJson.NAM_OF;
export const HANG_TRONG: HangTrongData = hangTrongJson as unknown as HangTrongData;
export const HT_COPY = HANG_TRONG.copy;

// --- Lookup maps and helper functions ---

const garmentsMap = new Map<string, Garment>(GARMENTS.map((g) => [g.id, g]));
const colorsMap = new Map<string, Color>(COLORS.map((c) => [c.id, c]));
const modernMap = new Map<string, ModernPiece>(MODERN_PIECES.map((m) => [m.id, m]));
const accessoriesMap = new Map<string, Accessory>(ACCESSORIES.map((a) => [a.id, a]));
const tradMap = new Map<string, TradPiece>(TRAD_PIECES.map((t) => [t.id, t]));
const sourcesMap = new Map<string, Source>(SOURCES.map((s) => [s.id, s]));
const vibesMap = new Map<string, Vibe>(VIBES.map((v) => [v.id, v]));

export function garmentById(id: string): Garment | undefined {
  return garmentsMap.get(id);
}

export function colorById(id: string): Color | undefined {
  return colorsMap.get(id);
}

export function modernById(id: string): ModernPiece | undefined {
  return modernMap.get(id);
}

export function accessoryById(id: string): Accessory | undefined {
  return accessoriesMap.get(id);
}

export function tradById(id: string): TradPiece | undefined {
  return tradMap.get(id);
}

export function sourceById(id: string): Source | undefined {
  return sourcesMap.get(id);
}

export function vibeById(id: string): Vibe | undefined {
  return vibesMap.get(id);
}

export function pieceName(id: string): string | undefined {
  return (
    modernMap.get(id)?.name ??
    accessoriesMap.get(id)?.name ??
    tradMap.get(id)?.name
  );
}

let manifestCache: Manifest | null = null;
let manifestPromise: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  if (manifestCache) {
    return Promise.resolve(manifestCache);
  }
  if (!manifestPromise) {
    manifestPromise = fetch('/doll/manifest.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load manifest: ${res.statusText}`);
        }
        return res.json() as Promise<Manifest>;
      })
      .then((data) => {
        manifestCache = data;
        return data;
      })
      .catch((err) => {
        manifestPromise = null;
        throw err;
      });
  }
  return manifestPromise;
}

export const READY: string[] = COPY.chapters.ready;

export function gidOf(chapter: string, side: 'nu' | 'nam' | string): string {
  if (side === 'nam') {
    return NAM_OF[chapter] ?? chapter;
  }
  return chapter;
}

export function fullSrc(chapter: string, side: 'nu' | 'nam' | string): string {
  const scene = (SCENES as Record<string, { full?: string[] } | undefined>)[chapter];
  if (scene?.full && scene.full.includes(side)) {
    return `/popcard/${chapter}/full-${side}.webp`;
  }
  const gid = gidOf(chapter, side);
  return `/popcard/${gid}/full-${side}.webp`;
}

export function hasPair(chapter: string): boolean {
  const pair = (COMPARE as Record<string, { nu: unknown; nam: unknown } | undefined>)[chapter];
  if (!pair) return false;
  return pair.nu !== null || pair.nam !== null;
}

export function partAt(
  garment: Garment,
  key: string
): { x: number; y: number } {
  const kbPart = garment.parts.find((p) => p.key === key);
  const pin = (STAGE.partPins as Record<string, { x?: number; y?: number } | undefined>)?.[key];

  const x = pin?.x ?? kbPart?.x ?? 0.5;
  const y = pin?.y ?? kbPart?.y ?? 0.5;

  return { x, y };
}
