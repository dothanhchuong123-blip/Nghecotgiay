import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { lookById } from './closest';
import { letterHistory, reopenLetter, subscribeHistory } from './mailbox';
import { POUCH_COPY as P } from '../cards/copy';
import { useFocusTrap } from '../paper/focusTrap';
import './pouch.css';

// Opens from the desk envelope: the letters Nghê has sent, and the photo key (the key slip itself is unchanged).

export interface MailPouchProps {
  onClose: () => void;
  onOpenKey: () => void;
}

export default function MailPouch({ onClose, onOpenKey }: MailPouchProps) {
  const [tab, setTab] = useState<'letters' | 'key'>('letters');
  const [, setTick] = useState(0);
  useEffect(() => subscribeHistory(() => setTick((t) => t + 1)), []);
  const dialogRef = useFocusTrap(true, onClose, '.mp-tab[aria-selected="true"]');
  const kept = letterHistory();

  const container =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.design-frame-canvas, .design-frame-mobile') ?? document.body
      : null;
  if (!container) return null;
  const isMobile = !container.classList.contains('design-frame-canvas');

  const content = (
    <div
      className={`mp-overlay${isMobile ? ' is-mobile' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="mp-pouch" role="dialog" aria-modal="true" aria-label={P.title}>
        <div className="mp-head">
          <h2>{P.title}</h2>
          <button type="button" className="mp-close" onClick={onClose}>
            {P.close}
          </button>
        </div>
        <div className="mp-tabs" role="tablist">
          <button type="button" role="tab" className="mp-tab" aria-selected={tab === 'letters'} onClick={() => setTab('letters')}>
            {P.letters} {kept.length ? <span className="mp-n">{kept.length}</span> : null}
          </button>
          <button type="button" role="tab" className="mp-tab" aria-selected={tab === 'key'} onClick={() => setTab('key')}>
            {P.key}
          </button>
        </div>

        {tab === 'letters' ? (
          kept.length === 0 ? (
            <p className="mp-empty">{P.empty}</p>
          ) : (
            <div className="mp-letters">
              {kept.map((k) => {
                const look = lookById(k.id);
                if (!look) return null;
                return (
                  <button
                    key={k.id}
                    type="button"
                    className="mp-letter"
                    onClick={() => {
                      onClose();
                      reopenLetter(k);
                    }}
                    aria-label={look.title ?? P.letters}
                  >
                    <img src={look.thumb} alt="" draggable={false} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    <span>{k.exact ? '100%' : `${k.score}%`}</span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="mp-key">
            <p>{P.keyNote}</p>
            <button
              type="button"
              className="mp-btn"
              onClick={() => {
                onClose();
                onOpenKey();
              }}
            >
              {P.keyOpen}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, container);
}
