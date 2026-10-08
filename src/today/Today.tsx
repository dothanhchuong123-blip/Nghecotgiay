import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore, liveStore, setVibe } from '../state';
import { garmentById, COLORS } from '../data';
import { openBook, go, isBookBusy } from '../book/turn';
import { setGlobalMixOutfit } from '../spreads/Mix';
import { snap, rip } from '../audio/paper';
import { say } from '../nghe/say';
import {
  CITY_KEY,
  cityById,
  fetchWx,
  wxIcon,
  wxName,
  manualWx,
  lunarOf,
  nextHoliday,
  WEEKDAY_VI,
  CITIES,
  City,
  Wx,
  pickLook,
} from './days';
import './today.css';

const openListeners = new Set<() => void>();
const closeListeners = new Set<() => void>();

export function openToday() {
  openListeners.forEach((fn) => fn());
}

export function closeToday() {
  closeListeners.forEach((fn) => fn());
}

const MANUAL_CHIPS = [
  { id: 'nong', label: 'Nóng' },
  { id: 'mat', label: 'Mát' },
  { id: 'lanh', label: 'Lạnh' },
  { id: 'mua', label: 'Mưa' },
];

async function waitForBookNotBusy(pollMs = 80, maxMs = 5000): Promise<void> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, pollMs));
  while (isBookBusy()) {
    if (Date.now() - start >= maxMs) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export default function Today() {
  const { state, dispatch } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState<City>(() => {
    const cityId =
      typeof window !== 'undefined' ? localStorage.getItem(CITY_KEY) : null;
    return cityById(cityId);
  });
  const [wx, setWx] = useState<Wx | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isManual, setIsManual] = useState(false);

  const [hasDressed, setHasDressed] = useState(false);
  const [, setSeed] = useState(0);
  const [isRipping, setIsRipping] = useState(false);
  const [ripKey, setRipKey] = useState(0);

  const seedRef = useRef(0);
  const isDressingRef = useRef(false);
  const sayTimerRef = useRef<number | null>(null);
  const ripTimerRef = useRef<number | null>(null);

  const dress = useCallback(
    async (seedVal: number) => {
      if (isDressingRef.current) return;
      isDressingRef.current = true;
      try {
        const now = new Date();
        const currentWx = wx || manualWx('am');
        const side = liveStore.get().side || 'nu';
        const look = pickLook(now, currentWx, side, seedVal);

        setIsOpen(false);

        if (liveStore.get().screen === 'cover') {
          await openBook(4);
          await waitForBookNotBusy();
        }

        const cur = liveStore.get();
        if (cur.chapter !== look.chapter || cur.spread !== 4) {
          await go({ chapter: look.chapter, spread: 4 });
          await waitForBookNotBusy();
        }

        const garment = garmentById(look.chapter);
        let colorId = garment?.colors_classic?.[look.colorIdx];
        if (!colorId && look.colorIdx >= 0 && look.colorIdx < COLORS.length) {
          colorId = COLORS[look.colorIdx]?.id;
        }
        if (!colorId && garment?.colors_classic?.length) {
          colorId = garment.colors_classic[0];
        }
        if (!colorId) {
          colorId = 'do-son';
        }

        setGlobalMixOutfit({
          worn: look.worn,
          colorId,
        });
        dispatch(setVibe(look.vibe));
        snap();

        if (sayTimerRef.current) {
          clearTimeout(sayTimerRef.current);
        }
        sayTimerRef.current = window.setTimeout(() => {
          say(look.say);
        }, 2200);

        setHasDressed(true);
      } finally {
        isDressingRef.current = false;
      }
    },
    [wx, dispatch]
  );

  useEffect(() => {
    const handleOpen = () => {
      dress(seedRef.current);
    };
    const handleClose = () => setIsOpen(false);

    openListeners.add(handleOpen);
    closeListeners.add(handleClose);

    return () => {
      openListeners.delete(handleOpen);
      closeListeners.delete(handleClose);
    };
  }, [dress]);

  useEffect(() => {
    return () => {
      if (sayTimerRef.current) clearTimeout(sayTimerRef.current);
      if (ripTimerRef.current) clearTimeout(ripTimerRef.current);
    };
  }, []);

  const loadWeather = useCallback(async (targetCity: City) => {
    setIsLoading(true);
    try {
      const res = await fetchWx(targetCity);
      if (res) {
        setWx(res);
        setIsManual(false);
        setFetchFailed(false);
      } else {
        setFetchFailed(true);
      }
    } catch {
      setFetchFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(currentCity);
  }, [loadWeather, currentCity]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CITY_KEY) {
        const updated = cityById(e.newValue);
        setCurrentCity(updated);
        loadWeather(updated);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadWeather]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeToday();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCityClick = (cityId: string) => {
    const city = cityById(cityId);
    setCurrentCity(city);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CITY_KEY, city.id);
      } catch {
        // ignore
      }
    }
    loadWeather(city);
  };

  const handleManualClick = (chipId: string) => {
    const manual = manualWx(chipId);
    setWx(manual);
    setIsManual(true);
  };

  const now = new Date();
  const month = now.getMonth() + 1;
  const monthStr = `Th${month}`;
  const year = now.getFullYear();
  const day = now.getDate();
  const dayOfWeek = now.getDay();
  const weekday =
    dayOfWeek === 0 ? WEEKDAY_VI[6] : WEEKDAY_VI[dayOfWeek - 1];

  const lunar = lunarOf(now);
  const holiday = nextHoliday(now);
  const countdownText = holiday
    ? holiday.inDays === 0
      ? `Hôm nay là ${holiday.name}!`
      : `Còn ${holiday.inDays} ngày nữa là ${holiday.name}`
    : null;

  const isCover = state.screen === 'cover';

  const handlePadClick = () => {
    if (isOpen) {
      closeToday();
    } else {
      setIsOpen(true);
    }
  };

  const handlePillClick = async () => {
    if (hasDressed) {
      if (isDressingRef.current) return;
      rip();
      setRipKey((k) => k + 1);
      setIsRipping(true);
      if (ripTimerRef.current) {
        clearTimeout(ripTimerRef.current);
      }
      ripTimerRef.current = window.setTimeout(() => {
        setIsRipping(false);
      }, 700);

      const nextSeed = seedRef.current + 1;
      seedRef.current = nextSeed;
      setSeed(nextSeed);
      await dress(nextSeed);
    } else {
      await dress(seedRef.current);
    }
  };

  const handleVeilClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeToday();
    }
  };

  const weatherIconSrc = wx ? wxIcon(wx) : null;

  return (
    <>
      <div
        className={`lich-wall ${isCover ? 'is-cover' : ''} ${isOpen ? 'is-open' : ''}`}
        data-open={isOpen ? 'true' : undefined}
      >
        <div className="lich-pad-wrapper">
          <button
            type="button"
            className="lich-wall-pad"
            onClick={handlePadClick}
            aria-label={`${monthStr}, ngày ${day}, ${weekday}${wx ? `, ${wx.t} độ` : ''}`}
          >
            <span className="lich-month">{monthStr}</span>
            <span className="lich-day">{day}</span>
            <span className="lich-weekday">{weekday}</span>
            {wx && weatherIconSrc ? (
              <div className="lich-wx">
                <img
                  src={weatherIconSrc}
                  alt=""
                  className="lich-wx-icon"
                  width={16}
                  height={16}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    console.log(`[art missing] ${weatherIconSrc}`);
                  }}
                />
                <span className="lich-wx-temp">{wx.t}°</span>
              </div>
            ) : null}
          </button>

          {isRipping && (
            <div key={ripKey} className="lich-flying-sheet" aria-hidden="true">
              <span className="lich-month">{monthStr}</span>
              <span className="lich-day">{day}</span>
              <span className="lich-weekday">{weekday}</span>
              {wx && weatherIconSrc ? (
                <div className="lich-wx">
                  <img
                    src={weatherIconSrc}
                    alt=""
                    className="lich-wx-icon"
                    width={16}
                    height={16}
                  />
                  <span className="lich-wx-temp">{wx.t}°</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <button
          type="button"
          className={`lich-wall-pill ${hasDressed ? 'is-dark' : ''}`}
          onClick={handlePillClick}
        >
          {hasDressed ? 'Xé tờ · bộ khác ↻' : 'Hôm nay mặc gì?'}
        </button>
      </div>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="today-veil" onClick={handleVeilClick}>
              <div
                className="today-card"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Lịch hôm nay"
              >
                <button
                  type="button"
                  className="today-close-btn"
                  onClick={closeToday}
                  aria-label="Đóng"
                >
                  ×
                </button>

                <div className="today-month-year">
                  {`THÁNG ${month} · ${year}`}
                </div>

                <div className="today-day">{day}</div>

                <div className="today-weekday">{weekday}</div>

                <div className="today-lunar">
                  {`Âm lịch ${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''} · ${lunar.year_vi}`}
                </div>

                <div className="today-cities" role="group" aria-label="Thành phố">
                  {CITIES.map((c) => {
                    const isSelected = c.id === currentCity.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`today-chip today-city-chip ${isSelected ? 'is-active' : ''}`}
                        onClick={() => handleCityClick(c.id)}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>

                <div className="today-wx-section">
                  {isLoading ? (
                    <div className="today-wx-status">Nghê đang xem trời…</div>
                  ) : wx ? (
                    <div className="today-wx-line">
                      {weatherIconSrc && (
                        <img
                          src={weatherIconSrc}
                          alt=""
                          className="today-wx-icon"
                          width={20}
                          height={20}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            console.log(`[art missing] ${weatherIconSrc}`);
                          }}
                        />
                      )}
                      <span className="today-wx-text">
                        {`${currentCity.name} ${wx.t}°C ${wxName(wx)}${!wx.live || isManual ? ' (bạn chọn)' : ''}`}
                      </span>
                    </div>
                  ) : null}

                  {(fetchFailed || isManual || (!wx && !isLoading)) && (
                    <div
                      className="today-manual-chips"
                      role="group"
                      aria-label="Chọn thời tiết thủ công"
                    >
                      {MANUAL_CHIPS.map((chip) => {
                        const isActive =
                          isManual &&
                          ((chip.id === 'mua' && wx?.rain) ||
                            (chip.id !== 'mua' && !wx?.rain && wx?.band === chip.id));
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            className={`today-chip today-manual-chip ${isActive ? 'is-active' : ''}`}
                            onClick={() => handleManualClick(chip.id)}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {countdownText && (
                  <div className="today-countdown">{countdownText}</div>
                )}

                <button
                  type="button"
                  className="today-outfit-btn"
                  onClick={() => dress(seedRef.current)}
                >
                  Hôm nay mặc gì? ✦
                </button>

                <img
                  src="/book/guide/point.webp"
                  alt=""
                  className="today-guide-peek"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    console.log('[art missing] /book/guide/point.webp');
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
