import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  COPY,
  COMPARE,
  COMPANIONS,
  PART_LABELS_VI,
  SOURCES,
  STAGE,
  fullSrc,
  garmentById,
  gidOf,
  loadManifest,
  partAt,
  pieceName,
  sourceById,
  Manifest,
} from '../data';
import { useStore, Side } from '../state';
import PaperDoll from '../doll/PaperDoll';
import LiftFlap from '../paper/LiftFlap';
import { usePartsSpreadState } from '../spreads/Parts';
import { say } from '../nghe/say';
import { snap } from '../audio/paper';
import { go } from '../book/turn';
import { useDeskStyle } from './MobileMeet';
import '../spreads/story.css';
import '../spreads/compare.css';
import './mobile-spreads.css';

function useFlat() {
  useEffect(() => {
    document.documentElement.classList.add('mm-on', 'ms-on');
    return () => document.documentElement.classList.remove('mm-on', 'ms-on');
  }, []);
}

function Eyebrow({ n, label }: { n: string; label: string }) {
  return (
    <div className="ms-eyebrow">
      {COPY.spreadPage.replace('{n}', n)} · {label}
    </div>
  );
}

/* A round magnifier showing one spot of a picture */
function Lens({ src, x, y, size = 112, zoom = 3 }: { src: string; x: number; y: number; size?: number; zoom?: number }) {
  const w = size * zoom;
  const h = (w * 4) / 3;
  return (
    <div className="ms-lens" style={{ width: size, height: size }}>
      <img src={src} alt="" style={{ width: w, height: h, left: size / 2 - x * w, top: size / 2 - y * h }} />
    </div>
  );
}

