import React from 'react';
import './paper.css';

export interface TapeProps extends React.HTMLAttributes<HTMLDivElement> {
  angle?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tape({
  angle = -3,
  className = '',
  style,
  ...rest
}: TapeProps) {
  const combinedClass = ['paper-tape', className].filter(Boolean).join(' ');

  return (
    <div
      className={combinedClass}
      style={{
        transform: `rotate(${angle}deg)`,
        ...style,
      }}
      {...rest}
    />
  );
}
