import React, { createContext, useContext } from 'react';
import { READY, hasPair, HANG_TRONG } from './data';

export type SpreadIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type CollageLevel = 1 | 2 | 3;
export type Side = 'nu' | 'nam';

export interface WeaveState {
  rows: (string | null)[];
  mode: 1 | 2;
  pick: string;
  wearing: boolean;
}

export interface AppState {
  chapter: string;
  spread: SpreadIndex;
  side: Side;
  collage: CollageLevel;
  screen: 'cover' | 'book';
  vibe: string | null;
  paperPick: string | null;
  material: string | null;
  weaveOpen: boolean;
  weave: WeaveState;
  mobileStep: 1 | 2;
}

export type AppAction =
  | { type: 'setChapter'; chapter: string }
  | { type: 'setSpread'; spread: number }
  | { type: 'setSide'; side: Side }
  | { type: 'setCollage'; collage: CollageLevel }
  | { type: 'setScreen'; screen: 'cover' | 'book' }
  | { type: 'setVibe'; vibe: string | null }
  | { type: 'setPaperPick'; paperPick: string | null }
  | { type: 'setMaterial'; material: string | null }
  | { type: 'setWeaveOpen'; open: boolean }
  | { type: 'setWeaveRow'; row: number; stripId: string | null }
  | { type: 'setWeaveMode'; mode: 1 | 2 }
  | { type: 'setWeavePick'; pick: string }
  | { type: 'clearWeave' }
  | { type: 'setWeaveWearing'; wearing: boolean }
  | { type: 'setMobileStep'; step: 1 | 2 }
  | { type: 'nextSpread' }
  | { type: 'prevSpread' };

export const initialState: AppState = {
  chapter: READY[0] || 'ao-giao-linh',
  spread: 0,
  side: 'nu',
  collage: 2,
  screen: 'cover',
  vibe: null,
  paperPick: null,
  material: null,
  weaveOpen: false,
  weave: {
    rows: Array(HANG_TRONG.weave.geo.rows).fill('den'),
    mode: 1,
    pick: 'den',
    wearing: false,
  },
  mobileStep: 1,
};

export const setChapter = (chapter: string): AppAction => ({
  type: 'setChapter',
  chapter,
});

export const setSpread = (spread: number): AppAction => ({
  type: 'setSpread',
  spread,
});

export const setSide = (side: Side): AppAction => ({
  type: 'setSide',
  side,
});

export const setCollage = (collage: CollageLevel): AppAction => ({
  type: 'setCollage',
  collage,
});

export const setScreen = (screen: 'cover' | 'book'): AppAction => ({
  type: 'setScreen',
  screen,
});

export const setVibe = (vibe: string | null): AppAction => ({
  type: 'setVibe',
  vibe,
});

export const setPaperPick = (paperPick: string | null): AppAction => ({
  type: 'setPaperPick',
  paperPick,
});

export const setMaterial = (material: string | null): AppAction => ({
  type: 'setMaterial',
  material,
});

export const setWeaveOpen = (open: boolean): AppAction => ({
  type: 'setWeaveOpen',
  open,
});

export const setWeaveRow = (row: number, stripId: string | null): AppAction => ({
  type: 'setWeaveRow',
  row,
  stripId,
});

export const setWeaveMode = (mode: 1 | 2): AppAction => ({
  type: 'setWeaveMode',
  mode,
});

export const setWeavePick = (pick: string): AppAction => ({
  type: 'setWeavePick',
  pick,
});

export const clearWeave = (): AppAction => ({
  type: 'clearWeave',
});

export const setWeaveWearing = (wearing: boolean): AppAction => ({
  type: 'setWeaveWearing',
  wearing,
});

