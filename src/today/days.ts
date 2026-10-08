import weatherJson from '../data/weather.json';
import dollDataJson from '../data/doll-data.json';
import {
  READY,
  COLORS,
  garmentById,
  modernById,
  accessoryById,
  tradById,
  pieceName,
  vibeById,
} from '../data';

export const CITY_KEY = 'nghe-today-city';

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
}

export const CITIES: City[] = weatherJson.cities as City[];
export const WEEKDAY_VI: string[] = weatherJson.weekday_vi;
export const WX_ICONS: Record<string, string> = weatherJson.icons;

export function cityById(id?: string | null): City {
  if (id) {
    const found = CITIES.find((c) => c.id === id);
    if (found) return found;
  }
  return (
    CITIES.find((c) => c.id === weatherJson.default_city) ??
    CITIES[0]
  );
}

export interface LunarDate {
  day: number;
  month: number;
  leap: boolean;
  year: number;
  year_vi: string;
}

function toDateStr(date: Date | string): string {
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    return toDateStr(d);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(str: string): [number, number, number] {
  const [y, m, d] = str.split('-').map(Number);
  return [y, m, d];
}

function daysBetween(startStr: string, endStr: string): number {
  const [y1, m1, d1] = parseYMD(startStr);
  const [y2, m2, d2] = parseYMD(endStr);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function lunarOf(date: Date | string = new Date()): LunarDate {
  const dateStr = toDateStr(date);
  const lunarList = weatherJson.lunar;
  let activeEntry = lunarList[0];

  for (const entry of lunarList) {
    if (entry.start <= dateStr) {
      activeEntry = entry;
    } else {
      break;
    }
  }

  const diff = daysBetween(activeEntry.start, dateStr);
  const day = activeEntry.day1 + diff;

  return {
    day,
    month: activeEntry.month,
    leap: activeEntry.leap,
    year: activeEntry.year,
    year_vi: activeEntry.year_vi,
  };
}

export interface NextHoliday {
  name: string;
  note: string;
  inDays: number;
}

export function nextHoliday(date: Date | string = new Date()): NextHoliday | null {
  const dateStr = toDateStr(date);
  for (const h of weatherJson.holidays) {
    const diff = daysBetween(dateStr, h.date);
    if (diff >= 0 && diff <= 60) {
      return {
        name: h.name,
        note: h.note_vi,
        inDays: diff,
      };
    }
  }
  return null;
}

export interface Wx {
  t: number;
  band: string;
  rain: boolean;
  storm: boolean;
  live: boolean;
}

export function bandOf(t: number): string {
  for (const b of weatherJson.bands) {
    if (t >= b.min && t <= b.max) {
      return b.id;
    }
  }
  if (t > 99) return 'nong';
  if (t < -50) return 'lanh';
  return 'am';
}

export function manualWx(chip: string): Wx {
  const temps = weatherJson.manual_temp as Record<string, number>;
  const t = temps[chip] ?? 26;
  const isMua = chip === 'mua';
  const band = isMua ? bandOf(t) : (weatherJson.bands.some((b) => b.id === chip) ? chip : bandOf(t));
  return {
    t,
    band,
    rain: isMua,
    storm: false,
    live: false,
  };
}

export async function fetchWx(city: City | string): Promise<Wx | null> {
  try {
    const c = typeof city === 'string' ? cityById(city) : city;
    if (!c) return null;

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('nghe-today-wx');
        if (raw) {
          const cache = JSON.parse(raw);
          const entry = cache[c.id];
          if (entry && Date.now() - entry.timestamp < weatherJson.api.cache_minutes * 60 * 1000) {
            return entry.wx as Wx;
          }
        }
      } catch {
        // Ignore cache read errors
      }
    }

    const url = weatherJson.api.url
      .replace('{lat}', String(c.lat))
      .replace('{lon}', String(c.lon));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), weatherJson.api.timeout_ms);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();

    const currentT = data.current?.temperature_2m;
    const maxT = data.daily?.temperature_2m_max?.[0];
    const rawT = currentT ?? maxT;
    if (rawT === undefined || rawT === null) return null;
    const t = Math.round(rawT);

    const code = data.current?.weather_code;
    const prob = data.daily?.precipitation_probability_max?.[0] ?? 0;
    const rain =
      (code !== undefined && weatherJson.api.rain_codes.includes(code)) ||
      prob >= weatherJson.api.rain_probability;

    const storm = code !== undefined && weatherJson.storm_codes.includes(code);

    const band = bandOf(t);
    const wx: Wx = { t, band, rain, storm, live: true };

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('nghe-today-wx');
        const cache = raw ? JSON.parse(raw) : {};
        cache[c.id] = { wx, timestamp: Date.now() };
        localStorage.setItem('nghe-today-wx', JSON.stringify(cache));
      } catch {
        // Ignore cache write errors
      }
    }

    return wx;
  } catch {
    return null;
  }
}

