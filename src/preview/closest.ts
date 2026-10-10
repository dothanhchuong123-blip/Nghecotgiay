import looksJson from '../data/looks.json';

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
}

const looks: LookEntry[] = looksJson as unknown as LookEntry[];

function hasSameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

export function lookById(id: string): LookEntry | null {
  return looks.find((entry) => entry.id === id) ?? null;
}

export function closestLook(q: LookQuery): { look: LookEntry; exact: boolean } | null {
  const candidates = looks.filter(
    (entry) => entry.side === q.side && entry.gid === q.gid
  );
  if (candidates.length === 0) {
    return null;
  }

  const qWornSet = new Set(q.worn);

  const scored = candidates.map((look) => {
    let score = 0;
    if (look.colorId === q.colorId) {
      score += 6;
    }
    if (look.vibe !== null && look.vibe === q.vibe) {
      score += 5;
    }
    for (const id of look.worn) {
      if (qWornSet.has(id)) {
        score += 3;
      } else {
        score -= 1;
      }
    }
    if (look.kind === 'preset') {
      score += 1;
    }
    return { look, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.look.kind !== b.look.kind) {
      return a.look.kind === 'preset' ? -1 : 1;
    }
    if (a.look.id < b.look.id) return -1;
    if (a.look.id > b.look.id) return 1;
    return 0;
  });

  const winner = scored[0].look;
  const exact =
    winner.kind === 'preset' &&
    winner.colorId === q.colorId &&
    hasSameIds(winner.worn, q.worn);

  return { look: winner, exact };
}
