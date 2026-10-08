import { useState, useEffect } from 'react';
import { STAGE, COPY } from '../data';
import { useSay } from './say';
import PaperNghe from './PaperNghe';
import Chat from './Chat';
import KeySlip, { subscribeKeySlip } from './KeySlip';
import Print from './Print';
import { subscribePrint, hidePrint, PrintModalState } from './photo';
import { setCardPhoto, exportCard } from '../share/card';
import './nghedesk.css';

export default function NgheDesk() {
  const bubbleHtml = useSay();
  const [chatOpen, setChatOpen] = useState(false);
  const [bubbleHidden, setBubbleHidden] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipReason, setSlipReason] = useState<string | undefined>(undefined);
  const [printState, setPrintState] = useState<PrintModalState>({
    open: false,
    photoUrl: '',
    chapter: '',
  });

  // Each new line shows the bubble again; on a phone it hides after 6 s
  useEffect(() => {
    setBubbleHidden(false);
    if (!bubbleHtml || window.innerWidth >= 768) return;
    const t = window.setTimeout(() => setBubbleHidden(true), 6000);
    return () => window.clearTimeout(t);
  }, [bubbleHtml]);

  useEffect(() => {
    return subscribeKeySlip((open, reason) => {
      setSlipOpen(open);
      if (reason !== undefined) {
        setSlipReason(reason);
      }
    });
  }, []);

  useEffect(() => {
    return subscribePrint((state) => {
      setPrintState(state);
    });
  }, []);

  return (
    <>
      {/* The pocket on left desk (clicking opens or closes the slip) */}
      <button
        type="button"
        className="desk-pocket-btn"
        onClick={() => {
          setSlipOpen((prev) => !prev);
          setSlipReason(undefined);
        }}
        aria-label={COPY.key.title}
        aria-expanded={slipOpen}
      >
        <img
          src={STAGE.paper.pocket}
          alt=""
          className="desk-pocket"
        />
      </button>

      {/* Nghê's bubble (hidden while notebook is open) */}
      {!chatOpen && !bubbleHidden && bubbleHtml ? (
        <div
          className="desk-bubble"
          onClick={() => setBubbleHidden(true)}
          dangerouslySetInnerHTML={{ __html: bubbleHtml }}
        />
      ) : null}

      {/* Red pill button on the desk to toggle chat */}
      <button
        type="button"
        className="desk-chat-btn"
        onClick={() => setChatOpen((prev) => !prev)}
        aria-expanded={chatOpen}
        aria-label={COPY.chat.open}
      >
        <span className="desk-chat-btn-text">{COPY.chat.open}</span>
        <span className="desk-chat-btn-icon" aria-hidden="true">💬</span>
      </button>

      {/* Paper puppet Nghê (also toggles chat on click) */}
      <PaperNghe onChatOpen={() => setChatOpen((prev) => !prev)} />

      {/* The notebook dialog */}
      {chatOpen && <Chat onClose={() => setChatOpen(false)} />}

      {/* The KeySlip dialog */}
      {slipOpen && (
        <KeySlip
          reason={slipReason}
          onClose={() => {
            setSlipOpen(false);
            setSlipReason(undefined);
          }}
        />
      )}

      {/* The Print modal (centred in design frame, z-index 7) */}
      {printState.open && (
        <Print
          photoUrl={printState.photoUrl}
          chapter={printState.chapter}
          caption={printState.caption}
          onClose={hidePrint}
          onToCard={() => {
            setCardPhoto(printState.photoUrl);
            hidePrint();
            exportCard({
              chapter: printState.chapter,
              cardPhoto: printState.photoUrl,
            });
          }}
        />
      )}
    </>
  );
}
