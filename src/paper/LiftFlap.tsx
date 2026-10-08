import React, { useState } from 'react';
import { snap } from '../audio/paper';
import './liftflap.css';

export interface LiftFlapProps {
  base: React.ReactNode;
  top: React.ReactNode;
  hint: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiftFlap({
  base,
  top,
  hint,
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
  style,
}: LiftFlapProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (next: boolean) => {
    snap();
    if (!isControlled) {
      setInternalIsOpen(next);
    }
    onToggle?.(next);
  };

  const handleFlapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleBaseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
  };

  const handleFlapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!open);
    }
  };

  const handleBaseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      className={`lift-flap-box ${className}`.trim()}
      style={style}
    >
      {/* Base underneath */}
      <div
        className="lift-flap-base"
        onClick={handleBaseClick}
        onKeyDown={handleBaseKeyDown}
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label="Đóng mảnh lật"
      >
        {base}
      </div>

      {/* Top flap hinged at top edge */}
      <div
        className="lift-flap-top"
        style={
          {
            ['--lift' as string]: open ? '112deg' : '0deg',
          } as React.CSSProperties
        }
        onClick={handleFlapClick}
        onKeyDown={handleFlapKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        {top}
        {hint ? <span className="lift-flap-hint">{hint}</span> : null}
      </div>
    </div>
  );
}
