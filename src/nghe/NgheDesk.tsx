import { useState, useEffect } from 'react';
import { STAGE, COPY } from '../data';
import { useSay } from './say';
import PaperNghe from './PaperNghe';
import Chat from './Chat';
import KeySlip, { subscribeKeySlip } from './KeySlip';
import Print from './Print';
import { subscribePrint, hidePrint, PrintModalState } from './photo';
import { setCardPhoto, exportCard } from '../share/card';
import LookMail from '../preview/LookMail';
import MailPouch from '../preview/MailPouch';
import { Letter, closeLetter, subscribeLetter, letterHistory, subscribeHistory } from '../preview/mailbox';
import CardBox from '../cards/CardBox';
import { CardBack } from '../cards/Card';
import { openCardBox, subscribeCardBox } from '../cards/deck';
import { CARD_COPY, POUCH_COPY } from '../cards/copy';
import './nghedesk.css';
import '../cards/cards.css';

export default function NgheDesk() {
  const bubbleHtml = useSay();
  const [chatOpen, setChatOpen] = useState(false);
  const [bubbleHidden, setBubbleHidden] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipReason, setSlipReason] = useState<string | undefined>(undefined);
  const [pouchOpen, setPouchOpen] = useState(false);
  const [letter, setLetter] = useState<{ n: number; letter: Letter } | null>(null);
  const [kept, setKept] = useState(() => letterHistory().length);
  const [boxOpen, setBoxOpen] = useState(false);
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

  useEffect(() => subscribeLetter((l) => setLetter((prev) => (l ? { n: (prev?.n ?? 0) + 1, letter: l } : null))), []);
  useEffect(() => subscribeHistory(() => setKept(letterHistory().length)), []);
  useEffect(() => subscribeCardBox((open) => setBoxOpen(open)), []);

  useEffect(() => {
    return subscribePrint((state) => {
      setPrintState(state);
    });
  }, []);

  return (
    <>
      {/* The envelope on the left of the desk is Nghê's mailbox: letters fly out of it,
          and clicking it opens the pouch (past letters + the photo key) */}
      <button
        type="button"
        className="desk-pocket-btn"
        onClick={() => setPouchOpen((prev) => !prev)}
        aria-label={POUCH_COPY.title}
        aria-expanded={pouchOpen}
      >
        <img
          src={STAGE.paper.pocket}
          alt=""
          className="desk-pocket"
        />
        {kept > 0 ? <span className="desk-pocket-badge" key={kept}>{kept}</span> : null}
      </button>

      {/* The card box under it */}
      <button type="button" className="desk-cardbox-btn" onClick={openCardBox} aria-label={CARD_COPY.open}>
        <span className="dcb-cards" aria-hidden="true">
          {([1, 2, 3] as const).map((w) => (
            <span key={w} className={`nc-card w${w}`}>
              <span className="nc-tilt">
                <span className="nc-flip">
                  <CardBack world={w} />
                </span>
              </span>
            </span>
          ))}
        </span>
        <span className="dcb-box">{CARD_COPY.button}</span>
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

      {pouchOpen && (
        <MailPouch
          onClose={() => setPouchOpen(false)}
          onOpenKey={() => {
            setSlipReason(undefined);
            setSlipOpen(true);
          }}
        />
      )}

      {letter && <LookMail key={letter.n} letter={letter.letter} onClose={closeLetter} />}

      {boxOpen && <CardBox onClose={() => setBoxOpen(false)} />}

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
