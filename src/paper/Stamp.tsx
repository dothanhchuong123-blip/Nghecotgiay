import React from 'react';
import './paper.css';

export interface StampProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Stamp({
  children,
  className = '',
  style,
  ...rest
}: StampProps) {
  const combinedClass = ['paper-stamp', className].filter(Boolean).join(' ');

  return (
    <span className={combinedClass} style={style} {...rest}>
      {children}
    </span>
  );
}
