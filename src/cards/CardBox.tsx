import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Card, { attachTilt } from './Card';
import { CARDS, CardInfo, World, WORLD_NAME, cardsOf, drawCard, markSeen, requestWear, seenCards } from './deck';
import { CARD_COPY as T } from './copy';
import { useStore, setSide, setChapter, liveStore } from '../state';
import { go, openBook } from '../book/turn';
import { isReducedMotion } from '../paper/motion';
import { useFocusTrap } from '../paper/focusTrap';
import { whoosh, rustle, snap, thump } from '../audio/paper';
import './cards.css';

type Mode = 'draw' | 'binder';
type Phase = 'idle' | 'shuffling' | 'revealing' | 'held';

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Starts loading a picture; resolves when it is in (or failed, or after timeoutMs). */
function preload(src: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    const t = window.setTimeout(done, timeoutMs);
    img.onload = img.onerror = () => {
      window.clearTimeout(t);
      done();
    };
    img.src = src;
  });
}
const anim = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) =>
  el.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)', ...o }).finished.catch(() => undefined);

function sideName(side: string) {
  return side === 'nu' ? 'Nữ' : 'Nam';
}

export default function CardBox({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const reduced = isReducedMotion();

  const [mode, setMode] = useState<Mode>('draw');
  const [deck, setDeck] = useState<World | 0>(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [stack, setStack] = useState<CardInfo[]>([]);
  const [held, setHeld] = useState<CardInfo | null>(null);
  const [heldFrom, setHeldFrom] = useState<Mode>('draw');
  const [seenCount, setSeenCount] = useState(() => seenCards().size);
  const [sideFilter, setSideFilter] = useState<'all' | 'nu' | 'nam'>('all');
  const [worldFilter, setWorldFilter] = useState<World | 0>(0);
  const [closing, setClosing] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const stackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heldRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const flyFrom = useRef<DOMRect | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, reduced ? 120 : 320);
  }, [closing, onClose, reduced]);

  const dialogRef = useFocusTrap(true, close, '.cb-primary');

  // the idle deck on the table: a few backs of the chosen deck
  const idleBacks = useMemo(() => {
    const pool = cardsOf(deck);
    return Array.from({ length: 6 }, (_, i) => pool[(i * 7 + 3) % pool.length]);
  }, [deck]);

  // tilt the held card
  useEffect(() => {
    if (phase !== 'held' || !heldRef.current || !stageRef.current) return;
    return attachTilt(heldRef.current, stageRef.current);
  }, [phase, held]);

  // a card picked from the binder flies from its thumbnail to the middle
  useLayoutEffect(() => {
    const el = heldRef.current;
    const from = flyFrom.current;
    flyFrom.current = null;
    if (!el || !from || reduced || phase !== 'held') return;
    const to = el.getBoundingClientRect();
    if (!to.width) return;
    const scale = scaleOf(el);
    const dx = (from.left + from.width / 2 - (to.left + to.width / 2)) / scale;
    const dy = (from.top + from.height / 2 - (to.top + to.height / 2)) / scale;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}) rotate(-3deg)` },
        { transform: 'none' },
      ],
      { duration: 460, easing: 'cubic-bezier(.2,.9,.3,1.05)' }
    );
  }, [held, phase, reduced]);

  const see = (card: CardInfo) => {
    markSeen(card.id);
    setSeenCount(seenCards().size);
  };

  // ---------------------------------------------------------------- draw

  const shuffleAndDraw = async () => {
    if (phase === 'shuffling' || phase === 'revealing') return;
    const pick = drawCard(deck);
    const posterIn = preload(pick.poster, 8000); // loads while the deck is shuffled
    const pool = cardsOf(deck);
    const others = Array.from({ length: 8 }, () => pool[Math.floor(Math.random() * pool.length)]);
    setHeld(null);
    setHeldFrom('draw');
    setStack([...others, pick]);
    setPhase('shuffling');
    whoosh();
    await wait(30); // let the stack render
    if (!alive.current) return;

    const els = stackRefs.current.slice(0, 9).filter(Boolean) as HTMLDivElement[];
    if (!reduced && els.length === 9) {
      const rest = (i: number) => `translateY(${-i * 1.2}px)`;
      for (let r = 0; r < 2; r++) {
        rustle();
        await Promise.all(
          els.map((c, i) =>
            anim(c, [{ transform: rest(i) }, { transform: `translateX(${i % 2 ? 130 : -130}px) ${rest(i)} rotate(${i % 2 ? 9 : -9}deg)` }], {
              duration: 240,
              delay: i * 12,
            })
          )
        );
        await Promise.all(
          els.map((c, i) =>
            anim(
              c,
              [
                { transform: `translateX(${i % 2 ? 130 : -130}px) ${rest(i)} rotate(${i % 2 ? 9 : -9}deg)` },
                { transform: `${rest(i)} rotate(${(Math.random() - 0.5) * 4}deg)` },
              ],
              { duration: 260, delay: (8 - i) * 22, easing: 'cubic-bezier(.5,0,.3,1.2)' }
            )
          )
        );
      }
      const fan = (i: number) => `translateX(${(i - 4) * 30}px) translateY(${Math.abs(i - 4) * 7}px) rotate(${(i - 4) * 7}deg)`;
      await Promise.all(els.map((c, i) => anim(c, [{ transform: rest(i) }, { transform: fan(i) }], { duration: 320, delay: i * 18 })));
      await wait(180);
      await Promise.all(els.map((c, i) => anim(c, [{ transform: fan(i) }, { transform: rest(i) }], { duration: 240 })));
      await Promise.all(
        els.slice(0, 8).map((c, i) =>
          anim(c, [{ opacity: 1, transform: rest(i) }, { opacity: 0, transform: 'translateY(170px) scale(.8)' }], { duration: 300, delay: i * 15 })
        )
      );
    }
    await posterIn;
    if (!alive.current) return;
    setStack([]);
    setHeld(pick);
    setPhase('revealing');
  };

  // reveal runs once the picked card is mounted as the held card, face down
  useEffect(() => {
    if (phase !== 'revealing' || !held || !heldRef.current) return;
    let cancelled = false;
    (async () => {
      await reveal(heldRef.current!, held, fxRef.current, stageRef.current, reduced);
      if (cancelled || !alive.current) return;
      see(held);
      setPhase('held');
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, held, reduced]);

  // phones: swipe up on the deck to draw
  const swipe = useRef<{ y: number } | null>(null);

  // ---------------------------------------------------------------- binder

  const binderCards = useMemo(
    () => CARDS.filter((c) => (sideFilter === 'all' || c.side === sideFilter) && (!worldFilter || c.world === worldFilter)),
    [sideFilter, worldFilter]
  );

  const holdFromBinder = (card: CardInfo, from: HTMLElement) => {
    flyFrom.current = from.getBoundingClientRect();
    setHeld(card);
    setHeldFrom('binder');
    setPhase('held');
    see(card);
    rustle();
  };

  const backToBinder = () => {
    setHeld(null);
    setPhase('idle');
  };

  // ---------------------------------------------------------------- wear

  const wear = async () => {
    if (!held) return;
    const card = held;
    const el = heldRef.current;
    snap();
    if (el && !reduced) {
      const doll = document.querySelector('.mix-doll-container, .mx-doll, .paper-doll-canvas');
      const r = el.getBoundingClientRect();
      const scale = scaleOf(el);
      let dx = -260;
      let dy = 60;
      if (doll) {
        const d = doll.getBoundingClientRect();
        dx = (d.left + d.width / 2 - (r.left + r.width / 2)) / scale;
        dy = (d.top + d.height / 2 - (r.top + r.height / 2)) / scale;
      }
      setClosing(true);
      await anim(el, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.25) rotate(-16deg)`, opacity: 0.2 }], {
        duration: 520,
        easing: 'cubic-bezier(.5,0,.3,1)',
      });
    }
    requestWear(card);
    onClose();
    // take the book to Phối đồ on the card's áo and side; the mix page dresses the doll
    if (state.screen !== 'book') {
      // the closed book opens straight onto the card's áo and side, once the store has them
      dispatch(setSide(card.side));
      dispatch(setChapter(card.chapter));
      for (let i = 0; i < 30; i++) {
        const now = liveStore.get();
        if (now.chapter === card.chapter && now.side === card.side) break;
        await wait(20);
      }
      openBook(4);
    } else if (state.chapter !== card.chapter || state.side !== card.side || state.spread !== 4) {
      go({ chapter: card.chapter, side: card.side, spread: 4 });
    }
  };

  // ---------------------------------------------------------------- render

  const container =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.design-frame-canvas, .design-frame-mobile') ?? document.body
      : null;
  if (!container) return null;
  const isMobile = !container.classList.contains('design-frame-canvas');
  const busy = phase === 'shuffling' || phase === 'revealing';
  const showBinder = mode === 'binder' && !(held && heldFrom === 'binder');

  const content = (
    <div
      className={`cb-overlay${isMobile ? ' is-mobile' : ''}${closing ? ' is-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div ref={dialogRef} className="cb-panel" role="dialog" aria-modal="true" aria-label={T.title}>
        <header className="cb-head">
          <div className="cb-title">
            <h2>{T.title}</h2>
            <span className="cb-count">{T.seen.replace('{n}', String(seenCount)).replace('{total}', String(CARDS.length))}</span>
          </div>
          <div className="cb-modes" role="tablist" aria-label={T.title}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'draw'}
              className="cb-mode"
              disabled={busy}
              onClick={() => {
                setMode('draw');
                if (heldFrom === 'binder') {
                  setHeld(null);
                  setPhase('idle');
                }
              }}
            >
              {T.modeDraw}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'binder'}
              className="cb-mode"
              disabled={busy}
              onClick={() => {
                setMode('binder');
                setHeld(null);
                setPhase('idle');
              }}
            >
              {T.modeBinder}
            </button>
          </div>
          <button type="button" className="cb-close" onClick={close} aria-label={T.close} disabled={busy}>
            {T.close}
          </button>
        </header>

        {mode === 'draw' && (
          <div className="cb-chips" role="group" aria-label={T.deck}>
            {([0, 1, 2, 3] as (World | 0)[]).map((w) => (
              <button
                key={w}
                type="button"
                className={`cb-chip${w ? ` w${w}` : ''}`}
                aria-pressed={deck === w}
                disabled={busy}
                onClick={() => setDeck(w)}
              >
                {w ? WORLD_NAME[w as World] : T.all} · {cardsOf(w).length}
              </button>
            ))}
          </div>
        )}

        {showBinder ? (
          <div className="cb-binder-wrap">
            <div className="cb-chips cb-filters" role="group" aria-label={T.filter}>
              {(['all', 'nu', 'nam'] as const).map((s) => (
                <button key={s} type="button" className="cb-chip" aria-pressed={sideFilter === s} onClick={() => setSideFilter(s)}>
                  {s === 'all' ? T.all : sideName(s)}
                </button>
              ))}
              <span className="cb-sep" aria-hidden="true" />
              {([0, 1, 2, 3] as (World | 0)[]).map((w) => (
                <button
                  key={`w${w}`}
                  type="button"
                  className={`cb-chip${w ? ` w${w}` : ''}`}
                  aria-pressed={worldFilter === w}
                  onClick={() => setWorldFilter(w)}
                >
                  {w ? WORLD_NAME[w as World] : T.allWorlds}
                </button>
              ))}
            </div>
            <div className="cb-binder">
              {binderCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cb-thumb w${c.world}${seenCards().has(c.id) ? ' is-seen' : ''}`}
                  onClick={(e) => holdFromBinder(c, e.currentTarget)}
                  aria-label={`${c.title}, ${c.sub}, ${WORLD_NAME[c.world]}, ${sideName(c.side)}`}
                >
                  <img src={c.poster} alt="" loading="lazy" draggable={false} />
                  <span className="cb-thumb-dot" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={stageRef}
            className="cb-stage"
            onPointerDown={(e) => {
              if (phase === 'idle' && mode === 'draw') swipe.current = { y: e.clientY };
            }}
            onPointerUp={(e) => {
              if (swipe.current && swipe.current.y - e.clientY > 50) shuffleAndDraw();
              swipe.current = null;
            }}
          >
            {phase === 'idle' && mode === 'draw' && (
              <button type="button" className="cb-deck" onClick={shuffleAndDraw} aria-label={T.draw}>
                {idleBacks.map((c, i) => (
                  <Card
                    key={`${c.id}-${i}`}
                    card={c}
                    className="cb-small"
                    style={{ transform: `translateX(${(i - 2.5) * 6}px) translateY(${-i * 2}px) rotate(${(i - 2.5) * 3}deg)` }}
                  />
                ))}
              </button>
            )}

            {phase === 'shuffling' &&
              stack.map((c, i) => (
                <Card
                  key={`s${i}`}
                  ref={(el) => {
                    stackRefs.current[i] = el;
                  }}
                  card={c}
                  className="cb-small"
                  style={{ transform: `translateY(${-i * 1.2}px)` }}
                />
              ))}

            {held && (phase === 'revealing' || phase === 'held') && (
              <Card ref={heldRef} key={held.id} card={held} up={phase === 'held' || heldFrom === 'binder'} className="cb-held" seen={false} />
            )}
            <div ref={fxRef} className="cb-fx" aria-hidden="true" />
          </div>
        )}

        {!showBinder && (
          <div className="cb-foot">
            <p className="cb-note" aria-live="polite">
              {phase === 'shuffling'
                ? T.shuffling
                : held && phase === 'held'
                ? `${held.title} · ${held.sub} — ${WORLD_NAME[held.world]} · ${sideName(held.side)}`
                : mode === 'draw'
                ? T.hint.replace('{deck}', deck ? WORLD_NAME[deck as World] : T.all)
                : ''}
            </p>
            <div className="cb-actions">
              {held && phase === 'held' && heldFrom === 'binder' && (
                <button type="button" className="cb-btn" onClick={backToBinder}>
                  {T.back}
                </button>
              )}
              {mode === 'draw' && (
                <button type="button" className={`cb-btn${held && phase === 'held' ? '' : ' cb-primary'}`} onClick={shuffleAndDraw} disabled={busy}>
                  {held ? T.again : T.draw}
                </button>
              )}
              {held && phase === 'held' && (
                <button type="button" className="cb-btn cb-gold cb-primary" onClick={wear}>
                  {T.wear}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, container);
}

/** screen pixels per layout pixel (the desktop design frame is scaled to fit the window) */
function scaleOf(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return el.offsetWidth ? r.width / el.offsetWidth || 1 : 1;
}

// ---------------------------------------------------------------- the three reveals

async function reveal(card: HTMLDivElement, info: CardInfo, fx: HTMLDivElement | null, stage: HTMLDivElement | null, reduced: boolean) {
  const flip = card.querySelector<HTMLElement>('.nc-flip');
  const tilt = card.querySelector<HTMLElement>('.nc-tilt');
  if (!flip || !tilt) return;
  const up = () => {
    card.classList.add('up');
    flip.getAnimations().forEach((a) => a.cancel());
  };
  if (reduced) {
    up();
    return;
  }

  if (info.world === 1) {
    // Chuẩn cổ phục: rises, turns over slowly and heavily, a red seal is pressed, gold dust lifts
    await anim(card, [{ transform: 'translateY(30px) scale(.8)' }, { transform: 'translateY(-10px) scale(1)' }], { duration: 420 });
    await anim(flip, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(-10deg)', offset: 0.82 }, { transform: 'rotateY(0deg)' }], {
      duration: 1000,
      easing: 'cubic-bezier(.45,0,.2,1)',
    });
    up();
    const seal = document.createElement('div');
    seal.className = 'cb-seal';
    seal.innerHTML = 'NGHÊ<br>CHỨNG';
    tilt.appendChild(seal);
    thump();
    seal.animate(
      [
        { transform: 'translateZ(30px) rotate(-12deg) scale(2.4)', opacity: 0 },
        { transform: 'translateZ(30px) rotate(-12deg) scale(.92)', opacity: 1, offset: 0.7 },
        { transform: 'translateZ(30px) rotate(-12deg) scale(1)', opacity: 1 },
      ],
      { duration: 380, easing: 'ease-in', fill: 'forwards' }
    );
    anim(card, [{ transform: 'translateY(-10px)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 240, delay: 280 });
    burst(fx, 26, 'dust');
    window.setTimeout(() => {
      seal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished.then(() => seal.remove(), () => seal.remove());
    }, 1700);
  } else if (info.world === 2) {
    // Giao thoa: the picture is woven in, strip by strip, like threads on a loom
    await anim(card, [{ transform: 'scale(.8)' }, { transform: 'scale(1)' }], { duration: 380 });
    const strips = document.createElement('div');
    strips.className = 'cb-strips';
    const n = 9;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.style.backgroundImage = `url("${info.poster}")`;
      s.style.backgroundSize = `${n * 100}% 100%`;
      s.style.backgroundPosition = `${(i / (n - 1)) * 100}% 0`;
      s.style.transform = 'rotateY(90deg)';
      strips.appendChild(s);
    }
    tilt.appendChild(strips);
    rustle();
    await Promise.all(
      Array.from(strips.children).map((s, i) =>
        anim(s, [{ transform: `rotateY(90deg) translateY(${i % 2 ? -16 : 16}px)` }, { transform: 'rotateY(0) translateY(0)' }], {
          duration: 420,
          delay: i * 70,
          easing: 'cubic-bezier(.3,1.3,.5,1)',
        })
      )
    );
    up();
    strips.remove();
    anim(card, [{ filter: 'brightness(1.15)' }, { filter: 'brightness(1)' }], { duration: 500 });
  } else {
    // Đường phố: slapped on the table, the cover peels off, stickers fly
    up();
    const front = card.querySelector<HTMLElement>('.nc-front');
    const cover = document.createElement('div');
    cover.className = 'nc-face nc-back nc-back-3 cb-cover';
    cover.innerHTML = '<div class="nc-back-art"><i class="nc-b1"></i><i class="nc-b2"></i><i class="nc-b3"></i></div><div class="nc-back-label">Đường phố</div>';
    front?.appendChild(cover);
    await anim(
      card,
      [
        { transform: 'translateY(-260px) rotate(-24deg) scale(1.3)' },
        { transform: 'translateY(0) rotate(3deg) scale(1.08,.94)', offset: 0.7 },
        { transform: 'translateY(0) rotate(-2deg) scale(.98,1.03)', offset: 0.85 },
        { transform: 'translateY(0) rotate(0) scale(1)' },
      ],
      { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)' }
    );
    thump();
    stage?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], {
      duration: 200,
    });
    snap();
    await anim(
      cover,
      [
        { clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' },
        { clipPath: 'polygon(0 0,100% 0,100% 0,0 100%)', offset: 0.55 },
        { clipPath: 'polygon(0 0,0 0,0 0,0 0)' },
      ],
      { duration: 520, easing: 'ease-in' }
    );
    cover.remove();
    burst(fx, 12, 'stk');
  }
  card.getAnimations().forEach((a) => a.cancel());
}

function burst(fx: HTMLDivElement | null, n: number, kind: 'dust' | 'stk') {
  if (!fx) return;
  const cols = ['#fff35c', '#ff3df2', '#00e5ff', '#F4ECDD', '#2A211B'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = kind === 'dust' ? 'cb-dust' : `cb-stk k${i % 3}`;
    if (kind === 'stk') d.style.background = cols[i % cols.length];
    fx.appendChild(d);
    const a = Math.random() * Math.PI * 2;
    const r = kind === 'dust' ? 90 + Math.random() * 100 : 160 + Math.random() * 100;
    const lift = kind === 'dust' ? -60 - Math.random() * 120 : 0;
    d.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        {
          transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r * 0.7 + lift}px) rotate(${Math.random() * 540 - 270}deg) scale(1)`,
          opacity: 0,
        },
      ],
      { duration: kind === 'dust' ? 1400 : 900, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards', delay: Math.random() * 120 }
    );
  }
  window.setTimeout(() => {
    fx.innerHTML = '';
  }, 1700);
}
