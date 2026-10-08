import { useEffect, useState } from 'react';

type SayListener = (html: string) => void;
const listeners = new Set<SayListener>();
let currentText = '';
let talkUntil = 0;

/**
 * Shared speech function for Nghê's speech bubble across spreads.
 * Bold words inside are styled 700 #8A4B12; lists under it are 12px var(--son).
 */
export function say(html: string): void {
  currentText = html;
  talkUntil = Date.now() + 1400;
  listeners.forEach((fn) => fn(html));
}

export function getTalkUntil(): number {
  return talkUntil;
}

export function isTalking(now: number = Date.now()): boolean {
  return now < talkUntil;
}

export function getSaid(): string {
  return currentText;
}

export function subscribeSay(listener: SayListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSay(): string {
  const [text, setText] = useState<string>(currentText);

  useEffect(() => {
    return subscribeSay(setText);
  }, []);

  return text;
}
