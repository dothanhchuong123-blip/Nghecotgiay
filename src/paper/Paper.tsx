import React from 'react';
import './paper.css';

export type PaperTone = 'card' | 'do' | 'do2' | 'son' | 'cham';

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: PaperTone;
  lifted?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function Paper({
  tone = 'card',
  lifted = false,
  children,
  className = '',
  ...rest
}: PaperProps) {
  const toneClass = `paper-tone-${tone}`;
  const liftedClass = lifted ? 'paper-lifted' : '';
  const combinedClass = ['paper', toneClass, liftedClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClass} {...rest}>
      {children}
    </div>
  );
}
