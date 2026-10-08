import { useSyncExternalStore } from 'react';

export interface Patch {
  id: string;
  src: string;
  name: string;
  say: string;
}

export interface StuckPatch {
  key: string;
  id: string;
  fx: number;
  fy: number;
  rot: number;
}

export const PATCHES: readonly Patch[] = [
  {
    id: 'lon',
    src: '/book/patch/part-1.webp',
    name: 'Lợn Đông Hồ',
    say: 'Lợn Đông Hồ mang xoáy âm dương gửi gắm ước nguyện no ấm, sung túc.',
  },
  {
    id: 'chuon-chuon',
    src: '/book/patch/part-2.webp',
    name: 'Chuồn chuồn tre',
    say: 'Chuồn chuồn tre mộc mạc giữ thăng bằng trên đầu ngón tay gợi nhớ tuổi thơ.',
  },
  {
    id: 'sao',
    src: '/book/patch/part-3.webp',
    name: 'Ngôi sao',
    say: 'Đèn ông sao năm cánh lung linh thắp sáng đêm hội trăng rằm Trung thu.',
  },
  {
    id: 'ga',
    src: '/book/patch/part-4.webp',
    name: 'Gà Đông Hồ',
    say: 'Gà trống Đông Hồ tượng trưng cho năm đức tính văn, võ, dũng, nhân, tín.',
  },
  {
    id: 'tem-sen',
    src: '/book/patch/part-5.webp',
    name: 'Tem hoa sen',
    say: 'Tem hoa sen thanh nhã lưu giữ tình cảm qua từng cánh thư tay.',
  },
  {
    id: 'mat-na',
    src: '/book/patch/part-6.webp',
    name: 'Mặt nạ tuồng',
    say: 'Mặt nạ tuồng khắc hoạ tính cách nhân vật bằng những mảng màu rực rỡ.',
  },
  {
    id: 'non-la',
    src: '/book/patch/part-7.webp',
    name: 'Nón lá',
    say: 'Nón lá bài thơ che nắng che mưa, chở che nét duyên dáng của người Việt.',
  },
  {
    id: 'sen',
    src: '/book/patch/part-8.webp',
    name: 'Hoa sen',
    say: 'Hoa sen gần bùn mà chẳng hôi tanh mùi bùn, biểu trưng cho sự thanh cao.',
  },
  {
    id: 'trong-dong',
    src: '/book/patch/part-9.webp',
    name: 'Trống đồng',
    say: 'Hoa văn trống đồng Đông Sơn ghi dấu nền văn minh thời các vua Hùng.',
  },
  {
    id: 'banh-chung',
    src: '/book/patch/part-10.webp',
    name: 'Bánh chưng',
    say: 'Bánh chưng vuông vức tượng trưng cho đất mẹ chở che vạn vật sinh sôi.',
  },
  {
    id: 'rong',
    src: '/book/patch/part-11.webp',
    name: 'Rồng',
    say: 'Hình tượng rồng thời Lý uốn lượn hiền hòa mang lại phúc lành cho muôn dân.',
  },
  {
    id: 'ca-chep',
    src: '/book/patch/part-12.webp',
    name: 'Cá chép',
    say: 'Cá chép vượt vũ môn hóa rồng biểu trưng cho ý chí bền bỉ và đỗ đạt.',
  },
] as const;

export const MAX_PATCHES = 4;

export const PATCH_SPOTS = [
  { fx: 0.42, fy: 0.34 },
  { fx: 0.6, fy: 0.44 },
  { fx: 0.38, fy: 0.52 },
  { fx: 0.58, fy: 0.28 },
] as const;

let stuckPatches: StuckPatch[] = [];
let spotCursor = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function patchById(id: string): Patch | undefined {
  return PATCHES.find((p) => p.id === id);
}

export function getPatches(): StuckPatch[] {
  return stuckPatches;
}

export function addPatch(id: string): StuckPatch | null {
  const existingIdx = stuckPatches.findIndex((p) => p.id === id);
  if (existingIdx !== -1) {
    stuckPatches = stuckPatches.filter((_, idx) => idx !== existingIdx);
    notify();
    return null;
  }

  const spot = PATCH_SPOTS[spotCursor % PATCH_SPOTS.length];
  spotCursor = (spotCursor + 1) % PATCH_SPOTS.length;

  const rot = Math.round((Math.random() * 24 - 12) * 10) / 10;
  const newPatch: StuckPatch = {
    key: `patch-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    id,
    fx: spot.fx,
    fy: spot.fy,
    rot,
  };

  const next = [...stuckPatches, newPatch];
  if (next.length > MAX_PATCHES) {
    stuckPatches = next.slice(next.length - MAX_PATCHES);
  } else {
    stuckPatches = next;
  }

  notify();
  return newPatch;
}

export function movePatch(key: string, fx: number, fy: number): void {
  const clampedFx = Math.max(0, Math.min(1, Math.round(fx * 1000) / 1000));
  const clampedFy = Math.max(0, Math.min(1, Math.round(fy * 1000) / 1000));
  stuckPatches = stuckPatches.map((p) =>
    p.key === key ? { ...p, fx: clampedFx, fy: clampedFy } : p
  );
  notify();
}

export function clearPatches(): void {
  stuckPatches = [];
  notify();
}

export function usePatches(): StuckPatch[] {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => stuckPatches
  );
}
