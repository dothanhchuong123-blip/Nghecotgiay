import React, { useMemo, useSyncExternalStore } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { COPY, hasPair, SCENES, NAM_OF, READY } from '../data';
import {
  AppAction,
  AppState,
  liveStore,
  setChapter,
  setSide,
  setSpread,
  Side,
  SpreadIndex,
  StoreContext,
} from '../state';
import { RegisteredStand, StandRegisterContext } from '../paper/Stand';
import { isReducedMotion } from '../paper/motion';
import {
  isTurnRunning,
  startTurnMotion,
  setOpenSpreadStands,
  getOpenSpreadStands,
  ActiveTurn,
  replaySpread,
} from './BookMotion';
import Meet from '../spreads/Meet';
import MeetText from '../spreads/MeetText';
import Parts, { PartsRight } from '../spreads/Parts';
import Story, { StoryRight } from '../spreads/Story';
import Compare, { CompareRight } from '../spreads/Compare';
import Mix, { MixRight } from '../spreads/Mix';
import LastPage from './LastPage';
import { rustle } from '../audio/paper';

export interface TurnChange {
  spread?: SpreadIndex;
  chapter?: string;
  side?: Side;
  mobileStep?: 1 | 2;
  force?: boolean;
}

let currentBook3d: HTMLElement | null = null;
let getStoreState: (() => AppState) | null = null;
let storeDispatch: React.Dispatch<AppAction> | null = null;
let currentRoots: Root[] = [];
let currentBuiltSpread: BuiltSpread | null = null;
let isTurning = false;

export function isBookBusy(): boolean {
  return isTurning || isTurnRunning();
}