export function wxIcon(wx: Wx): string {
  if (wx.storm) return weatherJson.icons.dong;
  if (wx.rain) return weatherJson.icons.mua;
  return (weatherJson.icons as Record<string, string>)[wx.band] ?? weatherJson.icons.am;
}

export function wxName(wx: Wx): string {
  if (wx.storm) return 'Dông';
  if (wx.rain) return weatherJson.rain.name;
  const bandObj = weatherJson.bands.find((b) => b.id === wx.band);
  return bandObj?.name ?? 'Ấm';
}

function pieceLayer(id: string): string {
  const m = modernById(id);
  if (m?.layer) {
    return m.layer === 'swap' ? 'bottom' : m.layer;
  }
  const a = accessoryById(id);
  if (a?.category) {
    if (a.category === 'Đầu') return 'head';
    if (a.category === 'Trang sức') return 'jewel';
    if (a.category === 'Cầm tay' || a.category === 'Túi') return 'carry';
    if (a.category === 'Chân') return 'feet';
  }
  const t = tradById(id);
  if (t) return 'bottom';
  return 'misc';
}

function createRng(seed: number | string) {
  let s = 0;
  if (typeof seed === 'number') {
    s = seed | 0;
  } else if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    }
  }
  return function rand(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Look {
  chapter: string;
  vibe: string;
  worn: string[];
  colorIdx: number;
  say: string;
}

export function pickLook(
  date: Date | string = new Date(),
  wx: Wx,
  side: 'nu' | 'nam' = 'nu',
  seed: number | string = 0
): Look {
  const rand = createRng(seed);
  const dateStr = toDateStr(date);
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const holiday = nextHoliday(dateStr);
  const isHolidayToday = holiday !== null && holiday.inDays === 0;
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 1) Gu from the day
  let candidateVibes: string[];
  if (isHolidayToday) {
    candidateVibes = ['le-hoi', 'hoai-co'];
  } else if (isWeekend) {
    candidateVibes = weatherJson.days.weekend.vibes;
  } else {
    candidateVibes = weatherJson.days.weekday.vibes;
  }
  const vibe = candidateVibes[Math.floor(rand() * candidateVibes.length)] || 'toi-gian';

  // 2) Áo from the band's lean_garments that are READY (else any READY)
  const bandObj =
    weatherJson.bands.find((b) => b.id === wx.band) ?? weatherJson.bands[0];
  const lean = bandObj.lean_garments?.filter((g) => READY.includes(g)) ?? [];
  let candidateGarments = lean.length > 0 ? lean : READY;

  if (side === 'nam') {
    const sideFiltered = candidateGarments.filter((id) => {
      const g = garmentById(id);
      return g ? g.gender === 'all' || g.gender === 'nam' : true;
    });
    if (sideFiltered.length > 0) {
      candidateGarments = sideFiltered;
    }
  }

  const chapter =
    candidateGarments[Math.floor(rand() * candidateGarments.length)] || READY[0];
  const garment = garmentById(chapter);

  // 3) Up to 3 of the gu's affinity pieces that have a sticker for this side, one per layer,
  // not in the band's avoid (+ rain avoid + the áo's remix.conflict), bulk <= max_bulk
  const avoidSet = new Set<string>([
    ...(bandObj.avoid ?? []),
    ...(wx.rain ? weatherJson.rain.avoid : []),
    ...(garment?.remix?.conflict ?? []),
  ]);
  const maxBulk = bandObj.max_bulk ?? 1;

  const vibeObj = vibeById(vibe);
  const affinityList = vibeObj?.affinity ?? [];

  const validAffinity = affinityList.filter((id) => {
    const sideRule = (dollDataJson.PIECE_SIDE as Record<string, string>)[id];
    const hasSticker = sideRule === side || sideRule === 'both';
    if (!hasSticker) return false;
    if (avoidSet.has(id)) return false;
    const bulk = modernById(id)?.bulk ?? 0;
    if (bulk > maxBulk) return false;
    return true;
  });

  // Shuffle affinity with seeded rand
  const shuffledAffinity = [...validAffinity];
  for (let i = shuffledAffinity.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffledAffinity[i], shuffledAffinity[j]] = [shuffledAffinity[j], shuffledAffinity[i]];
  }

  const worn: string[] = [];
  const usedLayers = new Set<string>(['ao']);

  for (const id of shuffledAffinity) {
    if (worn.length >= 3) break;
    const layer = pieceLayer(id);
    if (!usedLayers.has(layer)) {
      worn.push(id);
      usedLayers.add(layer);
    }
  }

  // Then one extra from rain.extras / band.extras
  const rawExtras = wx.rain
    ? [...weatherJson.rain.extras, ...(bandObj.extras ?? [])]
    : (bandObj.extras ?? []);

  const candidateExtras = Array.from(new Set(rawExtras)).filter((id) => {
    if (worn.includes(id)) return false;
    const sideRule = (dollDataJson.PIECE_SIDE as Record<string, string>)[id];
    const hasSticker = sideRule === side || sideRule === 'both';
    if (!hasSticker) return false;
    if (avoidSet.has(id)) return false;
    const bulk = modernById(id)?.bulk ?? 0;
    if (bulk > maxBulk) return false;
    return true;
  });

  const freeLayerExtras = candidateExtras.filter(
    (id) => !usedLayers.has(pieceLayer(id))
  );
  const finalExtrasPool =
    freeLayerExtras.length > 0 ? freeLayerExtras : candidateExtras;

  if (finalExtrasPool.length > 0) {
    const extraPiece =
      finalExtrasPool[Math.floor(rand() * finalExtrasPool.length)];
    worn.push(extraPiece);
    usedLayers.add(pieceLayer(extraPiece));
  }

  // 4) colorIdx
  const classicColors = garment?.colors_classic ?? [];
  const classicIndices = classicColors
    .map((cId) => COLORS.findIndex((c) => c.id === cId))
    .filter((idx) => idx >= 0);

  const colorIdx =
    classicIndices.length > 0
      ? classicIndices[Math.floor(rand() * classicIndices.length)]
      : Math.floor(rand() * COLORS.length);

  // 5) say = band.say_vi ({t}) + the day line + "Nghê chọn <b>áo</b> + pieces." (+ rain.say_vi)
  const bandSay = bandObj.say_vi.replace('{t}', String(wx.t));

  let dayLine = '';
  if (isHolidayToday && holiday) {
    dayLine = weatherJson.days.holiday.say_vi
      .replace('{name}', holiday.name)
      .replace('{note}', holiday.note);
  } else if (isWeekend) {
    dayLine = weatherJson.days.weekend.say_vi;
  } else {
    dayLine = weatherJson.days.weekday.say_vi;
  }

  const gName = garment?.name ?? chapter;
  const piecesNames = worn.map((id) => pieceName(id) || id);
  const lookLine =
    piecesNames.length > 0
      ? `Nghê chọn <b>${gName}</b> + ${piecesNames.join(' + ')}.`
      : `Nghê chọn <b>${gName}</b>.`;

  const sayParts = [bandSay, dayLine, lookLine];
  if (wx.rain) {
    sayParts.push(weatherJson.rain.say_vi);
  }
  const say = sayParts.filter(Boolean).join(' ');

  return {
    chapter,
    vibe,
    worn,
    colorIdx,
    say,
  };
}
