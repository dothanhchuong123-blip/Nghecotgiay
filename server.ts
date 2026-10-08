import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  gidOf,
  GARMENTS,
  VIBES,
  LEVELS,
  SOURCES,
  pieceName,
  COLORS,
} from './src/data';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION =
  "Bạn là Nghê, một chú nghê giấy nhỏ, nói về mình là 'Nghê'. Bạn chấm bộ phối Việt phục cho bạn trẻ. Viết đúng MỘT câu tiếng Việt, tối đa 25 chữ, giọng Gen Z vui, thân thiện, có thể dùng tiếng lóng tiếng Việt (ví dụ: đỉnh nóc, ổn áp, chuẩn bài, keo lì) nhưng không dùng từ tiếng Anh, không chê bai người mặc. Chỉ nói về những món và lỗi được đưa vào; không tự thêm kiến thức lịch sử. Nếu có lỗi, gợi ý một cách sửa. Nếu có 'tips' về màu, có thể nhắc một tip bằng lời của bạn; 'stars' là ba điểm thành phần, hãy khen điểm cao nhất.";

const CHAT_SYSTEM_INSTRUCTION =
  "Bạn là Nghê, một chú nghê giấy nhỏ trong cuốn sách pop-up về Việt phục, nói về mình là 'Nghê'. Trả lời bằng tiếng Việt, giọng Gen Z vui và thân thiện, tối đa 60 chữ. Chỉ dùng kiến thức trong phần DỮ LIỆU được đưa vào; nếu dữ liệu không có, nói thật là Nghê chưa biết và gợi ý một câu hỏi khác. Không bịa năm, tên người hay nguồn. Nếu người dùng nhờ phối đồ, chọn món chỉ trong danh sách món được đưa vào và trả về trong 'action'.";

// Load doll manifest for wearable piece verification
let cachedManifestPieces: Array<{ id: string; side?: string }> = [];
try {
  const manifestPath = path.resolve(__dirname, 'public/doll/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    cachedManifestPieces = raw.pieces || [];
  }
} catch (e) {
  console.error('[server] Error reading manifest.json:', e);
}

app.post('/api/nghe', async (req, res) => {
  const timeoutMs = 10000;
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const body = req.body || {};
    const garment = body.garment || {};
    const side = body.side;
    const levelName = body['level name'] ?? body.levelName ?? body.level;
    const vibeName = body['vibe name'] ?? body.vibeName ?? body.vibe;
    const worn = body.worn || [];
    const colourName = body['colour name'] ?? body.colourName ?? body.colour;
    const score = body.score;
    const issues = body.issues || [];
    const stars = body.stars;
    const tips = body.tips || [];

    const promptPayload = {
      garment: {
        name: garment.name,
        summary_vi: garment.summary_vi,
        structure: garment.structure,
        must_show: garment.must_show,
      },
      side,
      'level name': levelName,
      'vibe name': vibeName,
      worn,
      'colour name': colourName,
      score,
      stars,
      tips,
      issues,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: JSON.stringify(promptPayload),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            line: {
              type: Type.STRING,
              description:
                'Đúng MỘT câu tiếng Việt, tối đa 25 chữ, giọng Gen Z vui, thân thiện.',
            },
          },
          required: ['line'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: abortController.signal,
      },
    });

    clearTimeout(timer);

    const text = response.text?.trim() || '';
    let parsed: { line?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        line: text
          .replace(/^[\s"'{]+line[\s"':]+/, '')
          .replace(/["'}]+$/, '')
          .trim(),
      };
    }

    if (!parsed.line) {
      return res.status(500).json({ error: 'Empty line in response' });
    }

    return res.json({ line: parsed.line });
  } catch (error: any) {
    clearTimeout(timer);
    const isTimeout =
      abortController.signal.aborted || error?.name === 'AbortError';
    console.error(
      '[API /api/nghe error]',
      isTimeout ? 'Timeout 10s' : error?.message || error
    );
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Gateway Timeout' : 'Internal Server Error',
      message: error?.message,
    });
  }
});

