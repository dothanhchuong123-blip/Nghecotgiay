import { useEffect, useRef, useState } from 'react';
import { bootHide, bootProgress, bootShow, waitForScreen } from './boot';

export function useLayoutSwitch(): boolean {
  const [phone, setPhone] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const committedRef = useRef<boolean>(phone);
  const pendingRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const isFirstRef = useRef<boolean>(true);

  useEffect(() => {
    function handleResizeOrOrientation() {
      const newPhone = window.innerWidth < 768;
      if (newPhone === committedRef.current) {
        if (pendingRef.current) {
          if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          pendingRef.current = false;
          bootHide();
        }
      } else {
        if (!pendingRef.current) {
          bootShow('switch');
          pendingRef.current = true;
        }
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          pendingRef.current = false;
          committedRef.current = newPhone;
          setPhone(newPhone);
        }, 280);
      }
    }

    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);

    return () => {
      window.removeEventListener('resize', handleResizeOrOrientation);
      window.removeEventListener('orientationchange', handleResizeOrOrientation);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const first = isFirstRef.current;
    if (first) {
      isFirstRef.current = false;
      bootShow('start');
    }

    waitForScreen(bootProgress, first ? 9000 : 4000).then(() => {
      if (!cancelled) {
        bootHide();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phone]);

  return phone;
}
