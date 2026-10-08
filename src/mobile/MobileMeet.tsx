import React, { useEffect, useRef, useState } from 'react';
import {
  STAGE,
  SCENES,
  COPY,
  OCCASIONS,
  PART_LABELS_VI,
  fullSrc,
  colorById,
} from '../data';
import { useStore } from '../state';
import { useGarment } from '../book/useGarment';
import { go } from '../book/turn';
import { currentPaper, paperBackground } from '../book/paper';
import { say } from '../nghe/say';
import { useReducedMotion } from '../paper/motion';
import './mobile-meet.css';

/* The diorama is drawn on the same 570-wide page the 3D book uses, then scaled to the phone. */
const W = 570;
const H = 660;
const LIFT_OFFSET = 70;

interface Layer {
  id: string;
  src: string;
  left?: number;
  right?: number;
  top: number;
  h: number;
  w?: number;
  depth: number;
  delay: number;
}

/* The same desk paper the 3D book lies on, at a size that suits a phone */
export function useDeskStyle(): React.CSSProperties {
  const { state } = useStore();
  const P = currentPaper(state);
  const bg = paperBackground(P).replace(/\/ \d+px auto/, '/ 900px auto');
  return { background: bg };
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const on = () => setPhone(window.innerWidth < 768);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return phone;
}

