import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../state';
import './guide.css';

export interface GuideStep {
  sel: string;
  pose: 'hello' | 'point' | 'sticker' | 'wave' | 'brush' | 'joy' | 'camera';
  title: string;
  text: string;
}

export const COVER_STEPS: GuideStep[] = [
  {
    sel: '.book-cover .cover-band',
    pose: 'hello',
    title: 'Chào bạn, mình là Nghê!',
    text: 'Đây là sách nổi Việt phục. Bấm “Phối ngay” để vào thẳng phòng phối đồ, hoặc “Mở sách” để xem áo trước.',
  },
  {
    sel: '.lich-wall-pad',
    pose: 'point',
    title: 'Lịch hôm nay',
    text: 'Tờ lịch trên tường biết thời tiết và ngày lễ. Bấm vào là Nghê chọn sẵn một bộ cho hôm nay.',
  },
];

export const BOOK_STEPS: GuideStep[] = [
  {
    sel: '.chapter-tabs',
    pose: 'point',
    title: 'Chọn một chiếc áo',
    text: 'Mỗi thẻ bên phải là một chiếc áo: giao lĩnh, ngũ thân, áo dài… Bấm để mở chương của nó.',
  },
  {
    sel: '.index-tab.is-mix',
    pose: 'sticker',
    title: 'Phối đồ ở đây',
    text: 'Thẻ vàng “Phối đồ” là phần chính: mặc thử, dán sticker, rồi in thẻ khoe bạn bè.',
  },
];

export const MIX_STEPS: GuideStep[] = [
  {
    sel: '.world-lever',
    pose: 'wave',
    title: 'Ba thế giới',
    text: 'Gạt cần: Chuẩn cổ phục, Giao thoa, Đường phố. Bộ đồ, căn phòng và Nghê đều đổi theo!',
  },
  {
    sel: '.mix-gu-tabs',
    pose: 'point',
    title: 'Bước 1 · Chọn gu',
    text: 'Chọn một gu, tờ sticker chỉ còn các món hợp gu đó. “Tủ chung” là tất cả.',
  },
  {
    sel: '.mix-stickers-scroll',
    pose: 'sticker',
    title: 'Bước 2 · Dán sticker',
    text: 'Bấm một món, nó bay lên búp bê. Bấm lần nữa để cởi ra. Kéo xuống để xem thêm.',
  },
  {
    sel: '.mix-colors-row',
    pose: 'brush',
    title: 'Bước 3 · Đổi màu',
    text: 'Chấm màu đổi màu áo. Màu đầu tiên là màu truyền thống của chiếc áo này.',
  },
  {
    sel: '.mix-patch-row',
    pose: 'joy',
    title: 'Huy hiệu',
    text: 'Dán tối đa 4 huy hiệu lên áo, kéo để đổi chỗ. Mỗi cái là một hình dân gian Việt.',
  },
  {
    sel: '.mix-right-page .st:last-of-type .mix-action-btn',
    pose: 'camera',
    title: 'Bước 4 · Khoe',
    text: '“In thẻ khoe” in ra một tấm thẻ theo thế giới bạn đang ở. Lưu về và đăng thôi!',
  },
];

const openListeners = new Set<(step?: number) => void>();

const GUIDE_SEEN_KEY = 'nghe-guide-seen';

function isGuideSeen(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markGuideSeen(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GUIDE_SEEN_KEY, '1');
    }
  } catch {
    // Ignore storage errors
  }
}

export function openGuide(stepIndex: number = 0): void {
  openListeners.forEach((fn) => fn(stepIndex));
}

if (typeof window !== 'undefined') {
  (window as unknown as { openGuide?: typeof openGuide }).openGuide = openGuide;
}