export const setMobileStep = (step: 1 | 2): AppAction => ({
  type: 'setMobileStep',
  step,
});

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setMobileStep': {
      return {
        ...state,
        mobileStep: action.step,
      };
    }

    case 'setChapter': {
      let spread = state.spread;
      // Changing the chapter keeps the spread.
      // Spread 3 (Đừng nhầm) only exists when hasPair(chapter).
      // If the store would land on spread 3 for a chapter without a pair, it uses spread 2 instead.
      if (spread === 3 && !hasPair(action.chapter)) {
        spread = 2;
      }
      if (spread === 5 && action.chapter !== READY[READY.length - 1]) {
        spread = 4;
      }
      return {
        ...state,
        chapter: action.chapter,
        spread,
        mobileStep: 1,
        paperPick: null,
        vibe: null,
      };
    }

    case 'setSpread': {
      let target = Math.max(0, Math.min(5, Math.round(action.spread))) as SpreadIndex;
      if (target === 3 && !hasPair(state.chapter)) {
        target = 2;
      }
      return {
        ...state,
        spread: target,
        mobileStep: 1,
      };
    }

    case 'setSide': {
      return {
        ...state,
        side: action.side,
      };
    }

    case 'setCollage': {
      return {
        ...state,
        collage: action.collage,
      };
    }

    case 'setScreen': {
      return {
        ...state,
        screen: action.screen,
      };
    }

    case 'setVibe': {
      return {
        ...state,
        vibe: action.vibe,
      };
    }

    case 'setPaperPick': {
      return {
        ...state,
        paperPick: action.paperPick,
      };
    }

    case 'setMaterial': {
      return {
        ...state,
        material: action.material,
      };
    }

    case 'setWeaveOpen': {
      return {
        ...state,
        weaveOpen: action.open,
      };
    }

    case 'setWeaveRow': {
      const nextRows = [...state.weave.rows];
      nextRows[action.row] = action.stripId;
      return {
        ...state,
        weave: {
          ...state.weave,
          rows: nextRows,
        },
      };
    }

    case 'setWeaveMode': {
      return {
        ...state,
        weave: {
          ...state.weave,
          mode: action.mode,
        },
      };
    }

    case 'setWeavePick': {
      return {
        ...state,
        weave: {
          ...state.weave,
          pick: action.pick,
        },
      };
    }

    case 'clearWeave': {
      return {
        ...state,
        weave: {
          ...state.weave,
          rows: Array(state.weave.rows.length).fill(null),
        },
      };
    }

    case 'setWeaveWearing': {
      return {
        ...state,
        weave: {
          ...state.weave,
          wearing: action.wearing,
        },
      };
    }

    case 'nextSpread': {
      const isLastChapter = state.chapter === READY[READY.length - 1];
      if (isLastChapter && state.spread === 4) {
        return {
          ...state,
          spread: 5,
        };
      }
      const allowed: SpreadIndex[] = hasPair(state.chapter)
        ? [0, 1, 2, 3, 4]
        : [0, 1, 2, 4];
      const next = allowed.find((s) => s > state.spread);
      if (next !== undefined) {
        return {
          ...state,
          spread: next,
        };
      }
      return state;
    }

    case 'prevSpread': {
      if (state.spread === 5) {
        return {
          ...state,
          spread: 4,
        };
      }
      const allowed: SpreadIndex[] = hasPair(state.chapter)
        ? [0, 1, 2, 3, 4]
        : [0, 1, 2, 4];
      const prev = [...allowed].reverse().find((s) => s < state.spread);
      if (prev !== undefined) {
        return {
          ...state,
          spread: prev,
        };
      }
      return state;
    }

    default:
      return state;
  }
}

export interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

type Listener = () => void;

let currentLiveState: AppState = initialState;
const liveListeners = new Set<Listener>();

export const liveStore = {
  get(): AppState {
    return currentLiveState;
  },
  set(next: AppState) {
    if (currentLiveState === next) return;
    currentLiveState = next;
    liveListeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener): () => void {
    liveListeners.add(fn);
    return () => {
      liveListeners.delete(fn);
    };
  },
};

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    return {
      state: initialState,
      dispatch: () => {},
    };
  }
  return context;
}
