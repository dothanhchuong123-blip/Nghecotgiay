import React from 'react';

export interface NeonProps {
  text: string;
  size?: number | string;
  tone?: 'pink' | 'lime';
  noFlicker?: boolean;
}

export default function Neon({
  text,
  size,
  tone = 'pink',
  noFlicker = false,
}: NeonProps) {
  const fontSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <span
      className={`neon neon-${tone}${noFlicker ? ' no-flicker' : ''}`}
      style={fontSize ? { fontSize } : undefined}
    >
      {text}
    </span>
  );
}
