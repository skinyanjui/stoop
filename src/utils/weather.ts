import { dayDiff } from './format';

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const FETCH_TIMEOUT_MS = 6000;
const MAX_FORECAST_DAYS_AHEAD = 15;

export type WeatherIconKind =
  | 'sun'
  | 'partly-cloudy'
  | 'cloud'
  | 'rain'
  | 'snow'
  | 'storm';

export type WeatherRating = 'great' | 'fair' | 'poor';

export interface SaleWeatherForecast {
  date: string;
  code: number;
  condition: string;
  icon: WeatherIconKind;
  tempHigh: number;
  tempLow: number;
  unit: '°F' | '°C';
  precipChance: number;
  windMax: number;
  windUnit: 'mph' | 'km/h';
  rating: WeatherRating;
  verdict: string;
}

export type WeatherLookupResult =
  | { status: 'ok'; forecast: SaleWeatherForecast }
  | { status: 'out-of-range' }
  | { status: 'unavailable' };

interface CacheEntry {
  value: WeatherLookupResult;
  expiresAt: number;
}

const weatherCache = new Map<string, CacheEntry>();
const weatherInflight = new Map<string, Promise<WeatherLookupResult>>();

export function clearWeatherCache(): void {
  weatherCache.clear();
  weatherInflight.clear();
}

const IMPERIAL_LOCALES = new Set(['en-US', 'en-LR', 'en-MM']);

export function prefersFahrenheit(): boolean {
  try {
    const lang = navigator.language || 'en-US';
    return IMPERIAL_LOCALES.has(lang) || lang === 'en';
  } catch {
    return true;
  }
}

