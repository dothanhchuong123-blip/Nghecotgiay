import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COPY,
  COLORS,
  VIBES,
  MODERN_PIECES,
  ACCESSORIES,
  COMPANIONS,
  loadManifest,
  garmentById,
  gidOf,
  pieceName,
  modernById,
  accessoryById,
  vibeById,
  Manifest,
  Preset,
} from '../data';
import { closestLook, lookById, LookEntry } from '../preview/closest';
import LookMail from '../preview/LookMail';
import { useStore, setWeaveOpen } from '../state';
import PaperDoll from '../doll/PaperDoll';
import PatchLayer from '../mix/PatchLayer';
import { useMixSpreadState } from '../spreads/Mix';
import { usePieceColors, setPieceColor, clearPieceColors } from '../mix/pieceColors';
import { PIECE_SWATCHES } from '../mix/colour';
import { evaluateOutfit, fallbackFor } from '../mix/advice';
import { say } from '../nghe/say';
import { snap } from '../audio/paper';
import { exportCard } from '../share/card';
import { takePhoto, isPhotoMaking, subscribePhotoMaking } from '../nghe/photo';
import Lucky from '../spreads/Lucky';
import Lantern from '../spreads/Lantern';
import { whoosh } from '../audio/paper';
import { useDeskStyle } from './MobileMeet';
import './mobile-mix.css';

const GROUP_ORDER = ['over', 'under', 'bottom', 'feet', 'head', 'jewel', 'carry', 'waist'] as const;