app.post('/api/nghe-chat', async (req, res) => {
  const model = 'gemini-3.1-flash-lite';
  const timeoutMs = 12000;
  const startMs = Date.now();
  let ok = false;

  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question : '';
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const chapter = typeof body.chapter === 'string' ? body.chapter : 'ao-giao-linh';
    const side = body.side === 'nam' ? 'nam' : 'nu';
    const spread = typeof body.spread === 'number' ? body.spread : 0;
    const outfit = body.outfit || {};

    // 1. Build garment context from src/data
    const gid = gidOf(chapter, side);
    const garment = GARMENTS.find((g) => g.id === gid) || GARMENTS[0];
    const sourceTitles = (garment.sources || [])
      .map((sId) => SOURCES.find((s) => s.id === sId)?.title || sId)
      .filter(Boolean);

    // 2. Build wearable piece list for this side
    const sidePieces = cachedManifestPieces.filter(
      (p) => !p.side || p.side === side || p.side === 'both' || p.side === 'all'
    );
    const validPieceIds = new Set<string>();
    const wearableList: Array<{ id: string; name: string }> = [];
    for (const p of sidePieces) {
      if (!validPieceIds.has(p.id)) {
        validPieceIds.add(p.id);
        wearableList.push({ id: p.id, name: pieceName(p.id) || p.id });
      }
    }

    // Valid vibes, levels, and colors for sanitization
    const validVibeIds = new Set(VIBES.map((v) => v.id));
    const validColorIds = new Set(COLORS.map((c) => c.id));

    const contextPayload = {
      garment: {
        name: garment.name,
        aliases: garment.aliases,
        period: garment.period,
        summary_vi: garment.summary_vi,
        history_vi: garment.history_vi,
        structure: garment.structure,
        timeline: garment.timeline,
        occasion_rules: garment.occasion_rules,
        dont_confuse_with: garment.dont_confuse_with,
        sources: sourceTitles,
      },
      wearable_pieces: wearableList,
      vibes: VIBES.map((v) => ({ id: v.id, name: v.name })),
      levels: LEVELS,
      current_state: {
        chapter,
        side,
        spread,
        outfit,
      },
    };

    const promptText = `DỮ LIỆU:\n${JSON.stringify(contextPayload)}\n\nLỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n${JSON.stringify(history)}\n\nCÂU HỎI:\n${question}`;

    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Câu trả lời của Nghê bằng tiếng Việt, tối đa 60 chữ.',
            },
            action: {
              type: Type.OBJECT,
              description: 'Hành động phối đồ nếu người dùng yêu cầu, hoặc null.',
              properties: {
                worn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Danh sách piece id được chọn từ wearable_pieces.',
                },
                vibe: {
                  type: Type.STRING,
                  description: 'ID của vibe được chọn từ danh sách vibes.',
                },
                level: {
                  type: Type.INTEGER,
                  description: 'Cấp độ phối (1, 2 hoặc 3).',
                },
                colorId: {
                  type: Type.STRING,
                  description: 'ID màu sắc của áo.',
                },
              },
            },
          },
          required: ['reply'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: abortController.signal,
      },
    });

    clearTimeout(timer);

    const rawText = response.text?.trim() || '';
    let parsed: {
      reply?: string;
      action?: {
        worn?: string[];
        vibe?: string;
        level?: number;
        colorId?: string;
      } | null;
    } = {};

    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        reply: rawText,
        action: null,
      };
    }

    if (!parsed.reply) {
      throw new Error('Missing reply from model');
    }

    // Sanitize action: drop any ID that is not in the lists
    let sanitizedAction: {
      worn?: string[];
      vibe?: string;
      level?: 1 | 2 | 3;
      colorId?: string;
    } | null = null;

    if (parsed.action && typeof parsed.action === 'object') {
      const act = parsed.action;
      const cleanWorn = Array.isArray(act.worn)
        ? act.worn.filter((id) => typeof id === 'string' && validPieceIds.has(id))
        : undefined;

      const cleanVibe =
        typeof act.vibe === 'string' && validVibeIds.has(act.vibe)
          ? act.vibe
          : undefined;

      const cleanLevel =
        act.level === 1 || act.level === 2 || act.level === 3
          ? (act.level as 1 | 2 | 3)
          : undefined;

      const cleanColor =
        typeof act.colorId === 'string' && validColorIds.has(act.colorId)
          ? act.colorId
          : undefined;

      if (
        cleanWorn?.length ||
        cleanVibe !== undefined ||
        cleanLevel !== undefined ||
        cleanColor !== undefined
      ) {
        sanitizedAction = {
          worn: cleanWorn,
          vibe: cleanVibe,
          level: cleanLevel,
          colorId: cleanColor,
        };
      }
    }

    ok = true;
    return res.json({
      reply: parsed.reply,
      action: sanitizedAction,
    });
  } catch (err: any) {
    clearTimeout(timer);
    return res.status(500).json({
      error: 'Error processing chat',
      message: err?.message,
    });
  } finally {
    const duration = Date.now() - startMs;
    // Log model, ms and ok/fail to the console. Never log the question text.
    console.log(`[nghe-chat] model: ${model} | ${duration}ms | ${ok ? 'ok' : 'fail'}`);
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const args = process.argv.slice(2);
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
