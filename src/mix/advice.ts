import {
  Garment,
  COPY,
  LEVELS,
  colorById,
  modernById,
  accessoryById,
  tradById,
  vibeById,
  pieceName,
} from '../data';
import { Side } from '../state';
import { say } from '../nghe/say';
import { PieceColors, getPieceColors } from './pieceColors';
import { scoreAllWorlds, ScoreBand, Stars, WorldLevel, WorldScore } from './score';

export type { ScoreBand };

export interface OutfitAdviceParams {
  chapter: string;
  side: Side;
  garment: Garment;
  worn: string[];
  colorId: string;
  level: number;
  vibe: string | null;
}

export interface OutfitEvaluation {
  score: number;
  band: ScoreBand;
  issues: string[];
  tips: string[];
  stars: Stars;
  worlds: Record<WorldLevel, WorldScore>;
}

const MODEL = 'gemini-3.1-flash-lite';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Scores the outfit in the world it is in (params.level) and in the other two.
 * Rules: docs/MIX-RULES.md; weights per world: src/mix/score.ts.
 */
export function evaluateOutfit(
  params: OutfitAdviceParams,
  pieceColors: PieceColors = getPieceColors()
): OutfitEvaluation {
  const level = (params.level >= 1 && params.level <= 3 ? params.level : 2) as WorldLevel;
  const worlds = scoreAllWorlds(params, pieceColors);
  const here = worlds[level];
  return {
    score: here.score,
    band: here.band,
    issues: here.issues,
    tips: here.tips,
    stars: here.stars,
    worlds,
  };
}

/** The line Nghê says without the network: the canned band line, unless nothing is broken. */
export function fallbackFor(band: ScoreBand, issues: string[], tips: string[]): string {
  if (band !== 'high' && issues.length === 0 && tips.length > 0) return tips[0];
  return COPY.mix.scoreLines[band];
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentAbortController: AbortController | null = null;
let requestCounter = 0;

/**
 * Cancel any pending debounced call or in-flight advice request.
 */
export function cancelAdvice(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

/**
 * Schedules an advice request 1.2s after the outfit stops changing.
 * Nghê says COPY.mix.checking while waiting;
 * on success Nghê says the line (with the issue list under it);
 * on any failure COPY.mix.scoreLines[band] and, small under it, COPY.mix.offline.
 * Never blocks the UI.
 * Logs model, ms and ok/fail to the console.
 */
export function scheduleAdvice(params: OutfitAdviceParams): void {
  cancelAdvice();

  const thisRequestId = ++requestCounter;

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;

    const { garment, side, level, vibe, worn, colorId } = params;
    const { score, band, issues, tips, stars } = evaluateOutfit(params);

    // Nghê says COPY.mix.checking while waiting
    say(COPY.mix.checking);

    const controller = new AbortController();
    currentAbortController = controller;

    // 10s request timeout
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, 10000);

    const colorObj = colorById(colorId);
    const colorName = colorObj?.name || colorId;
    const levelName =
      (LEVELS as Record<string, { name?: string }>)[String(level)]?.name ||
      `Mức ${level}`;
    const vibeObj = vibe ? vibeById(vibe) : null;
    const vibeName = vibeObj ? vibeObj.name : null;

    const wornItems = worn.map((id) => {
      const name = pieceName(id) || id;
      const note_vi =
        modernById(id)?.note_vi ||
        accessoryById(id)?.note_vi ||
        tradById(id)?.note_vi ||
        '';
      return { name, note_vi };
    });

    const requestBody = {
      garment: {
        name: garment.name,
        summary_vi: garment.summary_vi,
        structure: garment.structure,
        must_show: garment.must_show,
      },
      side: (COPY.side as Record<string, string>)[side] || side,
      'level name': levelName,
      'vibe name': vibeName,
      worn: wornItems,
      'colour name': colorName,
      score,
      stars: {
        'giữ hồn áo': stars.hon,
        'hợp màu': stars.mau,
        'dám mix': stars.mix,
      },
      tips,
      issues,
    };

    const startTime = performance.now();

    try {
      const res = await fetch('/api/nghe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data || typeof data.line !== 'string' || !data.line.trim()) {
        throw new Error('Invalid line in response');
      }

      const elapsedMs = Math.round(performance.now() - startTime);
      console.log(`model: ${MODEL}, ${elapsedMs}ms, ok`);

      // If a newer request was made, do not overwrite speech
      if (thisRequestId !== requestCounter) return;

      const line = data.line.trim();
      let html = `<p>${escapeHtml(line)}</p>`;
      const notes = [...issues, ...tips];
      if (notes.length > 0) {
        html += `<ul>${notes
          .map((iss) => `<li>${escapeHtml(iss)}</li>`)
          .join('')}</ul>`;
      }
      say(html);
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      if (err?.name === 'AbortError' && thisRequestId !== requestCounter) {
        // Ignored because aborted by a newer outfit change
        return;
      }

      const elapsedMs = Math.round(performance.now() - startTime);
      console.log(`model: ${MODEL}, ${elapsedMs}ms, fail`);

      if (thisRequestId !== requestCounter) return;

      const fallbackLine = fallbackFor(band, issues, tips);
      const html = `<p>${escapeHtml(
        fallbackLine
      )}</p><small style="display:block;margin-top:4px;font-size:11px;color:var(--ink-2);">${escapeHtml(
        COPY.mix.offline
      )}</small>`;
      say(html);
    } finally {
      if (currentAbortController === controller) {
        currentAbortController = null;
      }
    }
  }, 1200);
}
