import { CollageLevel } from '../state';

export type WorldSlug = 'chuan' | 'giao-thoa' | 'duong-pho';

export interface World {
  slug: WorldSlug;
  name: string;
  short: string;
  wall: string;
  rig: string;
  card: string;
  accent: string;
  ink: string;
}

export const WORLDS: Record<CollageLevel, World> = {
  1: {
    slug: 'chuan',
    name: 'Chuẩn cổ phục',
    short: 'Chuẩn',
    wall: '/book/wall/chuan.webp',
    rig: '/book/nghe/rig',
    card: '/book/card/chuan.webp',
    accent: '#B8322A',
    ink: '#F5E6C8',
  },
  2: {
    slug: 'giao-thoa',
    name: 'Giao thoa',
    short: 'Giao thoa',
    wall: '/book/wall/giao-thoa.webp',
    rig: '/book/nghe/giao-thoa/rig',
    card: '/book/card/giao-thoa.webp',
    accent: '#2F7D6B',
    ink: '#2A211B',
  },
  3: {
    slug: 'duong-pho',
    name: 'Đường phố',
    short: 'Đường phố',
    wall: '/book/wall/duong-pho.webp',
    rig: '/book/nghe/duong-pho/rig',
    card: '/book/card/duong-pho.webp',
    accent: '#2B7570',
    ink: '#FFFFFF',
  },
};

export function worldOf(collage?: CollageLevel | number | null): World {
  if (collage === 1 || collage === 2 || collage === 3) {
    return WORLDS[collage];
  }
  return WORLDS[2];
}

export const STREET_STICKERS = {
  banhMi: '/book/street/sticker/part-1.webp',
  sao: '/book/street/sticker/part-2.webp',
  ghe: '/book/street/sticker/part-3.webp',
  peace: '/book/street/sticker/part-4.webp',
  mu: '/book/street/sticker/part-5.webp',
  nonLa: '/book/street/sticker/part-6.webp',
  heart: '/book/street/sticker/part-7.webp',
  bubble: '/book/street/sticker/part-8.webp',
  ga: '/book/street/sticker/part-9.webp',
  traChanh: '/book/street/sticker/part-10.webp',
  burst: '/book/street/sticker/part-11.webp',
  sen: '/book/street/sticker/part-12.webp',
} as const;

export const STREET_SMALL: string[] = [
  STREET_STICKERS.banhMi,
  STREET_STICKERS.nonLa,
  STREET_STICKERS.ga,
  STREET_STICKERS.sen,
  STREET_STICKERS.sao,
  STREET_STICKERS.peace,
  STREET_STICKERS.heart,
  STREET_STICKERS.traChanh,
  STREET_STICKERS.ghe,
  STREET_STICKERS.mu,
];
