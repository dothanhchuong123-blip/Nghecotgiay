import { HANG_TRONG, HangTrongPaper } from '../data';

export interface PaperStoreState {
  paperPick?: string | null;
  spread: number;
  vibe?: string | null;
  chapter: string;
}

/**
 * Returns the active paper ID:
 * 1. store.paperPick
 * 2. else if spread is 4 and vibe is set: HANG_TRONG.byVibe[vibe]
 * 3. else: HANG_TRONG.byChapter[chapter]
 * A missing id falls back to the first key of papers.
 */
export function paperId(store: PaperStoreState): string {
  const firstKey = Object.keys(HANG_TRONG.papers)[0] || 'ht-may-luc';
  let id: string | null | undefined = null;

  if (store.paperPick) {
    id = store.paperPick;
  } else if (store.spread === 4 && store.vibe) {
    id = HANG_TRONG.byVibe[store.vibe];
  } else {
    id = HANG_TRONG.byChapter[store.chapter];
  }

  if (id && HANG_TRONG.papers[id]) {
    return id;
  }
  return firstKey;
}

/**
 * Returns the current HangTrongPaper object.
 */
export function currentPaper(store: PaperStoreState): HangTrongPaper {
  const id = paperId(store);
  return HANG_TRONG.papers[id] || Object.values(HANG_TRONG.papers)[0];
}

/**
 * CSS background property string:
 * - mode 'tile' -> `${P.base} url(${P.src}) 0 0 / ${P.tile}px auto repeat`
 * - mode 'cover' -> `${P.base} url(${P.src}) center 69% / 2000px auto repeat`
 */
export function paperBackground(P: HangTrongPaper): string {
  if (P.mode === 'tile') {
    return `${P.base} url(${P.src}) 0 0 / ${P.tile}px auto repeat`;
  }
  return `${P.base} url(${P.src}) center 69% / 2000px auto repeat`;
}
