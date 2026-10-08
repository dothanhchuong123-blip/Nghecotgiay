import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { registerStand as registerStandGlobal } from '../book/BookMotion';
import './stand.css';

export interface RegisteredStand {
  element: HTMLElement;
  cast: HTMLElement | null;
  d: number;
  rest: number;
  page: 'L' | 'R';
  t: number;
  v: number;
  folding?: boolean;
  onFolded?: () => void;
  age?: number;
  settled?: boolean;
}

export interface StandRegisterContextValue {
  page: 'L' | 'R';
  registerStand: (item: RegisteredStand) => () => void;
}

export const StandRegisterContext =
  createContext<StandRegisterContextValue | null>(null);

export interface CastProps {
  x?: number;
  r?: number;
  y: number;
  w?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Cast = forwardRef<HTMLDivElement, CastProps>(function Cast(
  { x, r, y, w, className, style },
  ref
) {
  const castStyle: React.CSSProperties = {
    left: x !== undefined ? `${x + 10}px` : undefined,
    right: r !== undefined ? `${r + 10}px` : undefined,
    top: `${y - 30}px`,
    width: w !== undefined ? `${Math.max(80, w - 20)}px` : '80px',
    height: '40px',
    ...style,
  };

  return (
    <div
      ref={ref}
      className={`st-cast${className ? ` ${className}` : ''}`}
      style={castStyle}
      aria-hidden="true"
    />
  );
});

export interface StandProps {
  x?: number;
  r?: number;
  y: number;
  w?: number;
  h: number;
  lift?: number;
  d?: number;
  rest?: number;
  tabs?: (number | string)[];
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  page?: 'L' | 'R';
  noCast?: boolean;
  castRef?: React.RefObject<HTMLDivElement | null>;
  folding?: boolean;
  onFolded?: () => void;
}

export default function Stand({
  x,
  r,
  y,
  w,
  h,
  lift = 0,
  d = 0,
  rest = 1,
  tabs,
  children,
  className,
  style,
  page,
  noCast = false,
  castRef: externalCastRef,
  folding,
  onFolded,
}: StandProps) {
  const context = useContext(StandRegisterContext);
  const elementRef = useRef<HTMLDivElement>(null);
  const localCastRef = useRef<HTMLDivElement>(null);
  const effectiveCastRef = externalCastRef ?? localCastRef;
  const itemRef = useRef<RegisteredStand | null>(null);

  const [autoW, setAutoW] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (w !== undefined) return;
    const el = elementRef.current;
    if (!el) return;
    const contentEl = el.querySelector('.st-content');
    const img = contentEl?.querySelector('img');
    if (!img) return;

    const updateAutoW = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAutoW(Math.round((h * img.naturalWidth) / img.naturalHeight));
      }
    };

    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      updateAutoW();
    } else {
      img.addEventListener('load', updateAutoW, { once: true });
      return () => {
        img.removeEventListener('load', updateAutoW);
      };
    }
  }, [w, h, children]);

  const effW = w ?? autoW;

  useEffect(() => {
    if (externalCastRef?.current && effW !== undefined) {
      externalCastRef.current.style.width = `${Math.max(80, effW - 20)}px`;
    }
  }, [externalCastRef, effW]);

  useEffect(() => {
    if (!elementRef.current) return;

    const item: RegisteredStand = {
      element: elementRef.current,
      cast: effectiveCastRef.current,
      d,
      rest,
      page: page ?? context?.page ?? 'L',
      t: 0,
      v: 0,
      folding,
      onFolded,
    };
    itemRef.current = item;

    const register = context?.registerStand ?? registerStandGlobal;
    const unregister = register(item);
    return unregister;
  }, [context, d, rest, page, effectiveCastRef]);

  // Keep folding & onFolded in sync if updated dynamically
  useEffect(() => {
    if (itemRef.current) {
      itemRef.current.folding = folding;
      itemRef.current.onFolded = onFolded;
      if (folding) {
        // Re-arm animation to fold down to 0
        itemRef.current.settled = false;
      }
    }
  }, [folding, onFolded]);

  const totalHeight = h + lift;
  const tabList =
    tabs ?? (effW !== undefined ? [effW / 2 - 23] : ['calc(50% - 23px)']);

  const stStyle: React.CSSProperties = {
    left: x !== undefined ? `${x}px` : undefined,
    right: r !== undefined ? `${r}px` : undefined,
    top: `${y - h - lift}px`,
    width: effW !== undefined ? `${effW}px` : undefined,
    height: `${totalHeight}px`,
    ...style,
  };

  return (
    <>
      {!noCast ? (
        <Cast
          ref={effectiveCastRef}
          x={x}
          r={r}
          y={y}
          w={effW}
        />
      ) : null}

      <div
        ref={elementRef}
        className={`st${className ? ` ${className}` : ''}`}
        style={stStyle}
      >
        {lift > 0 ? (
          <div
            className="st-strut"
            style={{ height: `${lift + 6}px` }}
            aria-hidden="true"
          />
        ) : null}

        {tabList.map((tx, idx) => (
          <i
            key={idx}
            className="st-tab"
            style={{ left: typeof tx === 'number' ? `${tx}px` : tx }}
            aria-hidden="true"
          />
        ))}

        <div className="st-content" style={{ bottom: `${lift}px` }}>
          {children}
        </div>
      </div>
    </>
  );
}
