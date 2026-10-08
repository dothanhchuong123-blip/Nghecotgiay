import React, { useRef, useState } from 'react';
import { COPY } from '../data';
import { useFocusTrap } from '../paper/focusTrap';
import './slip.css';

export const GEMINI_KEY_STORAGE = 'gemini-key';

type KeySlipSubscriber = (open: boolean, reason?: string) => void;
const slipSubscribers = new Set<KeySlipSubscriber>();

export function openKeySlip(reason?: string) {
  slipSubscribers.forEach((fn) => fn(true, reason));
}

export function closeKeySlip() {
  slipSubscribers.forEach((fn) => fn(false));
}

export function subscribeKeySlip(fn: KeySlipSubscriber): () => void {
  slipSubscribers.add(fn);
  return () => {
    slipSubscribers.delete(fn);
  };
}

export function getStoredGeminiKey(): string | null {
  try {
    return sessionStorage.getItem(GEMINI_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredGeminiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      sessionStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      sessionStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  } catch {
    // sessionStorage write failed or restricted
  }
}

export function removeStoredGeminiKey(): void {
  try {
    sessionStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    // sessionStorage remove failed or restricted
  }
}

export function hasStoredGeminiKey(): boolean {
  try {
    return Boolean(sessionStorage.getItem(GEMINI_KEY_STORAGE));
  } catch {
    return false;
  }
}

export interface KeySlipProps {
  reason?: string;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
}

export default function KeySlip({
  reason,
  onClose,
  onKeyChange,
}: KeySlipProps) {
  const K = COPY.key;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Input is always empty when opened (never show stored key)
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState<boolean>(() => hasStoredGeminiKey());

  // Focus trap for dialog: traps tab navigation and restores focus when closed
  const dialogRef = useFocusTrap(true, onClose, '.slip-input');

  const handleUseKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (trimmed) {
      setStoredGeminiKey(trimmed);
      setHasKey(true);
      onKeyChange?.(true);
    }
    onClose();
  };

  const handleRemoveKey = () => {
    removeStoredGeminiKey();
    setHasKey(false);
    setKeyInput('');
    onKeyChange?.(false);
  };

  return (
    <div
      ref={dialogRef}
      className="slip-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={K.title}
    >
      {/* Header */}
      <div className="slip-header">
        <h2 className="slip-title">{K.title}</h2>
        <button
          type="button"
          className="slip-close-btn"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Optional reason line */}
      {reason ? <p className="slip-reason">{reason}</p> : null}

      {/* Already stored badge */}
      {hasKey ? (
        <p className="slip-status">✓ {K.have}</p>
      ) : null}

      {/* Input Form */}
      <form onSubmit={handleUseKey} className="slip-field">
        <label htmlFor="gemini-key-input" className="slip-label">
          {K.label}
        </label>
        <input
          id="gemini-key-input"
          ref={inputRef}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="AIza…"
          className="slip-input"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />

        <div className="slip-actions">
          <button
            type="submit"
            className="slip-use-btn"
            disabled={!keyInput.trim()}
          >
            {K.use}
          </button>
          {hasKey ? (
            <button
              type="button"
              className="slip-remove-btn"
              onClick={handleRemoveKey}
            >
              {K.remove}
            </button>
          ) : null}
        </div>
      </form>

      {/* Note */}
      <p className="slip-note">{K.note}</p>
    </div>
  );
}
