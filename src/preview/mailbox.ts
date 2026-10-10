import { LookMatch, lookById } from './closest';

// The desk envelope is Nghê's mailbox. Any page can send a letter (a photo match);
// the desk shows it flying out of the envelope, and keeps the last few letters to read again.

export interface Letter {
  matches: LookMatch[]; // best first; the rest are the runner-ups tucked behind the card
  vibeName: string | null;
}

type Listener = (letter: Letter | null) => void;
const listeners = new Set<Listener>();
let current: Letter | null = null;

export function sendLetter(letter: Letter) {
  if (letter.matches.length === 0) return;
  current = letter;
  remember(letter.matches[0]);
  listeners.forEach((fn) => fn(current));
}

export function closeLetter() {
  current = null;
  listeners.forEach((fn) => fn(null));
}

export function subscribeLetter(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---- letters kept on this device (most recent first) ----

export interface KeptLetter {
  id: string;
  score: number;
  exact: boolean;
  reasons: string[];
}

const KEY = 'nghe-giay-letters';
const MAX = 12;
const historyListeners = new Set<() => void>();

function read(): KeptLetter[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => x && typeof x.id === 'string' && lookById(x.id)) : [];
  } catch {
    return [];
  }
}

let memory: KeptLetter[] | null = null;

export function letterHistory(): KeptLetter[] {
  if (memory === null) memory = read();
  return memory;
}

function remember(m: LookMatch) {
  const kept: KeptLetter = { id: m.look.id, score: m.score, exact: m.exact, reasons: m.reasons };
  memory = [kept, ...letterHistory().filter((x) => x.id !== kept.id)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // private window: the list just lives until the tab closes
  }
  historyListeners.forEach((fn) => fn());
}

/** Opens a kept letter again. */
export function reopenLetter(kept: KeptLetter) {
  const look = lookById(kept.id);
  if (!look) return;
  sendLetter({ matches: [{ look, exact: kept.exact, score: kept.score, reasons: kept.reasons }], vibeName: null });
}

export function subscribeHistory(fn: () => void): () => void {
  historyListeners.add(fn);
  return () => {
    historyListeners.delete(fn);
  };
}