function phoneCovered() {
  return document.documentElement.classList.contains('mm-on');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSpreadContent(
  spread: SpreadIndex,
  chapter: string,
  side: Side
): { left: React.ReactNode; right: React.ReactNode } {
  if (spread === 0) {
    return {
      left: <Meet chapter={chapter} side={side} />,
      right: <MeetText />,
    };
  }

  if (spread === 1) {
    return {
      left: <Parts chapter={chapter} side={side} page="L" />,
      right: <PartsRight chapter={chapter} side={side} />,
    };
  }

  if (spread === 2) {
    return {
      left: <Story chapter={chapter} side={side} page="L" />,
      right: <StoryRight chapter={chapter} side={side} />,
    };
  }

  if (spread === 3) {
    return {
      left: <Compare chapter={chapter} side={side} page="L" />,
      right: <CompareRight chapter={chapter} side={side} />,
    };
  }

  if (spread === 4) {
    return {
      left: <Mix chapter={chapter} side={side} page="L" />,
      right: <MixRight chapter={chapter} side={side} />,
    };
  }

  if (spread === 5) {
    return {
      left: <LastPage page="L" />,
      right: <LastPage page="R" />,
    };
  }

  const keys: Array<'meet' | 'parts' | 'story' | 'compare' | 'mix'> = [
    'meet',
    'parts',
    'story',
    'compare',
    'mix',
  ];
  const spreadKey = keys[spread] || 'meet';
  const label = COPY.spreads[spreadKey] || `Trang ${spread + 1}`;

  return {
    left: (
      <div
        className="spread-placeholder l"
        style={{
          padding: 40,
          fontFamily: 'var(--font-head)',
          color: 'var(--ink-2)',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span>{label}</span>
      </div>
    ),
    right: (
      <div
        className="spread-placeholder r"
        style={{
          padding: 40,
          fontFamily: 'var(--font-head)',
          color: 'var(--ink-2)',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span>{label}</span>
      </div>
    ),
  };
}

interface BuiltSpread {
  pgL: HTMLElement;
  pgR: HTMLElement;
  roots: Root[];
  standsL: RegisteredStand[];
  standsR: RegisteredStand[];
}

interface PageStoreProps {
  spread: SpreadIndex;
  chapter: string;
  side: Side;
  dispatch: React.Dispatch<AppAction>;
  children: React.ReactNode;
}

function PageStore({
  spread,
  chapter,
  side,
  dispatch,
  children,
}: PageStoreProps) {
  const live = useSyncExternalStore(liveStore.subscribe, liveStore.get);
  const state = useMemo(
    () => ({
      ...live,
      spread,
      chapter,
      side,
    }),
    [live, spread, chapter, side]
  );
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state, dispatch]
  );

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

function buildSpread(
  spread: SpreadIndex,
  chapter: string,
  side: Side,
  fullState: AppState,
  dispatch: React.Dispatch<AppAction>,
  phonePages: 'none' | 'left' = 'none'
): BuiltSpread {
  const phone = typeof window !== 'undefined' && window.innerWidth < 768;

  const pgL = document.createElement('div');
  pgL.className = 'pg l';

  const shadeL = document.createElement('div');
  shadeL.className = 'turnshade';
  shadeL.setAttribute('aria-hidden', 'true');
  pgL.appendChild(shadeL);

  const wrapL = document.createElement('div');
  wrapL.className = 'pg-content-wrap';
  pgL.appendChild(wrapL);

  const pgR = document.createElement('div');
  pgR.className = 'pg r';

  const shadeR = document.createElement('div');
  shadeR.className = 'turnshade';
  shadeR.setAttribute('aria-hidden', 'true');
  pgR.appendChild(shadeR);

  const wrapR = document.createElement('div');
  wrapR.className = 'pg-content-wrap';
  pgR.appendChild(wrapR);

  const standsL: RegisteredStand[] = [];
  const standsR: RegisteredStand[] = [];

  if (phone && phonePages === 'none') {
    return { pgL, pgR, roots: [], standsL, standsR };
  }

  const registerStandL = (stand: RegisteredStand) => {
    stand.page = 'L';
    stand.t = 0;
    stand.v = 0;
    stand.settled = false;
    stand.element.style.setProperty('--up', '0.0000');
    if (stand.cast) stand.cast.style.setProperty('--up', '0.0000');
    standsL.push(stand);
    return () => {
      const idx = standsL.indexOf(stand);
      if (idx !== -1) standsL.splice(idx, 1);
    };
  };

  const registerStandR = (stand: RegisteredStand) => {
    stand.page = 'R';
    stand.t = 0;
    stand.v = 0;
    stand.settled = false;
    stand.element.style.setProperty('--up', '0.0000');
    if (stand.cast) stand.cast.style.setProperty('--up', '0.0000');
    standsR.push(stand);
    return () => {
      const idx = standsR.indexOf(stand);
      if (idx !== -1) standsR.splice(idx, 1);
    };
  };

  const { left, right } = getSpreadContent(spread, chapter, side);

  const rootL = createRoot(wrapL);

  rootL.render(
    <PageStore
      spread={spread}
      chapter={chapter}
      side={side}
      dispatch={dispatch}
    >
      <StandRegisterContext.Provider
        value={{ page: 'L', registerStand: registerStandL }}
      >
        {left}
      </StandRegisterContext.Provider>
    </PageStore>
  );

  if (phone && phonePages === 'left') {
    return {
      pgL,
      pgR,
      roots: [rootL],
      standsL,
      standsR,
    };
  }

  const rootR = createRoot(wrapR);

  rootR.render(
    <PageStore
      spread={spread}
      chapter={chapter}
      side={side}
      dispatch={dispatch}
    >
      <StandRegisterContext.Provider
        value={{ page: 'R', registerStand: registerStandR }}
      >
        {right}
      </StandRegisterContext.Provider>
    </PageStore>
  );

  return {
    pgL,
    pgR,
    roots: [rootL, rootR],
    standsL,
    standsR,
  };
}

/**
 * Initializes the pop-up book pages on initial mount.
 */
export function initBookTurn(
  book3d: HTMLElement,
  getState: () => AppState,
  dispatch: React.Dispatch<AppAction>
): () => void {
  currentBook3d = book3d;
  getStoreState = getState;
  storeDispatch = dispatch;

  const existingPgL = book3d.querySelector('.pg.l');
  const existingPgR = book3d.querySelector('.pg.r');
  if (existingPgL && existingPgR) {
    return () => {};
  }

  const state = getState();
  if (state.screen === 'cover') {
    return () => {
      currentBook3d = null;
    };
  }

  const built = buildSpread(state.spread, state.chapter, state.side, state, dispatch);
  currentRoots = built.roots;
  currentBuiltSpread = built;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const fold = book3d.querySelector('.fold');
  if (fold) {
    book3d.insertBefore(built.pgL, fold);
    book3d.insertBefore(built.pgR, fold);
  } else {
    book3d.appendChild(built.pgL);
    book3d.appendChild(built.pgR);
  }

  if (isMobile) {
    const step = state.mobileStep || 1;
    book3d.dataset.step = String(step);
    if (step === 1) {
      built.pgL.style.visibility = 'visible';
      built.pgL.style.transform = 'translateZ(0.2px)';
      built.pgR.style.visibility = 'hidden';
      built.pgR.style.transform = 'translateZ(-2px)';
    } else {
      built.pgR.style.visibility = 'visible';
      built.pgR.style.transform = 'translateZ(0.2px)';
      built.pgL.style.visibility = 'hidden';
      built.pgL.style.transform = 'translateZ(-2px)';
    }
  }

  (async () => {
    await wait(30);
    const imgs = Array.from(built.pgL.querySelectorAll('img')).concat(
      Array.from(built.pgR.querySelectorAll('img'))
    );
    await Promise.race([
      Promise.all(
        imgs.map((img) =>
          img.decode ? img.decode().catch(() => {}) : Promise.resolve()
        )
      ),
      wait(350),
    ]);
    const initialStands = isMobile
      ? (state.mobileStep === 2 ? built.standsR : built.standsL)
      : [...built.standsL, ...built.standsR];
    setOpenSpreadStands(initialStands);
    replaySpread();
  })();

  return () => {
    const toUnmount = [...currentRoots];
    currentRoots = [];
    currentBuiltSpread = null;
    isTurning = false;
    currentBook3d = null;
    setTimeout(() => {
      toUnmount.forEach((r) => {
        try {
          r.unmount();
        } catch (_) {}
      });
    }, 0);
  };
}

/**
 * Main turn entry point: called for every change of spread, chapter or side.
 */
export async function go(change: TurnChange): Promise<void> {
  if (isTurning || isTurnRunning()) {
    return;
  }

  if (!currentBook3d || !getStoreState || !storeDispatch) {
    return;
  }

  const currentState = getStoreState();
  const book3d = currentBook3d;
  const dispatch = storeDispatch;

  const currentSpread = currentState.spread;
  const currentChapter = currentState.chapter;
  const currentSide = currentState.side;

  let targetSpread =
    change.spread !== undefined ? change.spread : currentSpread;
  const targetChapter =
    change.chapter !== undefined ? change.chapter : currentChapter;
  let targetSide = change.side !== undefined ? change.side : currentSide;

  // Check if targetChapter locks to one side (has only one side and no NAM_OF garment)
  const scene = (SCENES as Record<string, { full?: string[] } | undefined>)[targetChapter];
  const fullSides = scene?.full || [];
  if (fullSides.length === 1) {
    const namOfGarment = NAM_OF[targetChapter];
    const hasNamOf = namOfGarment && namOfGarment !== targetChapter;
    if (!hasNamOf) {
      targetSide = fullSides[0] as Side;
    }
  }

  // Handle spread 3 (Đừng nhầm) if target chapter doesn't have pair
  if (targetSpread === 3 && !hasPair(targetChapter)) {
    targetSpread = 2;
  }

  // Handle spread 5 (LastPage) only available for the last chapter in READY
  if (targetSpread === 5 && targetChapter !== READY[READY.length - 1]) {
    targetSpread = 4;
  }

  const isForce = change.force === true;

  // If no change and not force, ignore
  if (
    !isForce &&
    targetSpread === currentSpread &&
    targetChapter === currentChapter &&
    targetSide === currentSide &&
    (change.mobileStep === undefined ||
      change.mobileStep === (currentState.mobileStep || 1))
  ) {
    return;
  }

  // Determine direction:
  // dir = +1 when the new spread number is higher (and for chapter, side and replay changes), -1 when lower
  let dir = 1;
  if (
    !isForce &&
    targetChapter === currentChapter &&
    targetSide === currentSide &&
    change.spread !== undefined
  ) {
    if (change.spread < currentSpread) {
      dir = -1;
    } else {
      dir = 1;
    }
  } else {
    dir = 1;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const currentStep = currentState.mobileStep || 1;
  const targetStep =
    change.mobileStep !== undefined
      ? change.mobileStep
      : (change.spread !== undefined && change.spread !== currentSpread ? 1 : currentStep);

  // If on mobile and changing step on the same spread
  if (
    !isForce &&
    isMobile &&
    targetSpread === currentSpread &&
    targetChapter === currentChapter &&
    targetSide === currentSide &&
    targetStep !== currentStep &&
    currentBuiltSpread
  ) {
    if (isReducedMotion() || phoneCovered()) {
      dispatch({ type: 'setMobileStep', step: targetStep });
      book3d.dataset.step = String(targetStep);
      if (targetStep === 1) {
        currentBuiltSpread.pgR.style.visibility = 'hidden';
        currentBuiltSpread.pgR.style.transform = 'translateZ(-2px)';
        currentBuiltSpread.pgL.style.visibility = 'visible';
        currentBuiltSpread.pgL.style.transform = 'translateZ(0.2px)';
        setOpenSpreadStands(currentBuiltSpread.standsL);
      } else {
        currentBuiltSpread.pgL.style.visibility = 'hidden';
        currentBuiltSpread.pgL.style.transform = 'translateZ(-2px)';
        currentBuiltSpread.pgR.style.visibility = 'visible';
        currentBuiltSpread.pgR.style.transform = 'translateZ(0.2px)';
        setOpenSpreadStands(currentBuiltSpread.standsR);
      }
      replaySpread();
      return;
    }

    isTurning = true;
    rustle();

    if (targetStep === 2) {
      // Step 1 -> Step 2: pgL turns over to reveal pgR underneath
      const leaf = currentBuiltSpread.pgL;
      const underPage = currentBuiltSpread.pgR;
      underPage.style.visibility = 'visible';
      underPage.style.transform = 'translateZ(0px)';
      underPage.classList.remove('past');

      leaf.classList.add('leaf');
      leaf.classList.remove('past');
      leaf.style.setProperty('--lz', '0.8px');
      leaf.style.setProperty('--a', '0deg');
      leaf.style.transformOrigin = '0 50%';

      const leavingStands = currentBuiltSpread.standsL;
      const underStands = currentBuiltSpread.standsR;
      const underShade = underPage.querySelector<HTMLElement>('.turnshade');
      const dummyDest = document.createElement('div');
      const dummyBack = document.createElement('div');

      dispatch({ type: 'setMobileStep', step: 2 });
      book3d.dataset.step = '2';

      const turn: ActiveTurn = {
        dir: 1,
        leaf,
        dest: dummyDest,
        underPage,
        backPage: dummyBack,
        underShade,
        destShade: null,
        leavingStands,
        stayStands: [],
        underStands,
        backStands: [],
        turnAge: 0,
        onLand: () => {
          leaf.classList.remove('leaf', 'past');
          leaf.style.visibility = 'hidden';
          leaf.style.transform = 'translateZ(-2px)';
          leaf.style.removeProperty('--a');
          leaf.style.removeProperty('--lz');
          underPage.style.transform = 'translateZ(0.2px)';
          if (underShade) underShade.style.opacity = '0';
          setOpenSpreadStands(underStands);
          isTurning = false;
        },
      };
      startTurnMotion(turn);
      return;
    } else {
      // Step 2 -> Step 1: pgL flips back over pgR from left to right
      const leaf = currentBuiltSpread.pgL;
      const dest = currentBuiltSpread.pgR;
      leaf.style.visibility = 'visible';
      leaf.classList.add('leaf', 'past');
      leaf.style.setProperty('--lz', '0.8px');
      leaf.style.setProperty('--a', '-180deg');
      leaf.style.transformOrigin = '0 50%';

      const leavingStands = currentBuiltSpread.standsR;
      const underStands = currentBuiltSpread.standsL;
      const underShade = leaf.querySelector<HTMLElement>('.turnshade');
      const destShade = dest.querySelector<HTMLElement>('.turnshade');
      const dummyDest = dest;
      const dummyBack = document.createElement('div');

      dispatch({ type: 'setMobileStep', step: 1 });
      book3d.dataset.step = '1';

      const turn: ActiveTurn = {
        dir: -1,
        leaf,
        dest: dummyDest,
        underPage: leaf,
        backPage: dummyBack,
        underShade,
        destShade,
        leavingStands,
        stayStands: [],
        underStands,
        backStands: [],
        turnAge: 0,
        onLand: () => {
          leaf.classList.remove('leaf', 'past');
          leaf.style.transform = 'translateZ(0.2px)';
          leaf.style.removeProperty('--a');
          leaf.style.removeProperty('--lz');
          dest.style.visibility = 'hidden';
          dest.style.transform = 'translateZ(-2px)';
          if (underShade) underShade.style.opacity = '0';
          if (destShade) destShade.style.opacity = '0';
          setOpenSpreadStands(underStands);
          isTurning = false;
        },
      };
      startTurnMotion(turn);
      return;
    }
  }

  // Inter-spread mobile change
  if (isMobile) {
    if (isForce) {
      setOpenSpreadStands(
        currentStep === 2
          ? (currentBuiltSpread ? currentBuiltSpread.standsR : [])
          : (currentBuiltSpread ? currentBuiltSpread.standsL : [])
      );
      replaySpread();
      return;
    }

    isTurning = true;
    rustle();

    const built = buildSpread(
      targetSpread,
      targetChapter,
      targetSide,
      currentState,
      dispatch
    );
    const newPgL = built.pgL;
    const newPgR = built.pgR;
    const newRoots = built.roots;

    await wait(30);
    const imgs = Array.from(newPgL.querySelectorAll('img')).concat(
      Array.from(newPgR.querySelectorAll('img'))
    );
    await Promise.race([
      Promise.all(
        imgs.map((img) =>
          img.decode ? img.decode().catch(() => {}) : Promise.resolve()
        )
      ),
      wait(350),
    ]);

    if (isReducedMotion() || phoneCovered()) {
      if (targetChapter !== currentChapter) dispatch(setChapter(targetChapter));
      if (targetSide !== currentSide) dispatch(setSide(targetSide));
      if (targetSpread !== currentSpread) dispatch(setSpread(targetSpread));
      dispatch({ type: 'setMobileStep', step: targetStep });
      book3d.dataset.step = String(targetStep);

      const oldPgL = book3d.querySelector('.pg.l');
      const oldPgR = book3d.querySelector('.pg.r');

      if (targetStep === 1) {
        newPgL.style.visibility = 'visible';
        newPgL.style.transform = 'translateZ(0.2px)';
        newPgR.style.visibility = 'hidden';
        newPgR.style.transform = 'translateZ(-2px)';
      } else {
        newPgR.style.visibility = 'visible';
        newPgR.style.transform = 'translateZ(0.2px)';
        newPgL.style.visibility = 'hidden';
        newPgL.style.transform = 'translateZ(-2px)';
      }

      newPgL.style.opacity = '0';
      newPgR.style.opacity = '0';
      newPgL.style.transition = 'opacity 150ms ease';
      newPgR.style.transition = 'opacity 150ms ease';

      const activeStands = targetStep === 2 ? built.standsR : built.standsL;
      activeStands.forEach((s) => {
        s.t = s.rest;
        s.v = 0;
        s.settled = true;
        s.element.style.setProperty('--up', s.rest.toFixed(4));
        if (s.cast) s.cast.style.setProperty('--up', s.rest.toFixed(4));
      });

      const fold = book3d.querySelector('.fold');
      if (fold) {
        book3d.insertBefore(newPgL, fold);
        book3d.insertBefore(newPgR, fold);
      } else {
        book3d.appendChild(newPgL);
        book3d.appendChild(newPgR);
      }

      if (oldPgL) oldPgL.remove();
      if (oldPgR) oldPgR.remove();
      currentRoots.forEach((r) => {
        try {
          r.unmount();
        } catch (_) {}
      });
      currentRoots = newRoots;
      currentBuiltSpread = built;

      requestAnimationFrame(() => {
        newPgL.style.opacity = '1';
        newPgR.style.opacity = '1';
      });

      setTimeout(() => {
        newPgL.style.transition = '';
        newPgR.style.transition = '';
        newPgL.style.opacity = '';
        newPgR.style.opacity = '';
        setOpenSpreadStands(activeStands);
        isTurning = false;
      }, 150);
      return;
    }

    const oldPgL = book3d.querySelector<HTMLElement>('.pg.l');
    const oldPgR = book3d.querySelector<HTMLElement>('.pg.r');
    const oldVisible =
      currentStep === 2 ? (oldPgR || oldPgL) : (oldPgL || oldPgR);

    if (!oldVisible) {
      isTurning = false;
      return;
    }

    if (dir > 0) {
      const leaf = oldVisible;
      const underPage = newPgL;
      underPage.style.visibility = 'visible';
      underPage.style.transform = 'translateZ(0px)';
      underPage.classList.remove('past');

      newPgR.style.visibility = 'hidden';
      newPgR.style.transform = 'translateZ(-2px)';

      book3d.insertBefore(newPgL, leaf);
      book3d.insertBefore(newPgR, leaf);

      leaf.classList.add('leaf');
      leaf.classList.remove('past');
      leaf.style.setProperty('--lz', '0.8px');
      leaf.style.setProperty('--a', '0deg');
      leaf.style.transformOrigin = '0 50%';

      const leavingStands = getOpenSpreadStands();
      const underStands = built.standsL;
      const underShade = underPage.querySelector<HTMLElement>('.turnshade');
      const dummyDest = document.createElement('div');
      const dummyBack = document.createElement('div');

      if (targetChapter !== currentChapter) dispatch(setChapter(targetChapter));
      if (targetSide !== currentSide) dispatch(setSide(targetSide));
      if (targetSpread !== currentSpread) dispatch(setSpread(targetSpread));
      dispatch({ type: 'setMobileStep', step: 1 });
      book3d.dataset.step = '1';

      const oldRoots = currentRoots;
      currentRoots = newRoots;
      currentBuiltSpread = built;

      const turn: ActiveTurn = {
        dir: 1,
        leaf,
        dest: dummyDest,
        underPage,
        backPage: dummyBack,
        underShade,
        destShade: null,
        leavingStands,
        stayStands: [],
        underStands,
        backStands: [],
        turnAge: 0,
        onLand: () => {
          if (oldPgL) oldPgL.remove();
          if (oldPgR) oldPgR.remove();
          newPgL.style.transform = 'translateZ(0.2px)';
          if (underShade) underShade.style.opacity = '0';
          setOpenSpreadStands(underStands);
          oldRoots.forEach((r) => {
            try {
              r.unmount();
            } catch (_) {}
          });
          isTurning = false;
        },
      };
      startTurnMotion(turn);
      return;
    } else {
      const showPage = targetStep === 2 ? newPgR : newPgL;
      const hidePage = targetStep === 2 ? newPgL : newPgR;

      showPage.style.visibility = 'visible';
      hidePage.style.visibility = 'hidden';
      hidePage.style.transform = 'translateZ(-2px)';

      book3d.insertBefore(showPage, oldVisible);
      book3d.insertBefore(hidePage, oldVisible);

      const leaf = oldVisible;
      leaf.classList.add('leaf');
      leaf.style.setProperty('--lz', '0.8px');
      leaf.style.setProperty('--a', '0deg');
      leaf.style.transformOrigin = '0 50%';

      const leavingStands = getOpenSpreadStands();
      const underStands = targetStep === 2 ? built.standsR : built.standsL;
      const underShade = showPage.querySelector<HTMLElement>('.turnshade');
      const dummyDest = document.createElement('div');
      const dummyBack = document.createElement('div');

      if (targetChapter !== currentChapter) dispatch(setChapter(targetChapter));
      if (targetSide !== currentSide) dispatch(setSide(targetSide));
      if (targetSpread !== currentSpread) dispatch(setSpread(targetSpread));
      dispatch({ type: 'setMobileStep', step: targetStep });
      book3d.dataset.step = String(targetStep);

      const oldRoots = currentRoots;
      currentRoots = newRoots;
      currentBuiltSpread = built;

      const turn: ActiveTurn = {
        dir: -1,
        leaf,
        dest: dummyDest,
        underPage: showPage,
        backPage: dummyBack,
        underShade,
        destShade: null,
        leavingStands,
        stayStands: [],
        underStands,
        backStands: [],
        turnAge: 0,
        onLand: () => {
          if (oldPgL) oldPgL.remove();
          if (oldPgR) oldPgR.remove();
          showPage.style.transform = 'translateZ(0.2px)';
          if (underShade) underShade.style.opacity = '0';
          setOpenSpreadStands(underStands);
          oldRoots.forEach((r) => {
            try {
              r.unmount();
            } catch (_) {}
          });
          isTurning = false;
        },
      };
      startTurnMotion(turn);
      return;
    }
  }

  isTurning = true;
  rustle();

  // 1. Build the new spread into two fresh page elements (new .pg.l and .pg.r) with their Stands at t = 0
  const built = buildSpread(
    targetSpread,
    targetChapter,
    targetSide,
    currentState,
    dispatch
  );
  const newPgL = built.pgL;
  const newPgR = built.pgR;
  const newRoots = built.roots;

  // 2. Wait for new pictures to decode, at most 350 ms:
  // Promise.race([Promise.all(imgs.map(i => i.decode().catch(() => {}))), wait(350)])
  await wait(30);
  const imgs = Array.from(newPgL.querySelectorAll('img')).concat(
    Array.from(newPgR.querySelectorAll('img'))
  );
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      )
    ),
    wait(350),
  ]);

  // 3. Handle Reduced Motion:
  // "6. Reduced motion: no turn; swap the pages and fade the new spread in over 150 ms."
  if (isReducedMotion()) {
    // 5. Update tabs and side switch at the start of the turn
    if (targetChapter !== currentChapter) dispatch(setChapter(targetChapter));
    if (targetSide !== currentSide) dispatch(setSide(targetSide));
    if (targetSpread !== currentSpread) dispatch(setSpread(targetSpread));

    const oldPgL = book3d.querySelector('.pg.l');
    const oldPgR = book3d.querySelector('.pg.r');

    newPgL.style.opacity = '0';
    newPgR.style.opacity = '0';
    newPgL.style.transition = 'opacity 150ms ease';
    newPgR.style.transition = 'opacity 150ms ease';

    const allNewStands = [...built.standsL, ...built.standsR];
    allNewStands.forEach((s) => {
      s.t = s.rest;
      s.v = 0;
      s.settled = true;
      s.element.style.setProperty('--up', s.rest.toFixed(4));
      if (s.cast) s.cast.style.setProperty('--up', s.rest.toFixed(4));
    });

    const fold = book3d.querySelector('.fold');
    book3d.insertBefore(newPgL, fold);
    book3d.insertBefore(newPgR, fold);

    if (oldPgL) oldPgL.remove();
    if (oldPgR) oldPgR.remove();
    currentRoots.forEach((r) => {
      try {
        r.unmount();
      } catch (_) {}
    });
    currentRoots = newRoots;

    requestAnimationFrame(() => {
      newPgL.style.opacity = '1';
      newPgR.style.opacity = '1';
    });

    setTimeout(() => {
      newPgL.style.transition = '';
      newPgR.style.transition = '';
      newPgL.style.opacity = '';
      newPgR.style.opacity = '';
      setOpenSpreadStands(allNewStands);
      isTurning = false;
    }, 150);

    return;
  }

  // 4. Normal 3D Turn Preparation:
  // Find old pages:
  const oldPgL = book3d.querySelector<HTMLElement>('.pg.l');
  const oldPgR = book3d.querySelector<HTMLElement>('.pg.r');

  if (!oldPgL || !oldPgR) {
    isTurning = false;
    return;
  }

  // b. The leaf is the old right page when dir > 0, the old left page when dir < 0.
  // The "under" page is the new page on the same side as the leaf; insert it in .book3d just before the leaf.
  // The "back" page is the other new page: put it inside the leaf as its last child, with class backpage,
  // style left 0, right auto, top 0, bottom 0, transform-origin 50% 50%, transform translateZ(-1.6px) rotateY(180deg).
  // The leaf gets class leaf and --lz .8px. "dest" is the old page on the other side.
  let leaf: HTMLElement;
  let dest: HTMLElement;
  let underPage: HTMLElement;
  let backPage: HTMLElement;
  let underStands: RegisteredStand[];
  let backStands: RegisteredStand[];

  if (dir > 0) {
    leaf = oldPgR;
    dest = oldPgL;
    underPage = newPgR;
    backPage = newPgL;
    underStands = built.standsR;
    backStands = built.standsL;
  } else {
    leaf = oldPgL;
    dest = oldPgR;
    underPage = newPgL;
    backPage = newPgR;
    underStands = built.standsL;
    backStands = built.standsR;
  }

  // Insert under page just before leaf
  book3d.insertBefore(underPage, leaf);

  // Mount back page inside leaf
  backPage.classList.add('backpage');
  backPage.style.left = '0';
  backPage.style.right = 'auto';
  backPage.style.top = '0';
  backPage.style.bottom = '0';
  backPage.style.transformOrigin = '50% 50%';
  backPage.style.transform = 'translateZ(-1.6px) rotateY(180deg)';
  leaf.appendChild(backPage);

  // Leaf classes & initial transform
  leaf.classList.add('leaf');
  leaf.classList.remove('past');
  leaf.style.setProperty('--lz', '0.8px');
  leaf.style.setProperty('--a', '0deg');

  // d. Roles:
  // new Stands on the back page are "back"
  // new Stands on the under page are "under"
  // old Stands inside the leaf are "leaving"
  // old Stands on dest are "stay"
  const currentStands = getOpenSpreadStands();
  const leavingStands: RegisteredStand[] = [];
  const stayStands: RegisteredStand[] = [];

  currentStands.forEach((s) => {
    s.settled = false;
    if (leaf.contains(s.element)) {
      leavingStands.push(s);
    } else {
      stayStands.push(s);
    }
  });

  const underShade = underPage.querySelector<HTMLElement>('.turnshade');
  const destShade = dest.querySelector<HTMLElement>('.turnshade');

  // 5. Index tabs, chapter tabs and the side switch update at the start of the turn
  if (targetChapter !== currentChapter) dispatch(setChapter(targetChapter));
  if (targetSide !== currentSide) dispatch(setSide(targetSide));
  if (targetSpread !== currentSpread) dispatch(setSpread(targetSpread));

  const oldRoots = currentRoots;
  currentRoots = newRoots;

  const turn: ActiveTurn = {
    dir,
    leaf,
    dest,
    underPage,
    backPage,
    underShade,
    destShade,
    leavingStands,
    stayStands,
    underStands,
    backStands,
    turnAge: 0,
    onLand: () => {
      // Landing:
      // remove class backpage and the inline style from the back page,
      // insert it in .book3d before the leaf, remove the leaf and dest.
      // The new Stands become the open spread's list.
      backPage.classList.remove('backpage');
      backPage.style.left = '';
      backPage.style.right = '';
      backPage.style.top = '';
      backPage.style.bottom = '';
      backPage.style.transformOrigin = '';
      backPage.style.transform = '';
      backPage.style.removeProperty('--a');
      backPage.style.removeProperty('--lz');

      const fold = book3d.querySelector('.fold');
      book3d.insertBefore(backPage, leaf);

      // Clean up leaf & dest
      leaf.remove();
      dest.remove();

      // Ensure proper DOM ordering before fold: newPgL then newPgR
      book3d.insertBefore(newPgL, fold);
      book3d.insertBefore(newPgR, fold);

      if (underShade) underShade.style.opacity = '0';
      if (destShade) destShade.style.opacity = '0';

      const openStands = [...underStands, ...backStands];
      setOpenSpreadStands(openStands);

      // Unmount old React trees
      oldRoots.forEach((r) => {
        try {
          r.unmount();
        } catch (_) {}
      });

      isTurning = false;
    },
  };

  startTurnMotion(turn);
}

function releasePhonePage(built: BuiltSpread): void {
  setTimeout(() => {
    if (
      document.documentElement.classList.contains('mm-on') &&
      currentRoots === built.roots
    ) {
      built.roots.forEach((r) => {
        try {
          r.unmount();
        } catch (_) {}
      });
      currentRoots = [];
      built.standsL.length = 0;
      setOpenSpreadStands([]);
    }
  }, 900);
}

/**
 * Opens the closed book: cover rotates 180° around the spine (rotateY around left edge),
 * landing on the left and revealing the spread of the current chapter with "back" and "under" stands.
 */
export async function openBook(startSpread: SpreadIndex = 0): Promise<void> {
  if (isTurning || isTurnRunning()) {
    return;
  }

  if (!currentBook3d || !getStoreState || !storeDispatch) {
    return;
  }

  const currentState = getStoreState();
  const book3d = currentBook3d;
  const dispatch = storeDispatch;

  if (currentState.spread !== startSpread) {
    dispatch(setSpread(startSpread));
  }

  isTurning = true;
  rustle();

  const targetSpread: SpreadIndex = startSpread;
  const targetChapter = currentState.chapter || 'ao-giao-linh';
  const targetSide = currentState.side || 'nu';

  const built = buildSpread(
    targetSpread,
    targetChapter,
    targetSide,
    currentState,
    dispatch,
    'left'
  );

  await wait(30);
  const imgs = Array.from(built.pgL.querySelectorAll('img')).concat(
    Array.from(built.pgR.querySelectorAll('img'))
  );
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      )
    ),
    wait(350),
  ]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    currentBuiltSpread = built;
    const coverEl = book3d.querySelector<HTMLElement>('.book-cover');
    const covShadow = book3d.querySelector<HTMLElement>('.cover-shadow');

    book3d.dataset.step = '1';
    built.pgL.style.visibility = 'visible';
    built.pgL.style.transform = 'translateZ(0.2px)';
    built.pgR.style.visibility = 'hidden';
    built.pgR.style.transform = 'translateZ(-2px)';

    if (!coverEl || isReducedMotion()) {
      if (coverEl) coverEl.style.display = 'none';
      if (covShadow) covShadow.style.display = 'none';
      const fold = book3d.querySelector('.fold');
      if (fold) {
        book3d.insertBefore(built.pgL, fold);
        book3d.insertBefore(built.pgR, fold);
      } else {
        book3d.appendChild(built.pgL);
        book3d.appendChild(built.pgR);
      }
      currentRoots = built.roots;
      setOpenSpreadStands(built.standsL);
      dispatch({ type: 'setScreen', screen: 'book' });
      releasePhonePage(built);
      dispatch({ type: 'setMobileStep', step: 1 });
      isTurning = false;
      return;
    }

    const leaf = coverEl;
    const underPage = built.pgL;
    book3d.insertBefore(built.pgR, leaf);
    book3d.insertBefore(built.pgL, leaf);

    leaf.classList.add('leaf');
    leaf.classList.remove('past');
    leaf.style.setProperty('--lz', '0.8px');
    leaf.style.setProperty('--a', '0deg');
    leaf.style.transformOrigin = '0 50%';

    const underShade = underPage.querySelector<HTMLElement>('.turnshade');
    const dummyDest = document.createElement('div');
    const dummyBack = document.createElement('div');

    const turn: ActiveTurn = {
      dir: 1,
      leaf,
      dest: dummyDest,
      underPage,
      backPage: dummyBack,
      underShade,
      destShade: null,
      leavingStands: [],
      stayStands: [],
      underStands: built.standsL,
      backStands: [],
      turnAge: 0,
      onLand: () => {
        leaf.style.display = 'none';
        if (covShadow) covShadow.style.display = 'none';
        if (underShade) underShade.style.opacity = '0';
        setOpenSpreadStands(built.standsL);
        currentRoots = built.roots;
        dispatch({ type: 'setScreen', screen: 'book' });
        releasePhonePage(built);
        dispatch({ type: 'setMobileStep', step: 1 });
        isTurning = false;
      },
    };
    startTurnMotion(turn);
    return;
  }

  if (isReducedMotion()) {
    const allNewStands = [...built.standsL, ...built.standsR];
    allNewStands.forEach((s) => {
      s.t = s.rest;
      s.v = 0;
      s.settled = true;
      s.element.style.setProperty('--up', s.rest.toFixed(4));
      if (s.cast) s.cast.style.setProperty('--up', s.rest.toFixed(4));
    });

    const fold = book3d.querySelector('.fold');
    built.pgL.style.opacity = '0';
    built.pgR.style.opacity = '0';
    built.pgL.style.transition = 'opacity 150ms ease';
    built.pgR.style.transition = 'opacity 150ms ease';

    if (fold) {
      book3d.insertBefore(built.pgL, fold);
      book3d.insertBefore(built.pgR, fold);
    } else {
      book3d.appendChild(built.pgL);
      book3d.appendChild(built.pgR);
    }

    currentRoots = built.roots;
    setOpenSpreadStands(allNewStands);
    dispatch({ type: 'setScreen', screen: 'book' });

    requestAnimationFrame(() => {
      built.pgL.style.opacity = '1';
      built.pgR.style.opacity = '1';
    });

    setTimeout(() => {
      built.pgL.style.transition = '';
      built.pgR.style.transition = '';
      built.pgL.style.opacity = '';
      built.pgR.style.opacity = '';
      isTurning = false;
    }, 150);

    return;
  }

  const coverEl = book3d.querySelector<HTMLElement>('.book-cover');
  if (!coverEl) {
    dispatch({ type: 'setScreen', screen: 'book' });
    isTurning = false;
    return;
  }

  book3d.classList.add('book-opening');

  const leaf = coverEl;
  const underPage = built.pgR;
  const backPage = built.pgL;
  const underStands = built.standsR;
  const backStands = built.standsL;

  // Insert under page just before leaf
  book3d.insertBefore(underPage, leaf);

  // Mount back page inside leaf
  backPage.classList.add('backpage');
  backPage.style.left = '0';
  backPage.style.right = 'auto';
  backPage.style.top = '0';
  backPage.style.bottom = '0';
  backPage.style.transformOrigin = '50% 50%';
  backPage.style.transform = 'translateZ(-1.6px) rotateY(180deg)';
  leaf.appendChild(backPage);

  leaf.classList.add('leaf');
  leaf.classList.remove('past');
  leaf.style.setProperty('--lz', '0.8px');
  leaf.style.setProperty('--a', '0deg');

  const underShade = underPage.querySelector<HTMLElement>('.turnshade');
  const dummyDest = document.createElement('div');

  const turn: ActiveTurn = {
    dir: 1,
    leaf,
    dest: dummyDest,
    underPage,
    backPage,
    underShade,
    destShade: null,
    leavingStands: [],
    stayStands: [],
    underStands,
    backStands,
    turnAge: 0,
    onLand: () => {
      backPage.classList.remove('backpage');
      backPage.style.left = '';
      backPage.style.right = '';
      backPage.style.top = '';
      backPage.style.bottom = '';
      backPage.style.transformOrigin = '';
      backPage.style.transform = '';
      backPage.style.removeProperty('--a');
      backPage.style.removeProperty('--lz');

      const fold = book3d.querySelector('.fold');
      if (fold) {
        book3d.insertBefore(backPage, fold);
        book3d.insertBefore(underPage, fold);
      } else {
        book3d.appendChild(backPage);
        book3d.appendChild(underPage);
      }

      leaf.style.display = 'none';

      const covShadow = book3d.querySelector<HTMLElement>('.cover-shadow');
      if (covShadow) covShadow.style.display = 'none';

      book3d.classList.remove('book-opening');

      if (underShade) underShade.style.opacity = '0';

      const openStands = [...underStands, ...backStands];
      setOpenSpreadStands(openStands);
      currentRoots = built.roots;

      dispatch({ type: 'setScreen', screen: 'book' });
      isTurning = false;
    },
  };

  startTurnMotion(turn);
}

