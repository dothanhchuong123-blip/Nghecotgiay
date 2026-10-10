import { rustle, rip } from '../audio/paper';
import { isReducedMotion } from '../paper/motion';

const SAY_START = [
  'Nghê đang gấp thuyền giấy…',
  'Gấp đôi tờ giấy dó…',
  'Gấp góc thành mũi thuyền…',
  'Sắp xong rồi…',
];
const SAY_SWITCH = 'Đang gấp lại cho vừa màn hình…';
const SAY_DONE = 'Thuyền giấy xong rồi!';

let mode: 'start' | 'switch' = 'switch';
let target = 0;
let shown = 0;
let wantHide = false;
let finale = false;
let pose = 1;
let poseAt = 0;
let snapFrom: { from: number; start: number } | null = null;
let tickerId: number | null = null;
let lastTick = 0;
let lastJitterAt = 0;
let cutX = 0;
let laterTimers: number[] = [];

function later(ms: number, fn: () => void): number {
  const id = window.setTimeout(() => {
    laterTimers = laterTimers.filter((t) => t !== id);
    fn();
  }, ms);
  laterTimers.push(id);
  return id;
}

function clearLaterTimers(): void {
  for (const id of laterTimers) {
    clearTimeout(id);
  }
  laterTimers = [];
}

function setBootSay(text: string): void {
  const sayEl = document.querySelector<HTMLElement>('#boot .boot-say');
  if (sayEl) {
    sayEl.textContent = text;
  }
}

function setPose(n: number): void {
  const imgs = document.querySelectorAll<HTMLImageElement>('#boot .boot-nghe img');
  imgs.forEach((img, idx) => {
    if (idx === n - 1) {
      img.classList.add('on');
    } else {
      img.classList.remove('on');
    }
    img.style.transform = '';
  });
}

function stopTicker(): void {
  if (tickerId !== null) {
    clearInterval(tickerId);
    tickerId = null;
  }
}

function startTicker(): void {
  if (tickerId !== null) return;
  lastTick = performance.now();
  tickerId = window.setInterval(tick, 50);
}

