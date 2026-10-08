import React from 'react';
import './paper.css';

export interface DieCutProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  className?: string;
}

export default function DieCut({
  children,
  className = '',
  ...rest
}: DieCutProps) {
  const combinedClass = ['paper-die-cut', className].filter(Boolean).join(' ');

  return (
    <span className={combinedClass} {...rest}>
      {children}
    </span>
  );
}
