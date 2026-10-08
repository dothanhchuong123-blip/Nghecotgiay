import React, { useEffect } from 'react';
import {
  STAGE,
  COPY,
  OCCASIONS,
  PART_LABELS_VI,
  colorById,
  sourceById,
  SOURCES,
} from '../data';
import { useGarment } from '../book/useGarment';
import { useStore } from '../state';
import { go } from '../book/turn';
import Stand from '../paper/Stand';
import { say } from '../nghe/say';
import './meet.css';

export default function MeetText() {
  const g = useGarment();
  const { dispatch } = useStore();

  const rCfg = STAGE.right;
  const paper = STAGE.paper;
  const occIcons = STAGE.occasionIcons as Record<string, string | undefined>;

  // Nghê speech bubble on this spread:
  // "the occasion's short name in bold, a space, then g.occasion_rules[id].note_vi.
  // It starts with the first occasion whose status is 'caution', else 'dao-pho'."
  useEffect(() => {
    if (!g || !g.occasion_rules) return;

    const cautionOcc = OCCASIONS.find(
      (o) => g.occasion_rules[o.id]?.status === 'caution'
    );
    const defaultOcc =
      cautionOcc ||
      OCCASIONS.find((o) => o.id === 'dao-pho') ||
      OCCASIONS[0];

    if (defaultOcc && g.occasion_rules[defaultOcc.id]) {
      const note = g.occasion_rules[defaultOcc.id].note_vi;
      say(`<strong>${defaultOcc.short}</strong> ${note}`);
    }
  }, [g]);

  if (!g) return null;

  // 1. Eyebrow: Trang 1 · Gặp áo
  const eyebrowText = `${COPY.spreadPage.replace('{n}', '1')} · ${COPY.spreads.meet}`;

  // 2. Lead: First sentence of summary_vi
  const firstSentence = g.summary_vi
    ? (g.summary_vi.match(/^.*?[.!?](?:\s|$)/)?.[0] || g.summary_vi).trim()
    : '';

  // 3. Sources clean line
  const cleanSources = g.sources.map((id) => {
    const s = sourceById(id) || SOURCES.find((x) => x.id === id);
    const title = s?.title || id;
    const afterDash = title.includes(' — ') ? title.split(' — ')[1] : title;
    return afterDash.replace(/\s*\([^)]*\)\s*$/, '').trim();
  });

  // 4. Period ribbon lines
  let periodLine1 = g.period;
  let periodLine2 = '';
  const periodMatch = g.period.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (periodMatch) {
    periodLine1 = periodMatch[1];
    periodLine2 = periodMatch[2];
  }

  // 5. Filter occasions present in g.occasion_rules
  const garmentOccasions = OCCASIONS.filter(
    (o) => g.occasion_rules && g.occasion_rules[o.id]
  );

  function handleOccasionClick(occId: string) {
    if (!g?.occasion_rules?.[occId]) return;
    const occ = OCCASIONS.find((o) => o.id === occId);
    const note = g.occasion_rules[occId].note_vi;
    const shortName = occ?.short || occId;
    say(`<strong>${shortName}</strong> ${note}`);
  }

  return (
    <div className="meet-text-page">
      {/* 1. Thin red frame lying on the page */}
      <div className="meet-red-frame" aria-hidden="true" />

      {/* 2. Title card */}
      <Stand
        x={rCfg.title.x}
        y={rCfg.title.y}
        w={rCfg.title.w}
        h={rCfg.title.h}
        d={rCfg.title.d}
        rest={rCfg.title.rest ?? 0.97}
        tabs={[120, rCfg.title.w - 166]}
        style={{ '--up': rCfg.title.rest ?? 0.97 } as React.CSSProperties}
      >
        <div
          className="meet-title-card"
          style={{ backgroundImage: `url("${paper.titleCard}")` }}
        >
          {/* Eyebrow */}
          <div className="meet-eyebrow">{eyebrowText}</div>

          {/* Garment name */}
          <h1 className="meet-title">{g.name}</h1>

          {/* AKA line */}
          <div className="meet-aka-line">
            <span className="meet-aka-label">{COPY.meet.aka}</span>{' '}
            {g.aliases.join(' · ')} · {g.gender}
          </div>

          {/* Lead */}
          <div className="meet-lead">{firstSentence}</div>

          {/* Sources line */}
          {cleanSources.length > 0 ? (
            <div className="meet-sources-line">
              <span className="meet-sources-label">{COPY.meet.sources}</span>{' '}
              {cleanSources.join(' · ')}
            </div>
          ) : null}

          {/* Period ribbon */}
          <div
            className="meet-ribbon"
            style={{ backgroundImage: `url("${paper.ribbon}")` }}
          >
            <span className="meet-ribbon-line1">{periodLine1}</span>
            {periodLine2 ? (
              <span className="meet-ribbon-line2">{periodLine2}</span>
            ) : null}
          </div>
        </div>
      </Stand>

      {/* 3. Hang-tags */}
      <Stand
        x={rCfg.tags.x}
        y={rCfg.tags.y}
        w={rCfg.tags.w}
        h={rCfg.tags.h}
        d={rCfg.tags.d}
        tabs={[90, rCfg.tags.w - 136]}
      >
        <div className="meet-tags-row">
          {/* Small black label */}
          <span className="meet-tags-badge">{COPY.meet.tags}</span>

          {/* Tag 1: collar */}
          <div
            className="meet-tag-item meet-tag-collar"
            style={{ backgroundImage: `url("${paper.tag}")` }}
          >
            <span className="meet-tag-title">
              {PART_LABELS_VI['collar'] || 'Cổ áo'}
            </span>
            <span className="meet-tag-text">{g.structure.collar}</span>
          </div>

          {/* Tag 2: closure */}
          <div
            className="meet-tag-item meet-tag-closure"
            style={{ backgroundImage: `url("${paper.tag}")` }}
          >
            <span className="meet-tag-title">
              {PART_LABELS_VI['closure'] || 'Khuy / Cài'}
            </span>
            <span className="meet-tag-text">{g.structure.closure}</span>
          </div>

          {/* Tag 3: sleeves */}
          <div
            className="meet-tag-item meet-tag-sleeves"
            style={{ backgroundImage: `url("${paper.tag}")` }}
          >
            <span className="meet-tag-title">
              {PART_LABELS_VI['sleeves'] || 'Tay áo'}
            </span>
            <span className="meet-tag-text">{g.structure.sleeves}</span>
          </div>
        </div>
      </Stand>

      {/* 4. Colours lying flat (not a Stand) */}
      <div
        className="meet-colors-row"
        style={{
          left: `${rCfg.colors.x}px`,
          top: `${rCfg.colors.y}px`,
          width: `${rCfg.colors.w}px`,
        }}
      >
        {g.colors_classic.map((cid) => {
          const c = colorById(cid);
          const colorName = c?.name || cid;
          const hex = c?.hex || cid;

          return (
            <div
              key={cid}
              className="meet-color-block"
              style={{ backgroundColor: hex }}
              title={colorName}
              aria-label={colorName}
            />
          );
        })}
      </div>

      {/* 5. Occasion card */}
      <Stand
        x={rCfg.occ.x}
        y={rCfg.occ.y}
        w={rCfg.occ.w}
        h={rCfg.occ.h}
        d={rCfg.occ.d}
        tabs={[70, rCfg.occ.w - 116]}
      >
        <div
          className="meet-occ-card"
          style={{ backgroundImage: `url("${paper.smallCard}")` }}
        >
          <div className="meet-occ-title">{COPY.meet.occ}</div>
          <div className="meet-occ-buttons">
            {garmentOccasions.map((occ) => {
              const rule = g.occasion_rules[occ.id];
              const isOk = rule.status === 'ok';
              const iconUrl = occIcons[occ.id];
              const ariaLabel = `${occ.short}: ${isOk ? COPY.meet.ok : COPY.meet.caution}`;

              return (
                <button
                  key={occ.id}
                  type="button"
                  onClick={() => handleOccasionClick(occ.id)}
                  aria-label={ariaLabel}
                  className={`meet-occ-btn ${isOk ? 'meet-occ-btn-ok' : 'meet-occ-btn-caution'}`}
                >
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="meet-occ-icon"
                    />
                  ) : null}
                  <span>{occ.short}</span>
                  <span>{isOk ? '✓' : '!'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Stand>

      {/* 6. The red card (CTA button) */}
      <Stand
        x={rCfg.cta.x}
        y={rCfg.cta.y}
        w={rCfg.cta.w}
        h={rCfg.cta.h}
        d={rCfg.cta.d}
      >
        <button
          type="button"
          onClick={() => go({ spread: 4 })}
          className="meet-cta-btn"
          style={{ backgroundImage: `url("${paper.redCard}")` }}
        >
          {COPY.meet.cta}
        </button>
      </Stand>
    </div>
  );
}
