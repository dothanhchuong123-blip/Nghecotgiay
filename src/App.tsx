import { lazy, Suspense, useEffect, useLayoutEffect, useReducer, useState } from 'react';
import DesignFrame from './book/DesignFrame';
import TopBar from './book/TopBar';
import ChapterTabs from './book/ChapterTabs';
import Book from './book/Book';
import MobileBottomBar from './book/MobileBottomBar';
import MobileMeet from './mobile/MobileMeet';
import { useLayoutSwitch } from './boot/useLayoutSwitch';
import MobileMix from './mobile/MobileMix';
import { MobileParts, MobileStory, MobileCompare, MobileLast } from './mobile/MobileSpreads';
import PaperTag from './book/PaperTag';
import Today from './today/Today';
import WorldLever from './world/WorldLever';
import WorldFx from './world/WorldFx';
import Guide from './guide/Guide';
import {
  isTiltPermissionNeeded,
  requestTiltPermission,
} from './book/BookMotion';
import { go, goNext, goPrev } from './book/turn';
import Chip from './paper/Chip';
import NgheDesk from './nghe/NgheDesk';
import {
  GARMENTS,
  COLORS,
  MODERN_PIECES,
  PRESETS,
  READY,
  COPY,
  loadManifest,
  HANG_TRONG,
} from './data';
import { appReducer, initialState, StoreContext, setSide, liveStore } from './state';

const ArtCheck = lazy(() => import('./dev/ArtCheck'));
const Kit = lazy(() => import('./dev/Kit'));
const EngineDev = lazy(() => import('./dev/EngineDev'));
const DollDev = lazy(() => import('./dev/DollDev'));
const DevMenu = lazy(() => import('./dev/DevMenu'));

// Starter: an empty screen. Everything else is built in AI Studio from the owner's prompts.
export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Pages live in their own React roots: hand them every new state
  useLayoutEffect(() => {
    liveStore.set(state);
  }, [state]);

  // Log the store on every change
  useEffect(() => {
    console.log('[store]', state);
  }, [state]);

  // Initial asset counts
  useEffect(() => {
    console.log(
      `garments: ${GARMENTS.length}, colors: ${COLORS.length}, modern pieces: ${MODERN_PIECES.length}, presets: ${PRESETS.length}, ready chapters: ${READY.length}`
    );
    console.log(
      `Hàng Trống papers: ${Object.keys(HANG_TRONG.papers).length}, gấm patterns: ${HANG_TRONG.gam.length}, weaving strips: ${HANG_TRONG.weave.strips.length}`
    );
    loadManifest()
      .then((manifest) => {
        console.log(`doll pieces: ${manifest.pieces.length}`);
      })
      .catch((err) => {
        console.error('Failed to load manifest on start:', err);
      });
  }, []);

  // Keyboard navigation: ArrowRight / ArrowLeft
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isPhone = useLayoutSwitch();
  const [showTiltPrompt, setShowTiltPrompt] = useState(false);

  useEffect(() => {
    const isCoarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;
    if (isTiltPermissionNeeded() && isCoarse) {
      setShowTiltPrompt(true);
      const t = setTimeout(() => setShowTiltPrompt(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleTiltClick = async () => {
    const granted = await requestTiltPermission();
    if (granted || !isTiltPermissionNeeded()) {
      setShowTiltPrompt(false);
    }
  };

  const dev =
    typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('dev')
      : null;

  let content = (
    <DesignFrame key={isPhone ? 'phone' : 'desk'}>
      <TopBar
        side={state.side}
        onSideChange={(s) => go({ side: s })}
        onReplay={() => go({ force: true })}
      />
      <Book />
      {state.screen === 'book' && <ChapterTabs />}
      <NgheDesk />
      <PaperTag />
      <Today />
      <WorldLever />
      <WorldFx />
      <Guide />
      {state.screen === 'book' && isPhone && state.spread === 0 && <MobileMeet />}
      {state.screen === 'book' && isPhone && state.spread === 4 && <MobileMix />}
      {state.screen === 'book' && isPhone && state.spread === 1 && <MobileParts />}
      {state.screen === 'book' && isPhone && state.spread === 2 && <MobileStory />}
      {state.screen === 'book' && isPhone && state.spread === 3 && <MobileCompare />}
      {state.screen === 'book' && isPhone && state.spread === 5 && <MobileLast />}
      {state.screen === 'book' && <MobileBottomBar />}
      {showTiltPrompt ? (
        <div className="tilt-bubble-wrap">
          <Chip onClick={handleTiltClick}>
            {COPY.system.tiltAsk}
          </Chip>
        </div>
      ) : null}
    </DesignFrame>
  );

  if (dev === 'art') {
    content = <ArtCheck />;
  } else if (dev === 'kit') {
    content = <Kit />;
  } else if (dev === 'engine') {
    content = <EngineDev />;
  } else if (dev === 'doll') {
    content = <DollDev />;
  } else if (dev && dev !== 'app') {
    content = <div className="dev-not-built">{dev}: not built yet</div>;
  }

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <Suspense fallback={null}>{content}</Suspense>
      <Suspense fallback={null}>
        <DevMenu />
      </Suspense>
    </StoreContext.Provider>
  );
}