/* ---------------- Cấu tạo ---------------- */
export function MobileParts() {
  useFlat();
  const desk = useDeskStyle();
  const { state } = useStore();
  const { chapter, side } = state;
  const g = garmentById(gidOf(chapter, side));
  const { sel, off, setSel, toggleOff } = usePartsSpreadState(chapter);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadManifest().then(setManifest).catch(() => {});
  }, []);
  useEffect(() => {
    say(COPY.hints.parts);
  }, [chapter]);
  useEffect(() => setOpen(false), [sel, chapter]);

  const PC = COPY.parts;
  const parts = g?.parts ?? [];
  const pt = g ? partAt(g, sel) : { x: 0.5, y: 0.5 };
  const dollH = Math.min(320, Math.round(window.innerHeight * 0.36));

  const structure = (g?.structure as Record<string, string | string[] | undefined> | undefined)?.[sel];
  const structureText = Array.isArray(structure) ? structure.join(', ') : structure || '';

  const companions = useMemo(() => {
    const ids = ((COMPANIONS as Record<string, Record<string, string[]>>)[side] || {})[chapter] || [];
    if (!manifest) return [];
    return ids
      .map((id) => {
        const piece = manifest.pieces.find((p) => p.id === id && p.side === side);
        return piece ? { id, src: piece.src, name: pieceName(id) || id } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [manifest, side, chapter]);

  if (!g) return null;
  return (
    <div className="ms-root" style={desk}>
      <div className="ms-hero">
        <div className="ms-doll" style={{ width: Math.round(dollH * 0.75), height: dollH }}>
          <PaperDoll side={side} chapter={chapter} worn={[]} off={off} height={dollH} />
          <i className="ms-pin" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }} />
        </div>
        <div className="ms-lens-wrap">
          <Lens src={fullSrc(chapter, side)} x={pt.x} y={pt.y} />
          <span>{PC.lens}</span>
        </div>
      </div>

      <div className="ms-chips">
        {parts.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`ms-chip${sel === p.key ? ' on' : ''}`}
            onClick={() => {
              setSel(p.key);
              snap();
            }}
          >
            {PART_LABELS_VI[p.key] || p.key}
          </button>
        ))}
      </div>

      <section className="ms-card">
        <Eyebrow n="2" label={COPY.spreads.parts} />
        <h1 className="ms-title">{PART_LABELS_VI[sel] || sel}</h1>
        <div className="ms-row">
          <b>{PC.role}</b> {(PC.roles as Record<string, string>)[sel]}
        </div>
        <h2 className="ms-h">{PC.detail}</h2>
        <p className="ms-text">{structureText}</p>
        <div className="ms-flap-box">
          <LiftFlap
            isOpen={open}
            onToggle={setOpen}
            hint={`${PC.lift} ↑`}
            top={
              <div className="ms-flap-top" style={{ backgroundImage: `url("${STAGE.paper.smallCard}")` }}>
                <h2>{PC.avoid}</h2>
                <span>{PC.lift} ↑</span>
              </div>
            }
            base={
              <div className="ms-flap-base" style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}>
                <h2>{PC.avoid}</h2>
                <p>{(PC.avoid_text as Record<string, string>)[sel]}</p>
              </div>
            }
          />
        </div>
      </section>

      {companions.length ? (
        <section className="ms-card">
          <h2 className="ms-h">{PC.withSheet}</h2>
          <p className="ms-hint">{PC.withHint}</p>
          <div className="ms-with">
            {companions.map((c) => {
              const isOff = off.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`ms-with-btn${isOff ? ' off' : ''}`}
                  aria-pressed={!isOff}
                  onClick={() => toggleOff(c.id)}
                >
                  <img src={c.src} alt="" loading="lazy" decoding="async" />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* The paper wheel from the 3D book, scaled to a phone: drag around to turn it, tap to step */
function StoryWheel({ years, sel, setSel }: { years: string[]; sel: number; setSel: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const live = useRef({ on: false, moved: false, p0: 0, a0: 0 });
  const n = Math.max(1, years.length);
  const step = 360 / Math.max(years.length, 6);
  const R = 400 * 0.36;

  const ang = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const down = (e: React.PointerEvent) => {
    live.current = { on: true, moved: false, p0: ang(e), a0: -sel * step };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!live.current.on) return;
    let d = ang(e) - live.current.p0;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    if (Math.abs(d) > 3) live.current.moved = true;
    setDrag(live.current.a0 + d);
  };
  const up = () => {
    if (!live.current.on) return;
    live.current.on = false;
    if (!live.current.moved) {
      setDrag(null);
      setSel((sel + 1) % n);
      snap();
      return;
    }
    if (drag !== null) {
      const t = Math.round(-drag / step);
      setSel(((t % n) + n) % n);
      snap();
    }
    setDrag(null);
  };
  const rot = drag !== null ? drag : -sel * step;

  return (
    <div className="ms-wheel-wrap">
      <div className="ms-wheel-scale">
        <div
          ref={ref}
          className="story-wheel-container"
          role="slider"
          aria-label="Bánh xe thời gian"
          aria-valuenow={sel + 1}
          aria-valuemin={1}
          aria-valuemax={n}
          tabIndex={0}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <div className={`story-wheel-rotating-layer${drag !== null ? ' is-dragging' : ''}`} style={{ transform: `rotate(${rot}deg)` }}>
            {years.map((y, i) => {
              const a = -45 + i * step;
              const rad = (a * Math.PI) / 180;
              return (
                <div
                  key={`${y}-${i}`}
                  className="story-wheel-year"
                  style={{ transform: `translate(-50%, -50%) translate(${R * Math.cos(rad)}px, ${R * Math.sin(rad)}px) rotate(${a + 90}deg)` }}
                >
                  {y}
                </div>
              );
            })}
          </div>
          <div className="story-wheel-cover" aria-hidden="true" />
        </div>
      </div>
      <span className="ms-wheel-hint">Xoay bánh xe để đi qua các thời kỳ</span>
    </div>
  );
}

/* ---------------- Chuyện áo ---------------- */
export function MobileStory() {
  useFlat();
  const desk = useDeskStyle();
  const { state } = useStore();
  const { chapter, side } = state;
  const g = garmentById(gidOf(chapter, side));
  const T = g?.timeline ?? [];
  const [sel, setSel] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSel(0);
  }, [chapter, side]);
  useEffect(() => {
    say(COPY.hints.story);
  }, [chapter]);
  useEffect(() => {
    const el = stripRef.current?.children[sel] as HTMLElement | undefined;
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [sel]);

  if (!g) return null;
  const e = T[sel];
  const sources = e
    ? e.source_ids.map((id) => {
        const s = sourceById(id) || SOURCES.find((x) => x.id === id);
        const title = s?.title || id;
        const after = title.includes(' — ') ? title.split(' — ')[1] : title;
        return after.replace(/\s*\([^)]*\)\s*$/, '').trim();
      })
    : [];
  const go = (d: number) => {
    if (!T.length) return;
    setSel((sel + d + T.length) % T.length);
    snap();
  };

  return (
    <div className="ms-root" style={desk}>
      <div className="ms-hero ms-hero-small">
        <img className="ms-thumb" src={fullSrc(chapter, side)} alt={g.name} />
        <div>
          <Eyebrow n="3" label={COPY.spreads.story} />
          <h1 className="ms-title ms-title-light">{g.name}</h1>
        </div>
      </div>

      <StoryWheel years={T.map((t) => t.year)} sel={sel} setSel={setSel} />

      <div className="ms-years" ref={stripRef}>
        {T.map((t, i) => (
          <button key={i} type="button" className={`ms-year${i === sel ? ' on' : ''}`} onClick={() => setSel(i)}>
            {t.year}
          </button>
        ))}
      </div>

      {e ? (
        <section className="ms-card ms-turn" key={sel}>
          <div className="ms-big-year">{e.year}</div>
          <h2 className="ms-h ms-h-lg">{e.title_vi}</h2>
          <p className="ms-text ms-text-lg">{e.text_vi}</p>
          {sources.length ? (
            <div className="ms-sources">
              <b>{COPY.story.source}</b> {sources.join(' · ')}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="ms-pager">
        <button type="button" className="ms-btn ghost" onClick={() => go(-1)}>
          ‹ {COPY.story.turn}
        </button>
        <span>
          {sel + 1}/{T.length}
        </span>
        <button type="button" className="ms-btn" onClick={() => go(1)}>
          {COPY.story.turn} ›
        </button>
      </div>
    </div>
  );
}

/* The easel with a pull tab: drag the tab and the slats turn to show the other garment */
function Easel({
  picA,
  picB,
  box,
  nameA,
  nameB,
  isViet,
}: {
  picA: string;
  picB: string;
  box?: number[];
  nameA: string;
  nameB: string;
  isViet: boolean;
}) {
  const CC = COPY.compare;
  const cardRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(340);
  const [t, setT] = useState(0);
  const [dragT, setDragT] = useState<number | null>(null);
  const live = useRef({ on: false, moved: false, x0: 0, t0: 0 });
  const H = 340;
  const winW = w - 52;
  const winH = H - 70;
  const slats = 12;
  const slatW = winW / slats;
  const travel = Math.max(80, w - 150);
  const eff = dragT !== null ? dragT : t;

  useEffect(() => {
    const fit = () => setW(cardRef.current?.clientWidth ?? 340);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const down = (e: React.PointerEvent) => {
    live.current = { on: true, moved: false, x0: e.clientX, t0: t };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!live.current.on) return;
    const dx = e.clientX - live.current.x0;
    if (Math.abs(dx) > 4) live.current.moved = true;
    setDragT(Math.max(0, Math.min(1, live.current.t0 + dx / travel)));
  };
  const up = () => {
    if (!live.current.on) return;
    live.current.on = false;
    if (!live.current.moved) setT(t >= 0.5 ? 0 : 1);
    else if (dragT !== null) setT(dragT >= 0.5 ? 1 : 0);
    snap();
    setDragT(null);
  };

  const img: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain' };
  return (
    <div className="ms-easel-block">
      <div className="compare-easel-card ms-easel" ref={cardRef} style={{ height: H }}>
        <div className="compare-easel-window" style={{ left: 26, right: 26, top: 26, bottom: 44 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: winW, height: winH }}>
            <img src={picA} alt={nameA} style={img} />
          </div>
          {Array.from({ length: slats }).map((_, k) => (
            <div
              key={k}
              className={`compare-slat${dragT !== null ? ' is-dragging' : ''}`}
              style={{ left: k * slatW, width: eff * slatW }}
              aria-hidden="true"
            >
              <div style={{ position: 'absolute', left: -k * slatW, top: 0, width: winW, height: winH }}>
                {box ? (
                  <img
                    src={picB}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: box[1] * winH,
                      height: (box[3] - box[1]) * winH,
                      left: ((box[0] + box[2]) / 2) * winW,
                      transform: 'translateX(-50%)',
                      width: 'auto',
                    }}
                  />
                ) : (
                  <img src={picB} alt="" style={img} />
                )}
              </div>
            </div>
          ))}
          <div className="compare-label-viet" style={{ opacity: eff > 0.5 ? 0.35 : 1 }}>
            {CC.viet}
          </div>
          <div className="compare-label-other" style={{ opacity: eff > 0.5 ? 1 : 0 }}>
            {nameB}
          </div>
          {!isViet ? (
            <div className="compare-stamp-not-viet" style={{ opacity: eff > 0.5 ? 1 : 0 }}>
              {CC.notViet}
            </div>
          ) : null}
        </div>
        <div className="compare-easel-slot-line" aria-hidden="true" />
      </div>
      <div className="ms-pull-track" aria-hidden="false">
        <button
          type="button"
          className={`compare-pull-tab ms-pull-tab${dragT !== null ? ' is-dragging' : ''}`}
          style={{ transform: `translateX(${eff * travel}px)` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="slider"
          aria-label={CC.pull}
          aria-valuenow={Math.round(eff * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {CC.pull} ›
        </button>
      </div>
    </div>
  );
}

/* ---------------- Đừng nhầm ---------------- */
interface Pair {
  otherName: string;
  otherImg?: string;
  otherDoll?: string;
  otherIsViet: boolean;
  box?: number[];
}

export function MobileCompare() {
  useFlat();
  const desk = useDeskStyle();
  const { state } = useStore();
  const { chapter, side } = state;
  const g = garmentById(gidOf(chapter, side));
  useEffect(() => {
    say(COPY.hints.compare);
  }, [chapter, side]);

  const map = COMPARE as unknown as Record<
    string,
    { nu: Pair | null; nam: Pair | null; hotspots?: { part: string }[] } | undefined
  >;
  const C = map[chapter] || map[gidOf(chapter, side)];
  const other: Side = side === 'nu' ? 'nam' : 'nu';
  let pair = C ? C[side] : null;
  let eff: Side = side;
  let note = '';
  if (!pair && C) {
    pair = C[other];
    eff = other;
    const label = (COPY.side as Record<string, string | undefined>)[other] || other;
    note = COPY.compare.otherSide.replace('{side}', label);
  }
  if (!g || !pair) return null;

  const CC = COPY.compare;
  const howVi = g.dont_confuse_with?.[0]?.how_vi || '';
  const keys: string[] = [];
  for (const k of [...(C?.hotspots?.map((h) => h.part) || []), 'collar', 'closure', 'sleeves', 'hem']) {
    if (!keys.includes(k)) keys.push(k);
    if (keys.length === 3) break;
  }
  const picA = fullSrc(chapter, eff);
  const picB = pair.otherImg || (pair.otherDoll ? fullSrc(pair.otherDoll, eff) : '');
  const otherG = pair.otherDoll ? garmentById(gidOf(pair.otherDoll, eff)) : undefined;
  const txt = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : v || '');

  return (
    <div className="ms-root" style={desk}>
      <section className="ms-card ms-card-top">
        <Eyebrow n="4" label={COPY.spreads.compare} />
        <h1 className="ms-title">
          {g.name} <span className="ms-neq">≠</span> {pair.otherName}
        </h1>
        {note ? <div className="ms-hint">{note}</div> : null}
      </section>

      <Easel
        picA={picA}
        picB={picB}
        box={pair.box}
        nameA={g.name}
        nameB={pair.otherName}
        isViet={pair.otherIsViet}
      />

      <section className="ms-card">
        <h2 className="ms-h">{CC.diff}</h2>
        <p className="ms-text ms-text-lg">{howVi}</p>
      </section>

      <section className="ms-card">
        <h2 className="ms-h">{CC.liftHint}</h2>
        {keys.map((k) => {
          const pa = partAt(g, k);
          const pb = pair!.box
            ? { x: pair!.box[0] + pa.x * (pair!.box[2] - pair!.box[0]), y: pair!.box[1] + pa.y * (pair!.box[3] - pair!.box[1]) }
            : otherG
            ? partAt(otherG, k)
            : pa;
          const ta = (g.structure as unknown as Record<string, string | string[] | undefined>)[k];
          const tb = (otherG?.structure as unknown as Record<string, string | string[] | undefined> | undefined)?.[k];
          return (
            <div key={k} className="ms-cflap">
              <LiftFlap
                hint={`${CC.flapHint}`}
                top={
                  <div className="ms-cflap-face">
                    <Lens src={picA} x={pa.x} y={pa.y} size={104} zoom={2.6} />
                    <div>
                      <b>{PART_LABELS_VI[k] || k} · {g.name}</b>
                      <span>{txt(ta)}</span>
                    </div>
                  </div>
                }
                base={
                  <div className="ms-cflap-face is-other">
                    {picB ? <Lens src={picB} x={pb.x} y={pb.y} size={104} zoom={2.6} /> : null}
                    <div>
                      <b>{PART_LABELS_VI[k] || k} · {pair!.otherName}</b>
                      <span>{txt(tb)}</span>
                    </div>
                  </div>
                }
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ---------------- Trang cuối ---------------- */
export function MobileLast() {
  useFlat();
  const desk = useDeskStyle();
  return (
    <div className="ms-root" style={desk}>
      <div className="ms-photo">
        <img src="/book/ban-3d.jpg" alt={COPY.back.pin || ''} />
      </div>
      <section className="ms-card">
        <h1 className="ms-title">{COPY.back.title}</h1>
        <p className="ms-text ms-text-lg">{COPY.back.line}</p>
      </section>
      <button
        type="button"
        className="ms-btn ms-cta"
        style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}
        onClick={() => go({ spread: 0, mobileStep: 1 })}
      >
        {COPY.spreads.meet}
      </button>
    </div>
  );
}
