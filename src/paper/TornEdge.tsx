import React, { useMemo } from 'react';
import './paper.css';

export interface TornEdgeProps extends React.HTMLAttributes<HTMLDivElement> {
  seed?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function TornEdge({
  seed = 42,
  children,
  className = '',
  style,
  ...rest
}: TornEdgeProps) {
  const clipPath = useMemo(() => {
    const rng = mulberry32(seed);
    const points: string[] = [];

    // 24 points along top edge (left to right)
    for (let i = 0; i < 24; i++) {
      const x = (i / 23) * 100;
      const y = rng() * 3;
      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}px`);
    }

    // 24 points along bottom edge (right to left)
    for (let i = 23; i >= 0; i--) {
      const x = (i / 23) * 100;
      const dy = rng() * 3;
      points.push(`${x.toFixed(2)}% calc(100% - ${dy.toFixed(2)}px)`);
    }

    return `polygon(${points.join(', ')})`;
  }, [seed]);

  const combinedClass = ['paper-torn-edge', className].filter(Boolean).join(' ');

  return (
    <div
      className={combinedClass}
      style={{ clipPath, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