export default function MobileMix() {
  const { state, dispatch } = useStore();
  const chapter = state.chapter;
  const side = state.side;
  const g = garmentById(gidOf(chapter, side));
  const defaultColorId = g?.colors_classic?.[0] || COLORS[0].id;
  const highestLevel = Math.max(...(g?.levels || [1]));
  const { worn, setWorn, colorId, setColorId, level, setLevel, vibe, setVibe, triggerSwap } = useMixSpreadState(
    chapter,
    side,
    defaultColorId,
    highestLevel
  );
  const pieceColors = usePieceColors();
  const desk = useDeskStyle();

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [group, setGroup] = useState<string>('all');
  const [shake, setShake] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [luckyOpen, setLuckyOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(isPhotoMaking());
  const [mailLook, setMailLook] = useState<{
    look: LookEntry;
    exact: boolean;
  } | null>(null);

  const vibeName = state.vibe ? (vibeById(state.vibe)?.name ?? null) : null;

  const handlePreviewClick = () => {
    const res = closestLook({
      side,
      gid: gidOf(chapter, side),
      colorId,
      vibe: state.vibe,
      worn,
    });
    if (res) {
      setMailLook(res);
    }
  };

  useEffect(() => subscribePhotoMaking(setPhotoBusy), []);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('mm-on', 'mx-on');
    return () => document.documentElement.classList.remove('mm-on', 'mx-on');
  }, []);

  useEffect(() => {
    loadManifest().then(setManifest).catch(() => {});
  }, []);

  const sidePieces = useMemo(
    () => new Set((manifest?.pieces ?? []).filter((p) => p.side === side).map((p) => p.id)),
    [manifest, side]
  );

  const layerOf = (id: string): string => {
    const m = modernById(id);
    if (m?.layer && m.layer !== 'swap') return m.layer;
    const p = manifest?.pieces.find((mp) => mp.id === id && mp.side === side);
    if (p?.layer) return p.layer;
    if (m?.layer === 'swap') return 'bottom';
    const cat = accessoryById(id)?.category;
    if (cat === 'Đầu') return 'head';
    if (cat === 'Trang sức') return 'jewel';
    if (cat === 'Cầm tay') return 'carry';
    if (cat === 'Chân') return 'feet';
    return 'waist';
  };

  const companions = useMemo(() => {
    const set = new Set<string>();
    const comps = COMPANIONS as Record<string, Record<string, string[]>>;
    for (const s of ['nu', 'nam']) for (const list of Object.values(comps[s] || {})) list.forEach((i) => set.add(i));
    return set;
  }, []);

  const conflicts = useMemo(() => new Set(g?.remix?.conflict || []), [g]);

  const stickers = useMemo(() => {
    const all = [...MODERN_PIECES, ...ACCESSORIES].filter(
      (i) => (!sidePieces.size || sidePieces.has(i.id)) && !companions.has(i.id)
    );
    const v = vibe ? VIBES.find((x) => x.id === vibe) : null;
    if (v?.affinity?.length) {
      const byId = new Map(all.map((s) => [s.id, s]));
      return v.affinity.map((id) => byId.get(id)).filter((x): x is (typeof all)[0] => Boolean(x));
    }
    const out: typeof all = [];
    for (const l of GROUP_ORDER) for (const p of all) if (layerOf(p.id) === l) out.push(p);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidePieces, companions, vibe, manifest]);

  const shown = group === 'all' ? stickers : stickers.filter((s) => layerOf(s.id) === group);
  const groups = GROUP_ORDER.filter((l) => stickers.some((s) => layerOf(s.id) === l));

  const colorHex = (COLORS.find((c) => c.id === colorId) || COLORS[0]).hex;

  const evaluation = useMemo(() => {
    if (!g) return null;
    return evaluateOutfit({ chapter, side, garment: g, worn, colorId, level, vibe }, pieceColors);
  }, [g, chapter, side, worn, colorId, level, vibe, pieceColors]);

  const recolorable = worn.filter((id) => (modernById(id) || accessoryById(id)) && id !== 'khan-ran');
  const targetId =
    colorTarget && recolorable.includes(colorTarget) ? colorTarget : recolorable[recolorable.length - 1] ?? null;

  const orderedColors = useMemo(() => {
    const ids = g?.colors_classic || [];
    const classics = ids.map((id) => COLORS.find((c) => c.id === id)).filter((c): c is (typeof COLORS)[0] => Boolean(c));
    return [...classics, ...COLORS.filter((c) => !ids.includes(c.id))].slice(0, 9);
  }, [g]);

  function tap(id: string) {
    if (conflicts.has(id)) {
      say(COPY.mix.blockedTap);
      setShake(id);
      setTimeout(() => setShake(null), 360);
      return;
    }
    if (worn.includes(id)) {
      setWorn((p) => p.filter((w) => w !== id));
    } else {
      const layer = layerOf(id);
      setWorn((p) => [...p.filter((w) => layerOf(w) !== layer), id]);
    }
    triggerSwap();
    snap();
  }

  function reset() {
    setWorn(() => []);
    clearPieceColors();
    setColorId(defaultColorId);
    setVibe(null);
    triggerSwap();
  }

  function applyPreset(preset: Preset) {
    setLevel(preset.level);
    setColorId(preset.base_color_id);
    setWorn(() => preset.pieceIds || []);
    triggerSwap();

    const look = lookById(preset.id);
    if (look) {
      setMailLook({ look, exact: true });
    }
  }

  async function makeCard() {
    if (making) return;
    setMaking(true);
    try {
      await exportCard({
        chapter,
        side,
        worn,
        colorId,
        level,
        material: state.material,
        vibe: state.vibe,
        paperPick: state.paperPick,
        weave: state.weave,
      });
    } catch (e) {
      console.error('Failed to export card:', e);
    } finally {
      setMaking(false);
    }
  }

  if (!g) return null;

  const advice = evaluation
    ? evaluation.issues[0] || fallbackFor(evaluation.band, evaluation.issues, evaluation.tips)
    : '';

  return (
    <div className="mx-root" style={desk}>
      <div className="mx-top">
        <div className="mx-lantern">
          <Lantern level={level} onLevelChange={(l) => setLevel(l)} allowedLevels={[1, 2, 3]} />
        </div>
        <div className="mx-doll">
          <PaperDoll
            side={side}
            chapter={chapter}
            worn={worn}
            colorHex={colorHex}
            pieceColors={pieceColors}
            height={Math.min(300, Math.round(window.innerHeight * 0.34))}
            className="mx-doll-fig"
          />
          <PatchLayer />
        </div>
        {evaluation ? (
          <div className={`mx-score band-${evaluation.band}`} aria-live="polite">
            <b>{Math.round(evaluation.score)}</b>
            <span>{COPY.mix.scoreUnit}</span>
          </div>
        ) : null}
        <p className="mx-advice">{advice}</p>
      </div>

      <div className="mx-tray" ref={scrollRef}>
        <div className="mx-label">{COPY.mix.vibes}</div>
        <div className="mx-chips">
          <button type="button" className={`mx-chip${!vibe ? ' on' : ''}`} onClick={() => setVibe(null)}>
            Tủ chung
          </button>
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`mx-chip${vibe === v.id ? ' on' : ''}`}
              onClick={() => {
                setVibe(vibe === v.id ? null : v.id);
                setGroup('all');
                say(v.desc);
              }}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div className="mx-label">{COPY.mix.sheet}</div>
        <div className="mx-chips">
          <button type="button" className={`mx-chip small${group === 'all' ? ' on' : ''}`} onClick={() => setGroup('all')}>
            Tất cả
          </button>
          {groups.map((l) => (
            <button
              key={l}
              type="button"
              className={`mx-chip small${group === l ? ' on' : ''}`}
              onClick={() => setGroup(l)}
            >
              {(COPY.mix.groups as Record<string, string>)[l] || l}
            </button>
          ))}
        </div>

        <div className="mx-grid">
          {shown.map((item) => {
            const on = worn.includes(item.id);
            const label = pieceName(item.id) || item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`mx-sticker${on ? ' worn' : ''}${shake === item.id ? ' shake' : ''}${conflicts.has(item.id) ? ' blocked' : ''}`}
                onClick={() => tap(item.id)}
                aria-label={label}
                aria-pressed={on}
              >
                <img src={`/doll/${side}/${item.id}.webp`} alt="" loading="lazy" decoding="async" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-label">{COPY.mix.colors}</div>
        <div className="mx-dots">
          {orderedColors.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`mx-dot${colorId === c.id ? ' on' : ''}`}
              style={{ backgroundColor: c.hex }}
              aria-label={c.name}
              onClick={() => {
                setColorId(c.id);
                say(c.name);
              }}
            />
          ))}
        </div>

        {targetId ? (
          <>
            <div className="mx-label">
              Màu cho {pieceName(targetId) || 'món này'}
              {recolorable.length > 1 ? (
                <span className="mx-targets">
                  {recolorable.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`mx-chip small${id === targetId ? ' on' : ''}`}
                      onClick={() => setColorTarget(id)}
                    >
                      {pieceName(id) || id}
                    </button>
                  ))}
                </span>
              ) : null}
            </div>
            <div className="mx-dots">
              <button
                type="button"
                className="mx-dot orig"
                aria-label="Màu gốc"
                onClick={() => {
                  setPieceColor(targetId, null);
                  triggerSwap();
                }}
              >
                ↺
              </button>
              {PIECE_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  className="mx-dot"
                  style={{ backgroundColor: sw.hex }}
                  aria-label={sw.name}
                  onClick={() => {
                    setPieceColor(targetId, sw.hex);
                    triggerSwap();
                    snap();
                  }}
                />
              ))}
            </div>
          </>
        ) : null}

        <button type="button" className="mx-weave" onClick={() => dispatch(setWeaveOpen(true))}>
          🧵 Đan khăn rằn
        </button>

        <div className="mx-actions">
          <button
            type="button"
            className="mx-btn alt"
            onClick={() => {
              whoosh();
              setLuckyOpen(true);
            }}
          >
            {COPY.mix.lucky}
          </button>
          <button
            type="button"
            className="mx-btn alt"
            disabled={photoBusy}
            onClick={() => takePhoto({ chapter, side, worn, colorId })}
          >
            📷 {COPY.photo.button}
          </button>
        </div>
        <div className="mx-actions">
          <button
            type="button"
            className="mx-btn alt"
            onClick={handlePreviewClick}
          >
            {COPY.preview.button}
          </button>
        </div>
        <div className="mx-actions">
          <button type="button" className="mx-btn ghost" onClick={reset}>
            {COPY.mix.reset}
          </button>
          <button type="button" className="mx-btn" onClick={makeCard} disabled={making}>
            {making ? COPY.mix.cardMaking : COPY.mix.card}
          </button>
        </div>
      </div>
      {luckyOpen ? (
        <Lucky
          chapter={chapter}
          side={side}
          onClose={() => setLuckyOpen(false)}
          onApplyPreset={(preset) => applyPreset(preset)}
        />
      ) : null}
      {mailLook && (
        <LookMail
          look={mailLook.look}
          exact={mailLook.exact}
          vibeName={vibeName}
          onClose={() => setMailLook(null)}
        />
      )}
    </div>
  );
}
