import { useEffect } from 'react';
import { COPY, SCENES, NAM_OF } from '../data';
import { useStore, Side } from '../state';
import { go } from './turn';
import { useSound, toggleSound } from '../audio/paper';
import { openGuide } from '../guide/Guide';
import './topbar.css';

export interface TopBarProps {
  side?: 'nu' | 'nam';
  chapter?: string;
  onSideChange?: (side: 'nu' | 'nam') => void;
  onReplay?: () => void;
  onSoundToggle?: () => void;
  onOpenGuide?: () => void;
}

export default function TopBar({
  side: propSide,
  chapter: propChapter,
  onSideChange,
  onReplay,
  onSoundToggle,
  onOpenGuide,
}: TopBarProps) {
  const { state } = useStore();
  const currentSide: Side = propSide ?? state.side;
  const currentChapter = propChapter ?? state.chapter;

  const scene = (SCENES as Record<string, { full?: string[] } | undefined>)[currentChapter];
  const fullSides = scene?.full || [];
  const isSingleSide = fullSides.length === 1;
  const namOfGarment = NAM_OF[currentChapter];
  const hasNamOf = namOfGarment && namOfGarment !== currentChapter;
  const isLocked = isSingleSide && !hasNamOf;
  const lockedSide: Side = isLocked ? (fullSides[0] as Side) : currentSide;

  useEffect(() => {
    if (isLocked && currentSide !== lockedSide) {
      if (onSideChange) {
        onSideChange(lockedSide);
      } else {
        go({ side: lockedSide });
      }
    }
  }, [isLocked, currentSide, lockedSide, onSideChange]);

  const handleSideClick = (newSide: 'nu' | 'nam') => {
    if (isLocked) return;
    if (currentSide === newSide) return;
    if (onSideChange) {
      onSideChange(newSide);
    } else {
      go({ side: newSide });
    }
  };

  const sideName =
    lockedSide === 'nam'
      ? COPY.side.nam
      : COPY.side.nu;
  const chipText = COPY.side.only.replace('{side}', sideName);

  const handleReplayClick = () => {
    if (onReplay) {
      onReplay();
    } else {
      go({ force: true });
    }
  };

  const soundEnabled = useSound();

  const handleSoundClick = () => {
    if (onSoundToggle) {
      onSoundToggle();
    } else {
      toggleSound();
    }
  };

  const handleGuideClick = () => {
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      openGuide();
    }
  };

  return (
    <header className="topbar">
      {/* Left branding */}
      <div className="topbar-left">
        <img
          src="/icons/giay-96.png"
          alt=""
          className="topbar-seal"
          width="44"
          height="44"
        />
        <div className="topbar-brand">
          <span className="topbar-app-name">{COPY.app.name}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        {/* Side switch */}
        <div className="topbar-side-group">
          <div className="topbar-side-switch" role="group" aria-label={COPY.side.label}>
            <button
              type="button"
              className={`topbar-side-btn${currentSide === 'nu' ? ' topbar-side-btn-active' : ''}${isLocked && lockedSide !== 'nu' ? ' topbar-side-btn-disabled' : ''}`}
              onClick={() => handleSideClick('nu')}
              disabled={isLocked && lockedSide !== 'nu'}
              aria-pressed={currentSide === 'nu'}
            >
              {COPY.side.nu}
            </button>
            <button
              type="button"
              className={`topbar-side-btn${currentSide === 'nam' ? ' topbar-side-btn-active' : ''}${isLocked && lockedSide !== 'nam' ? ' topbar-side-btn-disabled' : ''}`}
              onClick={() => handleSideClick('nam')}
              disabled={isLocked && lockedSide !== 'nam'}
              aria-pressed={currentSide === 'nam'}
            >
              {COPY.side.nam}
            </button>
          </div>
          {isLocked && (
            <div className="topbar-side-chip" role="status">
              {chipText}
            </div>
          )}
        </div>

        {/* Guide button */}
        <button
          type="button"
          className="topbar-guide-btn"
          aria-label="Hướng dẫn"
          onClick={handleGuideClick}
        >
          ?
        </button>

        {/* Sound button */}
        <button
          type="button"
          className="topbar-sound-btn"
          aria-label={COPY.settings.sound}
          aria-pressed={soundEnabled}
          onClick={handleSoundClick}
        >
          ♪
        </button>

        {/* Replay button */}
        <button
          type="button"
          className="topbar-replay-btn"
          onClick={handleReplayClick}
          aria-label={COPY.meet.replay}
        >
          <span className="topbar-replay-icon">↻</span>
          <span className="topbar-replay-label">{COPY.meet.replay}</span>
        </button>
      </div>
    </header>
  );
}