function runFinale(): void {
  finale = true;
  setBootSay(SAY_DONE);

  const boot = document.getElementById('boot');
  if (!boot) {
    stopTicker();
    return;
  }

  if (isReducedMotion()) {
    const anim = boot.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 280, fill: 'forwards', easing: 'ease' }
    );

    const onEnd = () => {
      boot.classList.add('gone');
      boot.style.opacity = '';
      stopTicker();
    };

    anim.onfinish = onEnd;
    anim.oncancel = onEnd;
    return;
  }

  // 1. Copy the .boot-col into BOTH .boot-half .piece elements (cloneNode(true)), make
  // both halves visibility visible, set original .boot-col opacity 0 (NOT visibility), hide .boot-paper.
  const origCol = boot.querySelector<HTMLElement>(':scope > .boot-col') ?? boot.querySelector<HTMLElement>('.boot-col');
  const leftPiece = boot.querySelector<HTMLElement>('.boot-half.l .piece');
  const rightPiece = boot.querySelector<HTMLElement>('.boot-half.r .piece');
  if (origCol && leftPiece && rightPiece) {
    leftPiece.appendChild(origCol.cloneNode(true));
    rightPiece.appendChild(origCol.cloneNode(true));
  }

  const halfL = boot.querySelector<HTMLElement>('.boot-half.l');
  const halfR = boot.querySelector<HTMLElement>('.boot-half.r');
  if (halfL) halfL.style.visibility = 'visible';
  if (halfR) halfR.style.visibility = 'visible';

  if (origCol) origCol.style.opacity = '0';

  const paper = boot.querySelector<HTMLElement>('.boot-paper');
  if (paper) paper.style.display = 'none';

  // 2. transform-origin of both halves = cutX px, innerHeight px (the bottom of the tear).
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const effectiveCutX = cutX || (typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.5) : 500);
  if (halfL) halfL.style.transformOrigin = `${effectiveCutX}px ${winHeight}px`;
  if (halfR) halfR.style.transformOrigin = `${effectiveCutX}px ${winHeight}px`;

  // 3. Tug, 160 ms: left half translateX 0 → -3px rotate(-.25deg) → -1px; right half the mirror.
  if (halfL) {
    halfL.animate(
      [
        { transform: 'translateX(0px) rotate(0deg)' },
        { transform: 'translateX(-3px) rotate(-0.25deg)' },
        { transform: 'translateX(-1px) rotate(0deg)' },
      ],
      { duration: 160, fill: 'forwards' }
    );
  }
  if (halfR) {
    halfR.animate(
      [
        { transform: 'translateX(0px) rotate(0deg)' },
        { transform: 'translateX(3px) rotate(0.25deg)' },
        { transform: 'translateX(1px) rotate(0deg)' },
      ],
      { duration: 160, fill: 'forwards' }
    );
  }

  // 4. Crack, from 160 ms, 360 ms: rip(); each half translateX(±1px) → translateX(±6px) rotate(±2.6deg),
  // easing cubic-bezier(.2,.7,.3,1), fill forwards (left negative, right positive): the gap opens from the top.
  later(160, () => {
    rip();
    if (halfL) {
      halfL.animate(
        [
          { transform: 'translateX(-1px) rotate(0deg)' },
          { transform: 'translateX(-6px) rotate(-2.6deg)' },
        ],
        {
          duration: 360,
          easing: 'cubic-bezier(.2,.7,.3,1)',
          fill: 'forwards',
        }
      );
    }
    if (halfR) {
      halfR.animate(
        [
          { transform: 'translateX(1px) rotate(0deg)' },
          { transform: 'translateX(6px) rotate(2.6deg)' },
        ],
        {
          duration: 360,
          easing: 'cubic-bezier(.2,.7,.3,1)',
          fill: 'forwards',
        }
      );
    }
  });

  // 5. Scraps: 22 <img class="boot-bit"> appended to #boot, src /book/loading/bits/part-N.webp (N random 1..26), width
  // 10–32px, onerror remove. Each starts at x = cutX ± 8px, y = random down the tear (yp = random^1.3 * 100 %), and
  // animates translate+rotate: scale .6 at start; at 30 %: x + dx*0.7, y + dy*0.2; end: x + dx, y + dy, rotate ±300°,
  // opacity 0; dx = ±(24..134)px, dy = 40..260px; duration 800–1300 ms; delay 160 + yp% of 324 ms (they follow the crack
  // down); easing cubic-bezier(.2,.6,.5,1), fill both.
  for (let i = 0; i < 22; i++) {
    const bit = document.createElement('img');
    bit.className = 'boot-bit';
    const n = Math.floor(Math.random() * 26) + 1;
    bit.src = `/book/loading/bits/part-${n}.webp`;
    bit.alt = '';
    const w = Math.round(10 + Math.random() * (32 - 10));
    bit.style.width = `${w}px`;
    bit.onerror = () => {
      bit.remove();
    };

    const startX = effectiveCutX + (Math.random() * 16 - 8);
    const r = Math.random();
    const yp = Math.pow(r, 1.3);
    const startY = yp * winHeight;

    const dxSign = Math.random() < 0.5 ? -1 : 1;
    const dxMag = 24 + Math.random() * (134 - 24);
    const dx = dxSign * dxMag;
    const dy = 40 + Math.random() * (260 - 40);

    const rotSign = Math.random() < 0.5 ? -1 : 1;
    const rotEnd = rotSign * 300;

    const duration = 800 + Math.random() * (1300 - 800);
    const delay = 160 + yp * 324;

    boot.appendChild(bit);

    bit.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px) scale(0.6) rotate(0deg)`,
        },
        {
          offset: 0.3,
          transform: `translate(${startX + dx * 0.7}px, ${startY + dy * 0.2}px) rotate(${rotEnd * 0.3}deg)`,
        },
        {
          transform: `translate(${startX + dx}px, ${startY + dy}px) rotate(${rotEnd}deg)`,
          opacity: 0,
        },
      ],
      {
        duration,
        delay,
        easing: 'cubic-bezier(.2,.6,.5,1)',
        fill: 'both',
      }
    );
  }

  // 6. Fall, delay 460 ms, 760 ms, easing cubic-bezier(.45,0,.9,.55), fill forwards: from translateX(±6px)
  // rotate(±2.6deg), at 35 % translate(±16vw, 6vh) rotate(±9deg), end translate(±70vw, 70vh) rotate(±28deg).
  later(460, () => {
    if (halfL) {
      halfL.animate(
        [
          { transform: 'translateX(-6px) rotate(-2.6deg)' },
          { offset: 0.35, transform: 'translate(-16vw, 6vh) rotate(-9deg)' },
          { transform: 'translate(-70vw, 70vh) rotate(-28deg)' },
        ],
        {
          duration: 760,
          easing: 'cubic-bezier(.45,0,.9,.55)',
          fill: 'forwards',
        }
      );
    }
    if (halfR) {
      halfR.animate(
        [
          { transform: 'translateX(6px) rotate(2.6deg)' },
          { offset: 0.35, transform: 'translate(16vw, 6vh) rotate(9deg)' },
          { transform: 'translate(70vw, 70vh) rotate(28deg)' },
        ],
        {
          duration: 760,
          easing: 'cubic-bezier(.45,0,.9,.55)',
          fill: 'forwards',
        }
      );
    }
  });

  // 7. After 1280 ms: add class "gone" to #boot and stop the ticker.
  later(1280, () => {
    boot.classList.add('gone');
    stopTicker();
  });
}

function tick(): void {
  const now = performance.now();
  let dt = (now - lastTick) / 1000;
  if (dt > 0.2) dt = 0.2;
  if (dt < 0) dt = 0;
  lastTick = now;

  const HOLD = 0.9;
  if (wantHide && shown >= 0.86) {
    if (!snapFrom) {
      snapFrom = { from: shown, start: now };
    }
    const elapsed = now - snapFrom.start;
    const k = Math.min(1, Math.max(0, elapsed / 320));
    shown = snapFrom.from + (1 - snapFrom.from) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) {
      shown = 1;
    }
  } else {
    snapFrom = null;
    const tau = wantHide
      ? 0.25
      : (mode === 'start' ? 1.0 : 0.5) * (1 - 0.5 * target);
    shown += (HOLD - shown) * (1 - Math.exp(-dt / tau));
  }

  if (shown > 1) shown = 1;
  if (shown < 0) shown = 0;

  const fill = document.querySelector<HTMLElement>('#boot .boot-fill');
  if (fill) {
    fill.style.width = `${4 + shown * 96}%`;
  }

  // Poses: wanted pose = 1 + how many of [0.28, 0.56, 0.8] shown has passed
  const thresholds = [0.28, 0.56, 0.8];
  let wantedPose = 1;
  for (const th of thresholds) {
    if (shown >= th) {
      wantedPose++;
    }
  }

  if (wantedPose > pose && now - poseAt >= 400) {
    pose += 1;
    poseAt = now;
    setPose(pose);
    rustle();
    if (mode === 'start') {
      setBootSay(SAY_START[pose - 1]);
    }
  }

  // Every 340 ms (not with reduced motion): rotate(random -1..1 deg) translateY(0 or -1px)
  if (!isReducedMotion()) {
    if (now - lastJitterAt >= 340) {
      lastJitterAt = now;
      const imgOn = document.querySelector<HTMLImageElement>('#boot .boot-nghe img.on');
      if (imgOn) {
        const rot = (Math.random() * 2 - 1).toFixed(2);
        const ty = Math.random() < 0.5 ? 0 : -1;
        imgOn.style.transform = `rotate(${rot}deg) translateY(${ty}px)`;
      }
    }
  }

  // When shown >= 1, wantHide, pose === 4 and 400 ms passed since the last pose change: runFinale()
  if (!finale && wantHide && shown >= 1 && pose === 4 && now - poseAt >= 400) {
    runFinale();
  }
}

export function bootProgress(p: number): void {
  const clamped = Math.max(0, Math.min(1, p));
  target = Math.max(target, clamped);
}

export function bootShow(modeArg: 'start' | 'switch' = 'switch'): void {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __bootPre?: number; __bootP?: number };
    if (w.__bootPre) {
      clearInterval(w.__bootPre);
      w.__bootPre = undefined;
    }
  }

  const bootP =
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __bootP?: number }).__bootP === 'number'
      ? (window as unknown as { __bootP?: number }).__bootP!
      : 0;

  mode = modeArg;
  wantHide = false;
  finale = false;
  snapFrom = null;

  clearLaterTimers();

  if (mode === 'start') {
    shown = Math.max(0, Math.min(1, bootP));
    target = shown;
  } else {
    shown = 0;
    target = 0;
  }

  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.remove('gone');
    boot.style.opacity = '';
    if (typeof boot.getAnimations === 'function') {
      boot.getAnimations({ subtree: true }).forEach((anim) => anim.cancel());
    }

    boot.querySelectorAll('.boot-bit').forEach((el) => el.remove());
    boot.querySelectorAll('.boot-half .piece .boot-col').forEach((el) => el.remove());

    const origCol =
      boot.querySelector<HTMLElement>(':scope > .boot-col') ??
      boot.querySelector<HTMLElement>('.boot-col');
    if (origCol) {
      origCol.style.opacity = '';
    }

    const paper = boot.querySelector<HTMLElement>('.boot-paper');
    if (paper) {
      paper.style.display = '';
      paper.style.visibility = '';
    }
  }

  for (let i = 1; i <= 26; i++) {
    const scrapImg = new Image();
    scrapImg.src = `/book/loading/bits/part-${i}.webp`;
  }

  const now = performance.now();
  pose = 1;
  poseAt = now;
  lastJitterAt = now;
  setPose(1);

  if (mode === 'start') {
    setBootSay(SAY_START[0]);
  } else {
    setBootSay(SAY_SWITCH);
  }

  const fill = document.querySelector<HTMLElement>('#boot .boot-fill');
  if (fill) {
    fill.style.width = `${4 + shown * 96}%`;
  }

  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const cutFactor = 0.47 + Math.random() * (0.53 - 0.47);
  cutX = Math.round(winWidth * cutFactor);

  const halves = document.querySelectorAll<HTMLElement>('#boot .boot-half');
  halves.forEach((half) => {
    half.style.visibility = '';
    half.style.transformOrigin = '';
    half.style.transform = '';
    half.style.setProperty('--cut', `${cutX}px`);
  });

  stopTicker();
  startTicker();
}

export function bootHide(): void {
  wantHide = true;
  startTicker();
}

export function waitForScreen(
  onProgress?: (progress: number) => void,
  timeoutMs: number = 3000
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const timer = setTimeout(finish, timeoutMs);

    (async () => {
      try {
        // Wait two animation frames raced with 200 ms timer
        await new Promise<void>((res) => {
          let framesDone = false;
          const frameTimer = setTimeout(() => {
            if (!framesDone) {
              framesDone = true;
              res();
            }
          }, 200);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!framesDone) {
                framesDone = true;
                clearTimeout(frameTimer);
                res();
              }
            });
          });
        });

        // then 120 ms
        await new Promise<void>((res) => setTimeout(res, 120));

        if (resolved) return;

        // collect the URLs of every visible, on-screen <img> in #root and every on-screen CSS background-image url in #root (skip data: and display:none/visibility:hidden)
        const root = document.getElementById('root');
        const urls = new Set<string>();

        if (root && typeof window !== 'undefined') {
          const vw = window.innerWidth || document.documentElement.clientWidth;
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') {
              continue;
            }

            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
              continue;
            }
            if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
              continue;
            }

            if (el instanceof HTMLImageElement && el.src) {
              const src = el.currentSrc || el.src;
              if (src && !src.startsWith('data:')) {
                urls.add(src);
              }
            }

            const bg = style.backgroundImage;
            if (bg && bg !== 'none') {
              const matches = bg.matchAll(/url\(["']?(.*?)["']?\)/g);
              for (const m of matches) {
                const url = m[1]?.trim();
                if (url && !url.startsWith('data:')) {
                  urls.add(url);
                }
              }
            }
          }
        }

        const urlList = Array.from(urls);
        const hasFonts =
          typeof document !== 'undefined' &&
          Boolean(document.fonts && document.fonts.ready);
        const total = urlList.length + (hasFonts ? 1 : 0);
        let done = 0;

        const checkItemDone = () => {
          done++;
          if (onProgress && total > 0) {
            onProgress(Math.min(1, done / total));
          }
        };

        if (total === 0) {
          if (onProgress) onProgress(1);
          clearTimeout(timer);
          finish();
          return;
        }

        const imagePromises = urlList.map((url) => {
          return new Promise<void>((res) => {
            const img = new Image();
            img.src = url;
            if (typeof img.decode === 'function') {
              img
                .decode()
                .catch(() => {})
                .finally(() => {
                  checkItemDone();
                  res();
                });
            } else {
              img.onload = () => {
                checkItemDone();
                res();
              };
              img.onerror = () => {
                checkItemDone();
                res();
              };
            }
          });
        });

        const fontPromise = hasFonts
          ? document.fonts.ready
              .catch(() => {})
              .finally(() => {
                checkItemDone();
              })
          : Promise.resolve();

        await Promise.all([...imagePromises, fontPromise]);
        clearTimeout(timer);
        finish();
      } catch {
        clearTimeout(timer);
        finish();
      }
    })();
  });
}