/**
 * Step forward on mobile: step 1 -> step 2 of same spread, or step 2 -> next spread step 1.
 */
export function stepNext(): void {
  if (!getStoreState) return;
  const state = getStoreState();
  if (state.screen === 'cover') {
    openBook();
    return;
  }
  const currentStep = state.mobileStep || 1;
  if (currentStep === 1) {
    go({ mobileStep: 2 });
  } else {
    const isLastChapter = state.chapter === READY[READY.length - 1];
    if (isLastChapter && state.spread === 4) {
      go({ spread: 5, mobileStep: 1 });
      return;
    }
    const allowed: SpreadIndex[] = hasPair(state.chapter)
      ? [0, 1, 2, 3, 4]
      : [0, 1, 2, 4];
    const next = allowed.find((s) => s > state.spread);
    if (next !== undefined) {
      go({ spread: next, mobileStep: 1 });
    }
  }
}

/**
 * Step backward on mobile: step 2 -> step 1 of same spread, or step 1 -> prev spread step 2.
 */
export function stepPrev(): void {
  if (!getStoreState) return;
  const state = getStoreState();
  if (state.screen === 'cover') {
    return;
  }
  const currentStep = state.mobileStep || 1;
  if (currentStep === 2) {
    go({ mobileStep: 1 });
  } else {
    if (state.spread === 5) {
      go({ spread: 4, mobileStep: 2 });
      return;
    }
    const allowed: SpreadIndex[] = hasPair(state.chapter)
      ? [0, 1, 2, 3, 4]
      : [0, 1, 2, 4];
    const prev = [...allowed].reverse().find((s) => s < state.spread);
    if (prev !== undefined) {
      go({ spread: prev, mobileStep: 2 });
    }
  }
}

/**
 * Navigate to next spread.
 */
export function goNext(): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    stepNext();
    return;
  }
  if (!getStoreState) return;
  const state = getStoreState();
  if (state.screen === 'cover') {
    openBook();
    return;
  }
  const isLastChapter = state.chapter === READY[READY.length - 1];
  if (isLastChapter && state.spread === 4) {
    go({ spread: 5 });
    return;
  }
  const allowed: SpreadIndex[] = hasPair(state.chapter)
    ? [0, 1, 2, 3, 4]
    : [0, 1, 2, 4];
  const next = allowed.find((s) => s > state.spread);
  if (next !== undefined) {
    go({ spread: next });
  }
}

/**
 * Navigate to previous spread.
 */
export function goPrev(): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    stepPrev();
    return;
  }
  if (!getStoreState) return;
  const state = getStoreState();
  if (state.screen === 'cover') {
    return;
  }
  if (state.spread === 5) {
    go({ spread: 4 });
    return;
  }
  const allowed: SpreadIndex[] = hasPair(state.chapter)
    ? [0, 1, 2, 3, 4]
    : [0, 1, 2, 4];
  const prev = [...allowed].reverse().find((s) => s < state.spread);
  if (prev !== undefined) {
    go({ spread: prev });
  }
}
