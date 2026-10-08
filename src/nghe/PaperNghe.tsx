import React, { useEffect, useRef, useState } from 'react';
import { STAGE } from '../data';
import { isReducedMotion } from '../paper/motion';
import { onBookMotionTick, isTurnRunning } from '../book/BookMotion';
import { isTalking } from './say';
import './nghe.css';

interface RigPart {
  id: 'tail' | 'body' | 'head';
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  holes: [number, number][];
  pivot: [number, number] | null;
}

interface RigData {
  canvas: [number, number];
  parts: RigPart[];
}

export interface PaperNgheProps {
  onChatOpen?: () => void;
}

export default function PaperNghe({ onChatOpen }: PaperNgheProps) {
  const [rig, setRig] = useState<RigData | null>(null);
  const [hasError, setHasError] = useState(false);

  const headRef = useRef<HTMLDivElement | null>(null);
  const tailRef = useRef<HTMLDivElement | null>(null);

  // Fetch /book/nghe/rig/rig.json
  useEffect(() => {
    let active = true;

    fetch('/book/nghe/rig/rig.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RigData) => {
        if (!active) return;
        if (
          !data ||
          !Array.isArray(data.canvas) ||
          data.canvas.length !== 2 ||
          !Array.isArray(data.parts)
        ) {
          throw new Error('Invalid rig structure');
        }
        setRig(data);
      })
      .catch((err) => {
        if (!active) return;
        console.log(`[art missing] /book/nghe/rig/rig.json: ${err?.message || err}`);
        setHasError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Motion subscription to book's animation loop
  useEffect(() => {
    if (!rig || hasError) return;

    const unsubscribe = onBookMotionTick((t: number) => {
      if (isReducedMotion()) {
        if (headRef.current) headRef.current.style.transform = 'none';
        if (tailRef.current) tailRef.current.style.transform = 'none';
        return;
      }

      // Head motion: while talking, rotate(round(sin(t·9)·2)·2.5 deg); otherwise rotate(sin(t·1.3)·1.5 deg)
      if (headRef.current) {
        let headDeg = 0;
        if (isTalking()) {
          headDeg = Math.round(Math.sin(t * 9) * 2) * 2.5;
        } else {
          headDeg = Math.sin(t * 1.3) * 1.5;
        }
        headRef.current.style.transform = `rotate(${headDeg}deg)`;
      }

      // Tail motion: during a page turn sin(t·7)·12 deg; otherwise rotate(sin(t·2.2)·5 deg)
      if (tailRef.current) {
        let tailDeg = 0;
        if (isTurnRunning()) {
          tailDeg = Math.sin(t * 7) * 12;
        } else {
          tailDeg = Math.sin(t * 2.2) * 5;
        }
        tailRef.current.style.transform = `rotate(${tailDeg}deg)`;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [rig, hasError]);

  const handleClick = () => {
    // 5. Clicking Nghê opens the chat (prompt 32; until then it does nothing)
    if (onChatOpen) {
      onChatOpen();
    }
  };

  const handleImageError = (file: string) => {
    console.log(`[art missing] /book/nghe/rig/${file}`);
    setHasError(true);
  };

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const puppetHeight = isMobile ? 110 : 170;

  // Fallback to flat picture if rig or any part missing
  if (hasError || !rig) {
    return (
      <button
        type="button"
        className="paper-nghe-fallback"
        aria-label="Nghê"
        onClick={handleClick}
        style={{ height: `${puppetHeight}px` }}
      >
        <img src={STAGE.paper.nghe} alt="Nghê" />
      </button>
    );
  }

  const [cw, ch] = rig.canvas;
  const k = puppetHeight / ch;
  const puppetWidth = Math.round(cw * k * 100) / 100;
  const pinScale = puppetHeight / 170;

  // Parts drawn in order: tail, body, head
  const tail = rig.parts.find((p) => p.id === 'tail');
  const body = rig.parts.find((p) => p.id === 'body');
  const head = rig.parts.find((p) => p.id === 'head');

  const orderedParts = [tail, body, head].filter((p): p is RigPart => Boolean(p));

  return (
    <button
      type="button"
      className="paper-nghe-puppet"
      aria-label="Nghê"
      onClick={handleClick}
      style={{
        width: `${puppetWidth}px`,
        height: `${puppetHeight}px`,
      }}
    >
      {orderedParts.map((part) => {
        const left = part.x * k;
        const top = part.y * k;
        const width = part.w * k;
        const height = part.h * k;

        let originStr = '50% 50%';
        if (part.pivot) {
          const ox = ((part.pivot[0] - part.x) / part.w) * 100;
          const oy = ((part.pivot[1] - part.y) / part.h) * 100;
          originStr = `${ox.toFixed(2)}% ${oy.toFixed(2)}%`;
        }

        const isHead = part.id === 'head';
        const isTail = part.id === 'tail';
        const isBody = part.id === 'body';

        return (
          <div
            key={part.id}
            ref={isHead ? headRef : isTail ? tailRef : undefined}
            className="paper-nghe-part-wrapper"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              transformOrigin: originStr,
              zIndex: isTail ? 1 : isBody ? 2 : 3,
            }}
          >
            <img
              src={`/book/nghe/rig/${part.file}`}
              alt=""
              className="paper-nghe-part-img"
              onError={() => handleImageError(part.file)}
            />

            {/* split pin at head's pivot that moves with the head */}
            {isHead && part.pivot ? (
              <img
                src="/book/mech/split-pin.webp"
                alt=""
                className="paper-nghe-split-pin"
                style={{
                  width: `${13 * pinScale}px`,
                  height: `${13 * pinScale}px`,
                  left: `${(part.pivot[0] - part.x) * k - 6.5 * pinScale}px`,
                  top: `${(part.pivot[1] - part.y) * k - 6.5 * pinScale}px`,
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* split pins at each of the body's holes (on top of body) */}
      {body
        ? body.holes.slice(2).map(([hx, hy], idx) => (
            <img
              key={`body-hole-${idx}`}
              src="/book/mech/split-pin.webp"
              alt=""
              className="paper-nghe-split-pin"
              style={{
                width: `${12 * pinScale}px`,
                height: `${12 * pinScale}px`,
                left: `${hx * k - 6 * pinScale}px`,
                top: `${hy * k - 6 * pinScale}px`,
                zIndex: 4,
              }}
            />
          ))
        : null}
    </button>
  );
}
