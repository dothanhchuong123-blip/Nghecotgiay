import { hexToRgb, rgbToOklab } from '../doll/dye';

// Colour maths in OKLCH (MIX-RULES: HSL misjudges yellow vs blue lightness).

export interface Lch {
  L: number;
  C: number;
  /** hue in degrees, 0..360 */
  h: number;
}

const lchCache = new Map<string, Lch>();

export function lchOf(hex: string): Lch {
  const key = hex.trim().toLowerCase();
  const hit = lchCache.get(key);
  if (hit) return hit;
  const [r, g, b] = hexToRgb(key);
  const [L, a, bb] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  const out = { L, C, h };
  lchCache.set(key, out);
  return out;
}

export function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export const NEUTRAL_C = 0.05;
export const LOUD_C = 0.13;

export function isNeutral(l: Lch): boolean {
  return l.C < NEUTRAL_C;
}

/** Quiet = neutral or clearly muted / very dark / very light. */
export function isQuiet(l: Lch): boolean {
  return l.C < 0.09 || l.L < 0.28 || l.L > 0.93;
}

export function isLoud(l: Lch): boolean {
  return l.C >= LOUD_C && l.L > 0.3 && l.L < 0.92;
}

export type Family =
  | 'do'
  | 'cam'
  | 'vang'
  | 'luc'
  | 'xanh'
  | 'tim'
  | 'hong'
  | 'trungtinh';

export function familyOf(hex: string): Family {
  const l = lchOf(hex);
  if (l.C < NEUTRAL_C || (l.C < 0.07 && (l.L > 0.8 || l.L < 0.35))) {
    return 'trungtinh';
  }
  const h = l.h;
  // OKLCH hue wheel: red≈25, orange≈55, yellow≈90, green≈140, teal≈190, blue≈250, purple≈300, pink≈350
  if (h >= 340 || h < 15) return l.L > 0.7 ? 'hong' : 'do';
  if (h < 40) return l.L > 0.75 ? 'hong' : 'do';
  if (h < 70) return 'cam';
  if (h < 115) return 'vang';
  if (h < 200) return 'luc';
  if (h < 285) return 'xanh';
  if (h < 335) return 'tim';
  return 'hong';
}

/** The five Đông Hồ colours (nearest KB colours, MIX-RULES C3). */
export const DONG_HO: string[] = ['#B4302B', '#E2B93B', '#2F6D6A', '#F3EDE0', '#1B1A17'];

export function isDongHo(hex: string): boolean {
  const a = lchOf(hex);
  return DONG_HO.some((d) => {
    const b = lchOf(d);
    const dh = isNeutral(a) || isNeutral(b) ? 0 : hueGap(a.h, b.h) / 60;
    const dl = Math.abs(a.L - b.L) * 2.2;
    const dc = Math.abs(a.C - b.C) * 4;
    return Math.sqrt(dh * dh + dl * dl + dc * dc) < 0.55;
  });
}

/** How well two colours sit together, 0..1. */
export function pairHarmony(hexA: string, hexB: string): number {
  const a = lchOf(hexA);
  const b = lchOf(hexB);
  if (isDongHo(hexA) && isDongHo(hexB)) return 1;
  // a neutral next to anything is safe
  if (isNeutral(a) || isNeutral(b)) return 0.92;
  const gap = hueGap(a.h, b.h);
  const dL = Math.abs(a.L - b.L);
  let s: number;
  if (gap <= 28) s = 0.88; // analogous
  else if (gap >= 150) s = 0.82; // complementary
  else if (gap >= 105 && gap <= 135) s = 0.72; // triad
  else s = 0.5; // the awkward middle
  // when both are loud the middle gets worse, when one is quiet it gets better
  if (isQuiet(a) || isQuiet(b)) s = Math.min(1, s + 0.2);
  else if (isLoud(a) && isLoud(b) && gap > 28) s -= 0.18;
  // a little lightness contrast helps two mid colours read as intentional
  if (dL > 0.18 && dL < 0.55) s += 0.05;
  return Math.max(0, Math.min(1, s));
}

const FAMILY_NAME: Record<Family, string> = {
  do: 'đỏ',
  cam: 'cam đất',
  vang: 'vàng',
  luc: 'xanh lục',
  xanh: 'chàm',
  tim: 'tím',
  hong: 'hồng',
  trungtinh: 'trung tính',
};

// Hand-written lines for the pairs people actually make. Key = sorted family pair.
const PAIR_LINES: Record<string, string> = {
  'do|vang': 'Đỏ với vàng — đúng sắc tranh Đông Hồ, rực mà vẫn sang.',
  'vang|xanh': 'Chàm với vàng — như cánh bướm, tươi mà không chói.',
  'do|trungtinh': 'Đỏ điểm nền trung tính — gọn, sáng, hợp ảnh.',
  'luc|vang': 'Xanh lục với vàng — như lúa chín đầu mùa.',
  'hong|luc': 'Hồng với xanh lá — như sen nở trên lá, xinh ghê.',
  'hong|trungtinh': 'Hồng phấn với màu nền dịu — ngọt mà không ngấy.',
  'tim|vang': 'Tím với vàng — như hoa cúc trong chiều Huế.',
  'trungtinh|xanh': 'Chàm với màu nền sáng — mát, thanh, rất gọn mắt.',
  'trungtinh|vang': 'Vàng trên nền trung tính — ấm mà vẫn nhẹ.',
  'luc|trungtinh': 'Xanh lục với tông nền — dịu như rêu mái đình.',
  'cam|xanh': 'Cam đất với chàm — như gốm cổ, ấm mà trầm.',
  'cam|trungtinh': 'Cam đất với màu nền — ấm, mộc, rất dễ mặc.',
  'tim|trungtinh': 'Tím với màu nền sáng — đoan trang, kín đáo.',
  'tim|hong': 'Tím với hồng — mơ màng như chiều xuân.',
  'trungtinh|trungtinh': 'Toàn tông trung tính — tối giản, tinh tế.',
};

export function pairLine(hexA: string, hexB: string): string | null {
  const fa = familyOf(hexA);
  const fb = familyOf(hexB);
  const key = [fa, fb].sort().join('|');
  return PAIR_LINES[key] ?? null;
}

export function familyName(hex: string): string {
  return FAMILY_NAME[familyOf(hex)];
}

/** Colours a worn piece can be dyed to: a curated, lovely set. */
export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export const PIECE_SWATCHES: Swatch[] = [
  { id: 'son', name: 'Đỏ son', hex: '#B4302B' },
  { id: 'hoe', name: 'Vàng hoè', hex: '#E2B93B' },
  { id: 'cham', name: 'Xanh cổ vịt', hex: '#2F6D6A' },
  { id: 'diep', name: 'Trắng điệp', hex: '#F3EDE0' },
  { id: 'than', name: 'Đen than', hex: '#1B1A17' },
  { id: 'denim', name: 'Xanh denim', hex: '#7A93B5' },
  { id: 'be', name: 'Be mộc', hex: '#D9C7A8' },
  { id: 'hong', name: 'Hồng phấn', hex: '#E8B4BC' },
  { id: 'reu', name: 'Xanh rêu', hex: '#55603C' },
  { id: 'tim', name: 'Tím Huế', hex: '#6B4C9A' },
];
