import React, { useEffect, useState } from 'react';
import { useStore } from '../state';
import { currentPaper } from './paper';
import './frame.css';

interface FrameState {
  isDesktop: boolean;
  scale: number;
  left: number;
  top: number;
}

function calculateFrame(): FrameState {
  if (typeof window === 'undefined') {
    return { isDesktop: true, scale: 1, left: 0, top: 0 };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isDesktop = w >= 768;

  if (!isDesktop) {
    return { isDesktop: false, scale: 1, left: 0, top: 0 };
  }

  const s = Math.min(w / 1440, h / 900);
  const left = (w - 1440 * s) / 2;
  const top = (h - 900 * s) / 2;

  return { isDesktop: true, scale: s, left, top };
}

export default function DesignFrame({ children }: { children?: React.ReactNode }) {
  const [frame, setFrame] = useState<FrameState>(calculateFrame);
  const { state } = useStore();
  const P = currentPaper(state);

  useEffect(() => {
    function handleResize() {
      setFrame(calculateFrame());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tone = P.light ? 'light' : 'dark';

  return (
    <div
      className="design-frame-viewport"
      data-tone={tone}
      style={{
        ['--desk' as string]: P.base,
        backgroundColor: P.base,
      }}
    >
      {frame.isDesktop ? (
        <div
          className="design-frame-canvas"
          data-tone={tone}
          style={{
            transform: `scale(${frame.scale})`,
            left: `${frame.left}px`,
            top: `${frame.top}px`,
            backgroundColor: P.base,
          }}
        >
          {children}
        </div>
      ) : (
        <div
          className="design-frame-mobile"
          data-tone={tone}
          style={{ backgroundColor: P.base }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
