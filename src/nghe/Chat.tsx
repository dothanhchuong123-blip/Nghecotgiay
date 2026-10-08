import React, { useEffect, useRef, useState } from 'react';
import {
  COPY,
  VIBES,
  OCCASIONS,
  garmentById,
  gidOf,
  pieceName,
  loadManifest,
  Manifest,
} from '../data';
import { useStore, setVibe, setCollage, CollageLevel } from '../state';
import { useGarment } from '../book/useGarment';
import { go } from '../book/turn';
import { getGlobalMixOutfit, setGlobalMixOutfit } from '../spreads/Mix';
import { useFocusTrap } from '../paper/focusTrap';
import { isReducedMotion } from '../paper/motion';
import './chat.css';

export interface ChatProps {
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'nghe' | 'user';
  text: string;
  html?: string;
  isThinking?: boolean;
}

const MAX_QUESTIONS = 30;

export default function Chat({ onClose }: ChatProps) {
  const CT = COPY.chat;
  const { state, dispatch } = useStore();
  const gHook = useGarment();
  const g = gHook ?? garmentById(gidOf(state.chapter, state.side));

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'nghe',
      text: COPY.nghe.hello,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const manifestRef = useRef<Manifest | null>(null);

  // Focus trap for dialog: traps tab navigation and restores focus when closed
  const dialogRef = useFocusTrap(true, onClose, '.chat-input');

  // Load manifest for mix suggestions
  useEffect(() => {
    loadManifest()
      .then((m) => {
        manifestRef.current = m;
      })
      .catch(() => {});
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isReducedMotion() ? 'auto' : 'smooth',
    });
  }, [messages, isLoading]);

  // Handle local suggestion 1: CT.suggest.where
  const handleSuggestWhere = () => {
    if (isLoading || !g) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: CT.suggest.where,
    };

    const rules = Object.entries(g.occasion_rules || {}).map(([key, val]) => {
      const occ = OCCASIONS.find((o) => o.id === key);
      const short = occ?.short || key;
      return {
        short,
        note_vi: val.note_vi,
      };
    });

    const listHtml = rules
      .map(
        (r) =>
          `<li><strong>${escapeHtml(r.short)}</strong>: ${escapeHtml(
            r.note_vi
          )}</li>`
      )
      .join('');
    const replyHtml = `<p><strong>${escapeHtml(
      g.name
    )}</strong></p><ul>${listHtml}</ul>`;

    const ngheMsg: Message = {
      id: `n-${Date.now() + 1}`,
      sender: 'nghe',
      text: `${g.name}: ${rules.map((r) => `${r.short}: ${r.note_vi}`).join('; ')}`,
      html: replyHtml,
    };

    setMessages((prev) => [...prev, userMsg, ngheMsg]);
  };

  // Handle local suggestion 2: CT.suggest.story
  const handleSuggestStory = () => {
    if (isLoading || !g) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: CT.suggest.story,
    };

    let replyHtml = '';
    let replyText = '';

    if (g.timeline && g.timeline.length > 0) {
      const item = g.timeline[0];
      replyHtml = `<p><strong>${escapeHtml(item.year)} · ${escapeHtml(
        item.title_vi
      )}</strong></p><p>${escapeHtml(item.text_vi)}</p>`;
      replyText = `${item.year} · ${item.title_vi}: ${item.text_vi}`;
    } else {
      replyText = g.history_vi || g.summary_vi || g.name;
      replyHtml = `<p>${escapeHtml(replyText)}</p>`;
    }

    const ngheMsg: Message = {
      id: `n-${Date.now() + 1}`,
      sender: 'nghe',
      text: replyText,
      html: replyHtml,
    };

    setMessages((prev) => [...prev, userMsg, ngheMsg]);
  };

  // Handle local suggestion 3: CT.suggest.mix
  const handleSuggestMix = () => {
    if (isLoading) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: CT.suggest.mix,
    };

    const firstVibe = VIBES[0];
    const manifest = manifestRef.current;
    const sidePieces = (manifest?.pieces || []).filter(
      (p) => !p.side || p.side === state.side
    );
    const wearableIds = new Set(sidePieces.map((p) => p.id));

    // Find the first piece in affinity that user can wear on this side
    const foundPieceId =
      firstVibe.affinity.find((id) => wearableIds.has(id)) ||
      firstVibe.affinity[0] ||
      'ao-khoac-bo';

    const pName = pieceName(foundPieceId) || foundPieceId;
    const actedText = CT.acted.replace('{piece}', pName);

    const ngheMsg: Message = {
      id: `n-${Date.now() + 1}`,
      sender: 'nghe',
      text: actedText,
    };

    setMessages((prev) => [...prev, userMsg, ngheMsg]);

    // Go to spread 4 with worn = [that piece] and vibe = that vibe
    dispatch(setVibe(firstVibe.id));
    setGlobalMixOutfit({ worn: [foundPieceId] });
    go({ spread: 4 });
  };

  // Handle submitting a typed question
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || questionCount >= MAX_QUESTIONS) return;

    setInputText('');
    setIsLoading(true);
    setQuestionCount((c) => c + 1);

    const userMsgId = `u-${Date.now()}`;
    const thinkingMsgId = `thinking-${Date.now()}`;

    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
    };

    const thinkingMsg: Message = {
      id: thinkingMsgId,
      sender: 'nghe',
      text: CT.thinking,
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);

    const historyPayload = messages
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    const currentOutfit = getGlobalMixOutfit();

    try {
      const response = await fetch('/api/nghe-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          history: historyPayload,
          chapter: state.chapter,
          side: state.side,
          spread: state.spread,
          outfit: {
            worn: currentOutfit.worn,
            level: currentOutfit.level,
            vibe: state.vibe,
            colorId: currentOutfit.colorId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data?.reply || CT.offline;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingMsgId
            ? {
                id: `n-${Date.now()}`,
                sender: 'nghe',
                text: reply,
                isThinking: false,
              }
            : m
        )
      );

      // If there is an action, go to spread 4 and apply it
      if (data?.action) {
        const act = data.action;
        if (act.vibe) {
          dispatch(setVibe(act.vibe));
        }
        if (act.level) {
          dispatch(setCollage(act.level as CollageLevel));
        }
        setGlobalMixOutfit({
          worn: act.worn,
          colorId: act.colorId,
          level: act.level,
        });
        go({ spread: 4 });
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingMsgId
            ? {
                id: `n-${Date.now()}`,
                sender: 'nghe',
                text: CT.offline,
                isThinking: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="chat-notebook"
      role="dialog"
      aria-modal="true"
      aria-label={CT.title}
    >
      {/* Header */}
      <div className="chat-header">
        <h2 className="chat-title">{CT.title}</h2>
        <button
          type="button"
          className="chat-close-btn"
          onClick={onClose}
        >
          {CT.close}
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-msg ${
              m.sender === 'nghe' ? 'chat-msg-nghe' : 'chat-msg-user'
            } ${m.isThinking ? 'chat-msg-thinking' : ''}`.trim()}
          >
            {m.html ? (
              <div dangerouslySetInnerHTML={{ __html: m.html }} />
            ) : (
              m.text
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="chat-chips">
        <button
          type="button"
          className="chat-chip"
          onClick={handleSuggestWhere}
          disabled={isLoading}
        >
          {CT.suggest.where}
        </button>
        <button
          type="button"
          className="chat-chip"
          onClick={handleSuggestStory}
          disabled={isLoading}
        >
          {CT.suggest.story}
        </button>
        <button
          type="button"
          className="chat-chip"
          onClick={handleSuggestMix}
          disabled={isLoading}
        >
          {CT.suggest.mix}
        </button>
      </div>

      {/* Input Form */}
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={CT.placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading || questionCount >= MAX_QUESTIONS}
          maxLength={200}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={
            !inputText.trim() || isLoading || questionCount >= MAX_QUESTIONS
          }
        >
          {CT.send}
        </button>
      </form>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