export function describeWmoCode(code: number): {
  condition: string;
  icon: WeatherIconKind;
} {
  if (code === 0) return { condition: 'Clear & sunny', icon: 'sun' };
  if (code === 1) return { condition: 'Mostly clear', icon: 'sun' };
  if (code === 2) return { condition: 'Partly cloudy', icon: 'partly-cloudy' };
  if (code === 3) return { condition: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'cloud' };
  if (code >= 51 && code <= 57) return { condition: 'Light drizzle', icon: 'rain' };
  if (code >= 61 && code <= 67) return { condition: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { condition: 'Rain showers', icon: 'rain' };
  if (code === 85 || code === 86) return { condition: 'Snow showers', icon: 'snow' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorms', icon: 'storm' };
  return { condition: 'Mild', icon: 'partly-cloudy' };
}

export function assessGarageSaleWeather(input: {
  code: number;
  precipChance: number;
  tempHigh: number;
  windMax: number;
  imperial: boolean;
}): { rating: WeatherRating; verdict: string } {
  const { code, precipChance, tempHigh, windMax, imperial } = input;
  const highF = imperial ? tempHigh : (tempHigh * 9) / 5 + 32;
  const windMph = imperial ? windMax : windMax * 0.621371;

  if (code >= 95) return { rating: 'poor', verdict: 'Storms likely' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { rating: 'poor', verdict: 'Snow likely' };
  }
  if (code >= 63 && code <= 67) return { rating: 'poor', verdict: 'Rainy day' };
  if (precipChance >= 55) return { rating: 'poor', verdict: 'Rain likely' };

  if ((code >= 51 && code <= 62) || (code >= 80 && code <= 82) || precipChance >= 30) {
    return { rating: 'fair', verdict: 'Chance of rain' };
  }
  if (windMph >= 22) return { rating: 'fair', verdict: 'Windy outside' };
  if (highF <= 42) return { rating: 'fair', verdict: 'Bundle up' };
  if (highF >= 94) return { rating: 'fair', verdict: 'Very hot' };

  return { rating: 'great', verdict: 'Great sale day' };
}

function getCached(key: string): WeatherLookupResult | null {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    weatherCache.delete(key);
    return null;
  }
  weatherCache.delete(key);
  weatherCache.set(key, entry);
  return entry.value;
}

function setCached(key: string, value: WeatherLookupResult): void {
  if (weatherCache.has(key)) {
    weatherCache.delete(key);
  } else if (weatherCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = weatherCache.keys().next().value;
    if (oldest !== undefined) weatherCache.delete(oldest);
  }
  weatherCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchJsonWithTimeout(
  url: string,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  if (externalSignal?.aborted) {
    throw externalSignal.reason ?? new DOMException('Aborted', 'AbortError');
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Weather timeout')),
    FETCH_TIMEOUT_MS,
  );
  const onExternalAbort = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Weather API error (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

function raceWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException('Aborted', 'AbortError'),
    );
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

export async function fetchSaleWeather(
  lat: number,
  lng: number,
  date: string,
  options?: { signal?: AbortSignal; imperial?: boolean },
): Promise<WeatherLookupResult> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return { status: 'unavailable' };
  }

  const diff = dayDiff(date);
  if (diff < 0 || diff > MAX_FORECAST_DAYS_AHEAD) {
    return { status: 'out-of-range' };
  }

  const imperial = options?.imperial ?? prefersFahrenheit();
  const latKey = (Math.round(lat * 50) / 50).toFixed(2);
  const lngKey = (Math.round(lng * 50) / 50).toFixed(2);
  const cacheKey = `${latKey},${lngKey}|${date}|${imperial ? 'F' : 'C'}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const existingInflight = weatherInflight.get(cacheKey);
  if (existingInflight) {
    return raceWithSignal(existingInflight, signal);
  }

  const run = (async (): Promise<WeatherLookupResult> => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      start_date: date,
      end_date: date,
      timezone: 'auto',
      temperature_unit: imperial ? 'fahrenheit' : 'celsius',
      wind_speed_unit: imperial ? 'mph' : 'kmh',
    });

    const raw = (await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    )) as {
      daily?: {
        time?: string[];
        weather_code?: Array<number | null>;
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        precipitation_probability_max?: Array<number | null>;
        wind_speed_10m_max?: Array<number | null>;
      };
    } | null;

    const daily = raw?.daily;
    const idx = Array.isArray(daily?.time)
      ? Math.max(0, daily.time.indexOf(date))
      : 0;
    const code = daily?.weather_code?.[idx];
    const hi = daily?.temperature_2m_max?.[idx];
    const lo = daily?.temperature_2m_min?.[idx];
    if (
      typeof code !== 'number' ||
      !Number.isFinite(code) ||
      typeof hi !== 'number' ||
      !Number.isFinite(hi) ||
      typeof lo !== 'number' ||
      !Number.isFinite(lo)
    ) {
      return { status: 'unavailable' };
    }

    const precipRaw = daily?.precipitation_probability_max?.[idx];
    const windRaw = daily?.wind_speed_10m_max?.[idx];
    const precipChance =
      typeof precipRaw === 'number' && Number.isFinite(precipRaw)
        ? Math.max(0, Math.min(100, Math.round(precipRaw)))
        : 0;
    const windMax =
      typeof windRaw === 'number' && Number.isFinite(windRaw)
        ? Math.max(0, Math.round(windRaw))
        : 0;

    const { condition, icon } = describeWmoCode(code);
    const { rating, verdict } = assessGarageSaleWeather({
      code,
      precipChance,
      tempHigh: hi,
      windMax,
      imperial,
    });

    const result: WeatherLookupResult = {
      status: 'ok',
      forecast: {
        date,
        code,
        condition,
        icon,
        tempHigh: Math.round(hi),
        tempLow: Math.round(lo),
        unit: imperial ? '°F' : '°C',
        precipChance,
        windMax,
        windUnit: imperial ? 'mph' : 'km/h',
        rating,
        verdict,
      },
    };
    setCached(cacheKey, result);
    return result;
  })();

  const tracked = run.finally(() => {
    if (weatherInflight.get(cacheKey) === tracked) {
      weatherInflight.delete(cacheKey);
    }
  });
  // Prevent unhandled rejection warning if all callers abort before settle
  tracked.catch(() => {});
  weatherInflight.set(cacheKey, tracked);

  return raceWithSignal(tracked, signal);
}
