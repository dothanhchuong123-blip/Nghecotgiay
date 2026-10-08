import { useEffect, useRef } from 'react';

/**
 * Traps focus inside the returned containerRef while active,
 * handles Escape key to close, and restores focus to the previously
 * focused element when closed.
 */
export function useFocusTrap(
  isOpen: boolean,
  onClose?: () => void,
  initialFocusSelector?: string
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    const getFocusables = (): HTMLElement[] => {
      if (!container) return [];
      const nodes = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    };

    const timer = setTimeout(() => {
      if (initialFocusSelector && container) {
        const el = container.querySelector<HTMLElement>(initialFocusSelector);
        if (el) {
          el.focus();
          return;
        }
      }
      const focusables = getFocusables();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    }, 15);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          !container.contains(document.activeElement)
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (
          document.activeElement === last ||
          !container.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        try {
          previousActiveElement.current.focus();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, onClose, initialFocusSelector]);

  return containerRef;
}
