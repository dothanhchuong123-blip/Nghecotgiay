import { COPY, STAGE, COLORS } from '../data';
import { compose, loadImage } from '../doll/compose';
import { getStoredGeminiKey, openKeySlip } from './KeySlip';
import { say } from './say';

export interface TakePhotoOptions {
  chapter: string;
  side: 'nu' | 'nam';
  worn: string[];
  colorId?: string;
  colorHex?: string;
}

export interface PrintModalState {
  open: boolean;
  photoUrl: string;
  chapter: string;
  caption?: string;
}

let latestPhotoUrl: string | null = null;
export function getLatestPhoto(): string | null {
  return latestPhotoUrl;
}
export function setLatestPhoto(url: string | null): void {
  latestPhotoUrl = url;
}

// Print dialog listeners
type PrintListener = (state: PrintModalState) => void;
const printListeners = new Set<PrintListener>();

export function subscribePrint(fn: PrintListener) {
  printListeners.add(fn);
  return () => {
    printListeners.delete(fn);
  };
}

export function showPrint(photoUrl: string, chapter: string, caption?: string) {
  latestPhotoUrl = photoUrl;
  const state: PrintModalState = {
    open: true,
    photoUrl,
    chapter,
    caption,
  };
  printListeners.forEach((fn) => fn(state));
}

export function hidePrint() {
  const state: PrintModalState = {
    open: false,
    photoUrl: '',
    chapter: '',
  };
  printListeners.forEach((fn) => fn(state));
}

// Photo making status
let isMakingPhoto = false;
type MakingListener = (making: boolean) => void;
const makingListeners = new Set<MakingListener>();

export function isPhotoMaking(): boolean {
  return isMakingPhoto;
}

export function subscribePhotoMaking(fn: MakingListener) {
  makingListeners.add(fn);
  return () => {
    makingListeners.delete(fn);
  };
}

function setMaking(val: boolean) {
  isMakingPhoto = val;
  makingListeners.forEach((fn) => fn(val));
}

// Convert image url to base64 inlineData
async function fetchImageBase64(url: string, defaultMime = 'image/webp') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const mimeType = blob.type || defaultMime;
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

// Compose doll on floor for fallback
async function createFallbackPhoto(
  dollCanvas: HTMLCanvasElement,
  floorSrc: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;

  try {
    const floorImg = await loadImage(floorSrc);
    ctx.drawImage(floorImg, 0, 0, canvas.width, canvas.height);
  } catch {
    ctx.fillStyle = '#E8E1D5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw doll centered on the floor
  const dw = 520;
  const dh = (dollCanvas.height / dollCanvas.width) * dw;
  const dx = (canvas.width - dw) / 2;
  const dy = canvas.height - dh - 50;
  ctx.drawImage(dollCanvas, dx, dy, dw, dh);

  return canvas.toDataURL('image/png');
}

export async function takePhoto(options: TakePhotoOptions): Promise<void> {
  const P = COPY.photo;
  const { chapter, side, worn, colorId } = options;

  // 1. No key stored → open key slip with P.needKey. Stop.
  const apiKey = getStoredGeminiKey();
  if (!apiKey) {
    openKeySlip(P.needKey);
    return;
  }

  if (isMakingPhoto) return;
  setMaking(true);

  // 2. Nghê says P.making
  say(P.making);

  // Resolve colorHex
  let colorHex = options.colorHex;
  if (!colorHex && colorId) {
    colorHex = COLORS.find((c) => c.id === colorId)?.hex;
  }

  // 3. Prepare image 1: the composed doll
  let dollCanvas: HTMLCanvasElement;
  try {
    dollCanvas = await compose({
      side,
      chapter,
      worn,
      colorHex,
    });
  } catch (err) {
    console.error('Failed to compose doll for photo');
    setMaking(false);
    return;
  }

  const dollDataUrl = dollCanvas.toDataURL('image/png');
  const dollBase64 = dollDataUrl.split(',')[1];
  const dollPart = {
    inlineData: {
      mimeType: 'image/png',
      data: dollBase64,
    },
  };

  const floorSrc =
    (STAGE.chapters as Record<string, { floor?: string } | undefined>)?.[
      chapter
    ]?.floor || `/book/floor/${chapter}.webp`;
  const backSrc = `/popcard/${chapter}/back.webp`;
  const ngheSrc = '/book/nghe/rig/full.webp';

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), 60000);

  let failureStatus: number | null = null;
  let isTimeoutOrNet = false;

  try {
    // Fetch remaining reference images
    const [backPart, floorPart, nghePart] = await Promise.all([
      fetchImageBase64(backSrc),
      fetchImageBase64(floorSrc),
      fetchImageBase64(ngheSrc),
    ]);

    const promptText =
      'A photograph of a small handmade paper diorama on a table. The paper doll from image 1 stands in the middle wearing exactly the outfit in image 1 (same garment shape, same colours, every piece). Behind it, the paper landscape from image 2; under it, the printed floor from image 3. Beside it, the little paper guardian lion from image 4. Real cut paper with white cut edges and visible thickness, soft daylight, shallow depth of field. No text, no logo, no watermark.';

    const requestBody = {
      contents: [
        {
          parts: [
            dollPart,
            backPart,
            floorPart,
            nghePart,
            { text: promptText },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '4:5',
        },
      },
    };

    // Primary model: gemini-3.1-flash-image
    let apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent';

    let res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    // If 404 model not found, try gemini-3.1-flash-lite-image
    if (res.status === 404) {
      apiUrl =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent';
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    }

    if (!res.ok) {
      failureStatus = res.status;
      throw new Error(`Status ${res.status}`);
    }

    const data = await res.json();
    clearTimeout(timeoutTimer);

    // Take the first part with inlineData of an image type
    const candidateParts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = candidateParts.find(
      (p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('No image in response');
    }

    const mime = imagePart.inlineData.mimeType || 'image/jpeg';
    const photoUrl = `data:${mime};base64,${imagePart.inlineData.data}`;

    // Success: Nghê says P.done, show print
    say(P.done);
    showPrint(photoUrl, chapter, P.done);
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (controller.signal.aborted || err?.name === 'AbortError') {
      isTimeoutOrNet = true;
    }

    // 4. Failures handling:
    // 400/401/403 → open key slip with P.fail, {why} = P.why.key
    // 429 → P.fail with P.why.quota
    // anything else or timeout → P.fail with P.why.net
    let why = P.why.net;

    if (failureStatus === 400 || failureStatus === 401 || failureStatus === 403) {
      why = P.why.key;
    } else if (failureStatus === 429) {
      why = P.why.quota;
    } else if (isTimeoutOrNet) {
      why = P.why.net;
    }

    const failMsg = P.fail.replace('{why}', why);
    openKeySlip(failMsg);
    say(failMsg);

    // Show print with composed doll on floor picture captioned P.fallback
    const fallbackPhotoUrl = await createFallbackPhoto(dollCanvas, floorSrc);
    showPrint(fallbackPhotoUrl, chapter, P.fallback);
  } finally {
    setMaking(false);
  }
}
