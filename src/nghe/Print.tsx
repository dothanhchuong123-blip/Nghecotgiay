import React from 'react';
import { COPY } from '../data';
import { useFocusTrap } from '../paper/focusTrap';
import './print.css';

export interface PrintProps {
  photoUrl: string;
  chapter: string;
  caption?: string;
  onClose: () => void;
  onToCard?: () => void;
}

export default function Print({
  photoUrl,
  chapter,
  caption,
  onClose,
  onToCard,
}: PrintProps) {
  const P = COPY.photo;
  const displayCaption = caption || P.done;

  // Focus trap for dialog: traps tab navigation and restores focus when closed
  const dialogRef = useFocusTrap(true, onClose, '.photo-print-btn');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `nghe-cot-${chapter}-photo.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      ref={dialogRef}
      className="photo-print"
      role="dialog"
      aria-modal="true"
      aria-label={displayCaption}
    >
      <div className="photo-print-image-wrap">
        <img
          src={photoUrl}
          alt={displayCaption}
          className="photo-print-img"
        />
      </div>

      <div className="photo-print-caption">{displayCaption}</div>

      <div className="photo-print-actions">
        <button
          type="button"
          className="photo-print-btn"
          onClick={handleDownload}
        >
          {P.save}
        </button>

        <button
          type="button"
          className="photo-print-btn photo-print-btn-secondary"
          onClick={() => {
            if (onToCard) {
              onToCard();
            }
          }}
        >
          {P.toCard}
        </button>

        <button
          type="button"
          className="photo-print-btn photo-print-btn-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