function findElement(sel: string): HTMLElement | null {
  if (!sel) return null;
  try {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  } catch {
    // Ignore invalid selector
  }

  // Fallback specifically for the "In thẻ khoe" button if needed
  if (
    sel.includes('mix-action-btn') ||
    sel.includes('khoe') ||
    sel.includes('card')
  ) {
    const btns = Array.from(
      document.querySelectorAll<HTMLElement>('.mix-action-btn')
    );
    const match = btns.find(
      (b) => b.textContent && b.textContent.includes('In thẻ')
    );
    if (match) return match;
    if (btns.length > 0) return btns[btns.length - 1];
  }

  return null;
}

export default function Guide() {
  const { state } = useStore();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.has('noguide')) return false;
      return p.get('guide') === '1' || p.get('guide') === 'true';
    }
    return false;
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-start 1.6s after load on very first visit (never if ?noguide)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (p.has('noguide')) return;
    if (isGuideSeen()) return;

    const timer = window.setTimeout(() => {
      if (!isGuideSeen()) {
        setIsOpen(true);
      }
    }, 1600);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  // Pick step list by where you are
  const stepList = useMemo(() => {
    if (state.screen === 'cover') return COVER_STEPS;
    if (state.spread === 4) return MIX_STEPS;
    return BOOK_STEPS;
  }, [state.screen, state.spread]);

  // Restart at step 1 when the screen or spread changes
  const prevScreenRef = useRef(state.screen);
  const prevSpreadRef = useRef(state.spread);

  useEffect(() => {
    if (
      prevScreenRef.current !== state.screen ||
      prevSpreadRef.current !== state.spread
    ) {
      prevScreenRef.current = state.screen;
      prevSpreadRef.current = state.spread;
      setStepIndex(0);
    }
  }, [state.screen, state.spread]);

  // Listen to openGuide() calls
  useEffect(() => {
    const handleOpen = (targetStep?: number) => {
      setIsOpen(true);
      if (typeof targetStep === 'number') {
        setStepIndex(targetStep);
      } else {
        setStepIndex(0);
      }
    };
    openListeners.add(handleOpen);
    return () => {
      openListeners.delete(handleOpen);
    };
  }, []);

  const safeStepIndex = Math.max(0, Math.min(stepIndex, stepList.length - 1));
  const currentStep = stepList[safeStepIndex];

  // Measure element with getBoundingClientRect every 300 ms and on resize / scroll
  const measure = useCallback(() => {
    if (!currentStep) return;
    const el = findElement(currentStep.sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    measure();
    const intervalId = window.setInterval(measure, 300);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isOpen, measure]);

  const handleClose = useCallback(() => {
    markGuideSeen();
    setIsOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    if (safeStepIndex >= stepList.length - 1) {
      handleClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [safeStepIndex, stepList.length, handleClose]);

  const handlePrev = useCallback(() => {
    if (safeStepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }, [safeStepIndex]);

  // Keyboard navigation: Escape closes, ArrowLeft/Right moves
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight') {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable)
        ) {
          return;
        }
        if (safeStepIndex > 0) {
          e.preventDefault();
          e.stopPropagation();
          handlePrev();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, safeStepIndex, handleClose, handleNext, handlePrev]);

  // Compute card coordinates: sits beside the hole (left if hole is on right half),
  // or below / above when there's no room
  const cardPos = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const cardW = Math.min(340, vw - 32);
    const cardH = cardRef.current ? cardRef.current.offsetHeight : 230;
    const margin = 16;
    const gap = 16;

    if (!targetRect) {
      return {
        left: Math.max(margin, Math.round((vw - cardW) / 2)),
        top: Math.max(margin, Math.round((vh - cardH) / 2)),
      };
    }

    const holeLeft = targetRect.left - 10;
    const holeTop = targetRect.top - 10;
    const holeRight = targetRect.right + 10;
    const holeBottom = targetRect.bottom + 10;
    const holeCenterX = (holeLeft + holeRight) / 2;

    const isRightHalf = holeCenterX > vw / 2;

    if (isRightHalf) {
      // Try left of hole
      const candLeft = holeLeft - cardW - gap;
      if (candLeft >= margin) {
        const top = Math.max(margin, Math.min(vh - cardH - margin, holeTop));
        return { left: Math.round(candLeft), top: Math.round(top) };
      }
      // If left doesn't fit, check right
      const candRight = holeRight + gap;
      if (candRight + cardW <= vw - margin) {
        const top = Math.max(margin, Math.min(vh - cardH - margin, holeTop));
        return { left: Math.round(candRight), top: Math.round(top) };
      }
    } else {
      // Try right of hole
      const candRight = holeRight + gap;
      if (candRight + cardW <= vw - margin) {
        const top = Math.max(margin, Math.min(vh - cardH - margin, holeTop));
        return { left: Math.round(candRight), top: Math.round(top) };
      }
      // If right doesn't fit, check left
      const candLeft = holeLeft - cardW - gap;
      if (candLeft >= margin) {
        const top = Math.max(margin, Math.min(vh - cardH - margin, holeTop));
        return { left: Math.round(candLeft), top: Math.round(top) };
      }
    }

    // Try below hole
    const candBelow = holeBottom + gap;
    if (candBelow + cardH <= vh - margin) {
      const left = Math.max(
        margin,
        Math.min(vw - cardW - margin, holeLeft)
      );
      return { left: Math.round(left), top: Math.round(candBelow) };
    }

    // Try above hole
    const candAbove = holeTop - cardH - gap;
    if (candAbove >= margin) {
      const left = Math.max(
        margin,
        Math.min(vw - cardW - margin, holeLeft)
      );
      return { left: Math.round(left), top: Math.round(candAbove) };
    }

    // Center fallback
    return {
      left: Math.max(margin, Math.min(vw - cardW - margin, (vw - cardW) / 2)),
      top: Math.max(margin, Math.min(vh - cardH - margin, (vh - cardH) / 2)),
    };
  }, [targetRect]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const isLastStep = safeStepIndex === stepList.length - 1;

  return createPortal(
    <div
      className="guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn sử dụng"
    >
      {targetRect ? (
        <div
          className="guide-hole"
          style={{
            left: `${Math.round(targetRect.left - 10)}px`,
            top: `${Math.round(targetRect.top - 10)}px`,
            width: `${Math.round(targetRect.width + 20)}px`,
            height: `${Math.round(targetRect.height + 20)}px`,
          }}
        />
      ) : (
        <div className="guide-dim-full" aria-hidden="true" />
      )}

      <div
        ref={cardRef}
        key={`${safeStepIndex}-${currentStep.pose}`}
        className="guide-card"
        style={{
          left: `${cardPos.left}px`,
          top: `${cardPos.top}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={`/book/guide/${currentStep.pose}.webp`}
          alt=""
          className="guide-card-peek"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
            console.log(`[art missing] /book/guide/${currentStep.pose}.webp`);
          }}
        />

        <div className="guide-card-step">
          {`Bước ${safeStepIndex + 1}/${stepList.length}`}
        </div>

        <h2 className="guide-card-title">{currentStep.title}</h2>

        <p className="guide-card-text">{currentStep.text}</p>

        <div className="guide-card-bottom">
          <div
            className="guide-card-dots"
            role="tablist"
            aria-label="Các bước hướng dẫn"
          >
            {stepList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === safeStepIndex}
                aria-label={`Bước ${idx + 1}`}
                className={`guide-card-dot${idx === safeStepIndex ? ' is-active' : ''}`}
                onClick={() => setStepIndex(idx)}
              />
            ))}
          </div>

          <div className="guide-card-actions">
            <button
              type="button"
              className="guide-btn guide-btn-skip"
              onClick={handleClose}
            >
              Bỏ qua
            </button>

            <div className="guide-btn-group">
              {safeStepIndex > 0 && (
                <button
                  type="button"
                  className="guide-btn guide-btn-back"
                  onClick={handlePrev}
                  aria-label="Bước trước"
                >
                  ←
                </button>
              )}

              <button
                type="button"
                className="guide-btn guide-btn-next"
                onClick={handleNext}
              >
                {isLastStep ? 'Xong!' : 'Tiếp →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
