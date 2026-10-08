import React from 'react';
import './paper.css';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function Chip({
  active = false,
  children,
  className = '',
  onClick,
  ...rest
}: ChipProps) {
  const activeClass = active ? 'paper-chip-active' : '';
  const combinedClass = ['paper-chip', activeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={combinedClass}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
