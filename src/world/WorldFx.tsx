import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, CollageLevel } from '../state';
import { worldOf, STREET_SMALL } from './worlds';
import { thump, tape, shutter } from '../audio/paper';
import { isReducedMotion } from '../paper/motion';
import Neon from './Neon';

const CHUAN_WORDS = ['CHUẨN', 'TINH TẾ', 'ĐOAN TRANG'] as const;
const GIAO_THOA_WORDS = ['CHILL!', 'XINH XỈU', 'HỢP GU'] as const;
const DUONG_PHO_WORDS = ['Lên phố!', 'Đỉnh nóc!', 'Cháy phố!', 'Xịn xò!'] as const;

interface ScrapData {
  dx: number;
  dy: number;
  rot: number;
  color: string;
  w: number;
  h: number;
}

interface FxData {
  key: number;
  level: CollageLevel;
  wall: string;
  word: string;
  tone?: 'pink' | 'lime';
  scraps?: ScrapData[];
}

const SHUTTER_STICKERS = [
  { left: '18%', top: '26%', tilt: -7, delay: 420 },
  { left: '80%', top: '22%', tilt: 8, delay: 475 },
  { left: '12%', top: '70%', tilt: -10, delay: 530 },
  { left: '86%', top: '72%', tilt: 6, delay: 585 },
  { left: '30%', top: '82%', tilt: -5, delay: 640 },
  { left: '70%', top: '84%', tilt: 9, delay: 695 },
];

export default function WorldFx() {
  const { state } = useStore();
  const collage = state.collage;
  const prevCollageRef = useRef<CollageLevel>(collage);
  const isFirstMountRef = useRef(true);
  const counterRef = useRef(0);
  const [activeFx, setActiveFx] = useState<FxData | null>(null);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevCollageRef.current = collage;
      return;
    }

    if (prevCollageRef.current === collage) {
      return;
    }

    prevCollageRef.current = collage;

    // Play corresponding sound on world change
    if (collage === 3) {
      shutter();
    } else if (collage === 2) {
      tape();
    } else if (collage === 1) {
      thump();
    }

    // With reduced motion, stop there
    if (isReducedMotion()) {
      return;
    }

    counterRef.current += 1;
    const currentKey = counterRef.current;
    const world = worldOf(collage);

    let word = '';
    let tone: 'pink' | 'lime' | undefined = undefined;
    let scraps: ScrapData[] | undefined = undefined;

    if (collage === 1) {
      word = CHUAN_WORDS[Math.floor(Math.random() * CHUAN_WORDS.length)];
    } else if (collage === 2) {
      word = GIAO_THOA_WORDS[Math.floor(Math.random() * GIAO_THOA_WORDS.length)];
      // 22 small paper scraps that burst out at ~20%
      const SCRAP_COLORS = [
        '#FDE047',
        '#F472B6',
        '#BAE6FD',
        '#86EFAC',
        '#FDBA74',
        '#C4B5FD',
        '#FFFFFF',
        '#FCD34D',
      ];
      scraps = Array.from({ length: 22 }, (_, idx) => {
        const angle = (idx * (360 / 22) + (Math.random() * 16 - 8)) * (Math.PI / 180);
        const distance = 140 + Math.random() * 260;
        return {
          dx: Math.round(Math.cos(angle) * distance),
          dy: Math.round(Math.sin(angle) * distance),
          rot: Math.round((Math.random() - 0.5) * 540),
          color: SCRAP_COLORS[idx % SCRAP_COLORS.length],
          w: Math.round(9 + Math.random() * 9),
          h: Math.round(7 + Math.random() * 8),
        };
      });
    } else if (collage === 3) {
      word = DUONG_PHO_WORDS[Math.floor(Math.random() * DUONG_PHO_WORDS.length)];
      tone = Math.random() > 0.5 ? 'pink' : 'lime';
    }

    setActiveFx({
      key: currentKey,
      level: collage,
      wall: world.wall,
      word,
      tone,
      scraps,
    });

    const timer = setTimeout(() => {
      setActiveFx((prev) => (prev?.key === currentKey ? null : prev));
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [collage]);

  if (!activeFx || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div key={activeFx.key} className="wfx-root" aria-hidden="true">
      {activeFx.level === 3 ? (
        /* Đường phố: Cửa cuốn */
        <div className="wfx-shutter-door">
          {/* Neon Word */}
          <div className="wfx-neon-word">
            <Neon text={activeFx.word} size={88} tone={activeFx.tone || 'pink'} />
          </div>

          {/* 6 STREET_SMALL stickers */}
          {SHUTTER_STICKERS.map((st, i) => {
            const stickerSrc = STREET_SMALL[i % STREET_SMALL.length];
            return (
              <img
                key={i}
                src={stickerSrc}
                alt=""
                className="wfx-shutter-sticker"
                style={{
                  left: st.left,
                  top: st.top,
                  animationDelay: `${st.delay}ms`,
                  ['--tilt' as string]: `${st.tilt}deg`,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.warn(`[art missing] ${stickerSrc}`);
                }}
              />
            );
          })}

          {/* Bottom Bar: 26px, grey metal, two handles */}
          <div className="wfx-bottom-bar">
            <span className="wfx-handle" />
            <span className="wfx-handle" />
          </div>
        </div>
      ) : (
        /* Chuẩn (1) & Giao thoa (2): Hai cánh cửa .wfx-half.l / .r */
        <div
          className={`wfx-doors ${
            activeFx.level === 1 ? 'wfx-chuan' : 'wfx-giao-thoa'
          }`}
        >
          {/* Left Door */}
          <div className="wfx-half l">
            <div
              className="wfx-img"
              style={{ backgroundImage: `url(${activeFx.wall})` }}
            />
          </div>

          {/* Right Door */}
          <div className="wfx-half r">
            <div
              className="wfx-img"
              style={{ backgroundImage: `url(${activeFx.wall})` }}
            />
          </div>

          {/* Giao thoa: Washi tape strip down the seam (64px wide) */}
          {activeFx.level === 2 && <div className="wfx-seam-tape" />}

          {/* Words */}
          {activeFx.level === 1 ? (
            /* Chuẩn: Red seal word in the middle */
            <div className="wfx-seal-word">{activeFx.word}</div>
          ) : (
            /* Giao thoa: Yellow sticky note with small washi tape */
            <div className="wfx-sticky-note">
              <span className="wfx-sticky-tape" />
              {activeFx.word}
            </div>
          )}

          {/* Giao thoa: 22 small paper scraps fly out at ~20% */}
          {activeFx.level === 2 && activeFx.scraps && (
            <div className="wfx-scraps-container">
              {activeFx.scraps.map((sc, idx) => (
                <span
                  key={idx}
                  className="wfx-scrap"
                  style={{
                    backgroundColor: sc.color,
                    width: `${sc.w}px`,
                    height: `${sc.h}px`,
                    ['--dx' as string]: `${sc.dx}px`,
                    ['--dy' as string]: `${sc.dy}px`,
                    ['--rot' as string]: `${sc.rot}deg`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
