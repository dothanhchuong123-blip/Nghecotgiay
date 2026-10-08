import { useEffect, useState } from 'react';

// Custom dye colours for worn pieces (id -> hex). Missing id = the piece's own colour.
export type PieceColors = Record<string, string>;

let current: PieceColors = {};
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getPieceColors(): PieceColors {
  return current;
}

export function setPieceColor(id: string, hex: string | null): void {
  const next = { ...current };
  if (hex) next[id] = hex.toLowerCase();
  else delete next[id];
  current = next;
  notify();
}

export function setManyPieceColors(update: PieceColors): void {
  const next: PieceColors = {};
  for (const [k, v] of Object.entries(update)) next[k] = v.toLowerCase();
  current = next;
  notify();
}

/** Keep only colours for pieces that are still worn. */
export function prunePieceColors(worn: string[]): void {
  const keep = new Set(worn);
  const ids = Object.keys(current);
  if (ids.every((id) => keep.has(id))) return;
  const next: PieceColors = {};
  for (const id of ids) if (keep.has(id)) next[id] = current[id];
  current = next;
  notify();
}

export function clearPieceColors(): void {
  if (Object.keys(current).length === 0) return;
  current = {};
  notify();
}

export function pieceColorsKey(pc: PieceColors): string {
  return Object.keys(pc)
    .sort()
    .map((k) => `${k}=${pc[k]}`)
    .join(',');
}

export function usePieceColors(): PieceColors {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return current;
}