export default function MobileMeet() {
  const { state } = useStore();
  const g = useGarment();
  const reduced = useReducedMotion();
  const desk = useDeskStyle();
  const id = state.chapter;
  const side = state.side;
  const collage = state.collage;

  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<{ title: string; text: string; ok: boolean } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.64);

  useEffect(() => {
    document.documentElement.classList.add('mm-on');
    return () => document.documentElement.classList.remove('mm-on');
  }, []);

  useEffect(() => {
    const fit = () => {
      const w = stageRef.current?.parentElement?.clientWidth ?? window.innerWidth - 24;
      setScale(w / W);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    setNote(null);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [id, side]);

  const base = STAGE.base as unknown as Record<string, { x?: number; r?: number; y: number; h: number; w?: number; d: number }>;
  const scene = (SCENES as Record<string, { wings?: boolean; mid?: 'left' | 'right' | null; prop?: 'left' | 'right' } | undefined>)[id];
  const chapter = (STAGE.chapters as Record<string, { floor?: string; deco?: { id: string; src: string; x?: number; r?: number; y: number; h: number; lift?: number; level: number; d: number }[] } | undefined>)[id];

  const layers: Layer[] = [];
  const add = (l: Layer) => layers.push(l);
  const fromCfg = (key: string, src: string, id2: string, depth: number): Layer => {
    const c = base[key];
    return { id: id2, src, left: c.x, right: c.r, top: c.y - c.h + LIFT_OFFSET, h: c.h, depth, delay: c.d };
  };

  if (scene?.wings) {
    add(fromCfg('wing-l', `/popcard/${id}/wing-l.webp`, 'wing-l', 0.5));
    add(fromCfg('wing-r', `/popcard/${id}/wing-r.webp`, 'wing-r', 0.5));
  } else if (scene?.mid) {
    add(fromCfg(`mid-${scene.mid}`, `/popcard/${id}/mid.webp`, 'mid', 0.5));
  }
  if (scene?.prop) add(fromCfg(`prop-${scene.prop}`, `/popcard/${id}/prop.webp`, 'prop', 0.7));
  (chapter?.deco ?? [])
    .filter((d) => d.level <= collage)
    .forEach((d) =>
      add({ id: d.id, src: d.src, left: d.x, right: d.r, top: d.y - d.h - (d.lift ?? 0) + LIFT_OFFSET, h: d.h, depth: 0.35, delay: d.d })
    );
  const dollSrc = fullSrc(id, side);
  const doll: Layer = {
    id: 'doll',
    src: dollSrc,
    left: base.doll.x,
    top: base.doll.y - base.doll.h + LIFT_OFFSET,
    h: base.doll.h,
    w: base.doll.w,
    depth: 1,
    delay: base.doll.d,
  };
  layers.sort((a, b) => a.top + a.h - (b.top + b.h));

  const floor = chapter?.floor;
  const backSrc = `/popcard/${id}/back.webp`;
  const fgSrc = `/popcard/${id}/fg.webp`;
  const ok = (src: string) => !broken[src];
  const bad = (src: string) => () => setBroken((p) => ({ ...p, [src]: true }));

  function onMove(e: React.PointerEvent) {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  }

  function layerStyle(l: Layer): React.CSSProperties {
    const s: React.CSSProperties = {
      top: l.top,
      height: l.h,
      width: l.w ?? 'auto',
      ['--dx' as string]: `${tilt.x * -14 * l.depth}px`,
      ['--dy' as string]: `${tilt.y * -6 * l.depth}px`,
      animationDelay: reduced ? undefined : `${l.delay}s`,
    };
    if (l.left !== undefined) s.left = l.left;
    if (l.right !== undefined) s.right = l.right;
    return s;
  }

  if (!g) return null;

  const first = g.summary_vi ? (g.summary_vi.match(/^.*?[.!?](?:\s|$)/)?.[0] || g.summary_vi).trim() : '';
  const occs = OCCASIONS.filter((o) => g.occasion_rules && g.occasion_rules[o.id]);
  const icons = STAGE.occasionIcons as Record<string, string | undefined>;
  const parts: [string, string][] = [
    [PART_LABELS_VI['collar'] || 'Cổ áo', g.structure.collar],
    [PART_LABELS_VI['closure'] || 'Khuy / Cài', g.structure.closure],
    [PART_LABELS_VI['sleeves'] || 'Tay áo', g.structure.sleeves],
  ];

  function pickOcc(occId: string) {
    const rule = g!.occasion_rules[occId];
    const occ = OCCASIONS.find((o) => o.id === occId);
    setNote({ title: occ?.short || occId, text: rule.note_vi, ok: rule.status === 'ok' });
  }

  return (
    <div className="mm-root" ref={scrollRef} style={desk}>
      <div className="mm-stage-wrap" style={{ height: H * scale }}>
        <div
          className="mm-stage"
          ref={stageRef}
          style={{ width: W, height: H, transform: `scale(${scale})` }}
          onPointerMove={onMove}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        >
          {floor && ok(floor) ? <div className="mm-floor" style={{ backgroundImage: `url("${floor}")` }} /> : null}
          {ok(backSrc) ? (
            <img className="mm-back" src={backSrc} alt="" decoding="async" onError={bad(backSrc)} />
          ) : null}
          {layers.filter((l) => ok(l.src)).map((l) => (
            <img
              key={l.id}
              className={`mm-layer${reduced ? '' : ' mm-rise'}`}
              src={l.src}
              alt=""
              decoding="async"
              style={layerStyle(l)}
              onError={bad(l.src)}
            />
          ))}
          {ok(dollSrc) ? (
            <img
              key={dollSrc}
              className={`mm-layer mm-doll${reduced ? '' : ' mm-rise'}`}
              src={dollSrc}
              alt={g.name}
              decoding="async"
              style={{ ...layerStyle(doll), objectFit: 'contain' }}
              onError={bad(dollSrc)}
            />
          ) : null}
          {ok(fgSrc) ? (
            <img className="mm-fg" src={fgSrc} alt="" decoding="async" onError={bad(fgSrc)} />
          ) : null}
        </div>
      </div>

      <section className="mm-card">
        <div className="mm-eyebrow">{COPY.spreadPage.replace('{n}', '1')} · {COPY.spreads.meet}</div>
        <h1 className="mm-title">{g.name}</h1>
        <div className="mm-aka">
          <span>{COPY.meet.aka}</span> {g.aliases.join(' · ')} · {g.gender}
        </div>
        <p className="mm-lead">{first}</p>
        <div className="mm-period" style={{ backgroundImage: `url("${STAGE.paper.ribbon}")` }}>
          {g.period}
        </div>
      </section>

      <section className="mm-block">
        <h2 className="mm-h">{COPY.meet.tags}</h2>
        <div className="mm-parts">
          {parts.map(([t, txt]) => (
            <div key={t} className="mm-part" style={{ backgroundImage: `url("${STAGE.paper.tag}")` }}>
              <b>{t}</b>
              <span>{txt}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mm-block">
        <h2 className="mm-h">Màu cổ điển</h2>
        <div className="mm-colors">
          {g.colors_classic.map((cid) => {
            const c = colorById(cid);
            return (
              <div key={cid} className="mm-color">
                <i style={{ backgroundColor: c?.hex || cid }} />
                <span>{c?.name || cid}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mm-block">
        <h2 className="mm-h">{COPY.meet.occ}</h2>
        <div className="mm-occs">
          {occs.map((o) => {
            const rule = g.occasion_rules[o.id];
            const good = rule.status === 'ok';
            const active = note?.title === o.short;
            return (
              <button
                key={o.id}
                type="button"
                className={`mm-occ ${good ? 'is-ok' : 'is-caution'}${active ? ' is-on' : ''}`}
                onClick={() => pickOcc(o.id)}
                aria-label={`${o.short}: ${good ? COPY.meet.ok : COPY.meet.caution}`}
              >
                {icons[o.id] ? (
                  <img
                    src={icons[o.id]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span>{o.short}</span>
                <em>{good ? '✓' : '!'}</em>
              </button>
            );
          })}
        </div>
        {note ? (
          <p className={`mm-note ${note.ok ? 'is-ok' : 'is-caution'}`}>
            <b>{note.title}</b> {note.text}
          </p>
        ) : (
          <p className="mm-note mm-note-hint">Chạm vào một dịp để xem lời khuyên.</p>
        )}
      </section>

      <button type="button" className="mm-cta" onClick={() => go({ spread: 4 })} style={{ backgroundImage: `url("${STAGE.paper.redCard}")` }}>
        {COPY.meet.cta}
      </button>
    </div>
  );
}
