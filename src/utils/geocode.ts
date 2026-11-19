import type { GeocodeResult, Sale } from '../types/sale';

const CACHE_TTL_MS = 10 * 60 * 1000;
const NULL_CACHE_TTL_MS = 60 * 1000;
const SUGGEST_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const FETCH_TIMEOUT_MS = 7000;

export interface PlaceSuggestion extends GeocodeResult {
  id: string;
  subtitle: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const geoCache = new Map<string, CacheEntry<GeocodeResult | null>>();
const revCache = new Map<string, CacheEntry<ReverseGeocodeAddress | null>>();
const suggestCache = new Map<string, CacheEntry<PlaceSuggestion[]>>();
const geoInflight = new Map<string, Promise<GeocodeResult | null>>();
const revInflight = new Map<string, Promise<ReverseGeocodeAddress | null>>();
const suggestInflight = new Map<string, Promise<PlaceSuggestion[]>>();

function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): { hit: true; value: T } | { hit: false } {
  const entry = cache.get(key);
  if (!entry) return { hit: false };
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return { hit: false };
  }
  // Refresh LRU order
  cache.delete(key);
  cache.set(key, entry);
  return { hit: true, value: entry.value };
}

function setCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs = CACHE_TTL_MS,
): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearGeocodeCache(): void {
  geoCache.clear();
  revCache.clear();
  suggestCache.clear();
  geoInflight.clear();
  revInflight.clear();
  suggestInflight.clear();
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
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
    () => controller.abort(new Error('Geocoding timeout')),
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
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export function stripAddressUnit(q: string): string {
  return q
    .replace(
      /(?:,\s*|\s+)\b(?:apt|apartment|unit|suite|ste|lot|bldg|building|fl|floor|rm|room)\s*[a-z0-9-]+\b/gi,
      '',
    )
    .replace(/\s+#\s*[a-z0-9-]+\b/gi, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isStreetAddressQuery(q: string): boolean {
  const s = q.trim();
  if (/^\d+\s+[a-z]/i.test(s)) return true;
  if (
    /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place|pkwy|parkway|cir|circle|ter|terrace|trl|trail|hwy|highway)\b/i.test(
      s,
    )
  ) {
    return true;
  }
  return false;
}

function scoreGeoHit(hit: Record<string, unknown>, addressQuery: boolean): number {
  const rank = Number(hit.place_rank) || 0;
  const importance = Number(hit.importance) || 0;
  const category = String(hit.category || '').toLowerCase();
  const type = String(hit.type || '').toLowerCase();
  const addrType = String(hit.addresstype || '').toLowerCase();

  if (addressQuery) {
    let score = rank;
    if (type === 'house' || category === 'building' || category === 'place') score += 4;
    if (type === 'highway' || category === 'highway') score += 2;
    return score;
  }

  // City, ZIP, region, or landmark query: prefer importance & settlement/admin matches.
  let score = importance * 100;
  if (
    addrType === 'city' ||
    type === 'city' ||
    addrType === 'town' ||
    type === 'town' ||
    addrType === 'municipality'
  ) {
    score += 18;
  } else if (
    addrType === 'postcode' ||
    type === 'postcode' ||
    addrType === 'state' ||
    type === 'administrative'
  ) {
    score += 12;
  } else if (addrType === 'village' || type === 'village' || addrType === 'suburb') {
    score += 4;
  }
  if (category === 'highway' || category === 'building' || category === 'amenity') {
    score -= 15;
  }
  return score;
}

function formatNominatimName(
  hit: Record<string, unknown>,
  fallbackName: string,
  addressQuery: boolean,
): string {
  const addr = (
    hit.address && typeof hit.address === 'object' ? hit.address : {}
  ) as Record<string, unknown>;

  if (!addressQuery) {
    const primary = String(
      addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.hamlet ||
        addr.postcode ||
        hit.name ||
        '',
    ).trim();
    const region = String(addr.state || addr.region || addr.country || '').trim();
    if (primary && region && primary.toLowerCase() !== region.toLowerCase()) {
      return `${primary}, ${region}`;
    }
    if (primary) return primary;
  }

  return String(hit.display_name || fallbackName)
    .split(',')
    .slice(0, 2)
    .join(',')
    .trim();
}

function normalizeBbox(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const nums = raw.map((v) => parseFloat(String(v)));
  if (!nums.every((n) => Number.isFinite(n))) return null;
  const south = Math.min(nums[0], nums[1]);
  const north = Math.max(nums[0], nums[1]);
  const west = Math.min(nums[2], nums[3]);
  const east = Math.max(nums[2], nums[3]);
  if (south === north || west === east) return null;
  return [south, north, west, east];
}

function parseGeoHit(
  hit: Record<string, unknown>,
  fallbackName: string,
  addressQuery: boolean,
): GeocodeResult | null {
  const lat = parseFloat(String(hit.lat));
  const lng = parseFloat(String(hit.lon));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }
  const addr = (
    hit.address && typeof hit.address === 'object' ? hit.address : {}
  ) as Record<string, unknown>;
  return {
    cc: String(addr.country_code || '').toLowerCase(),
    lat,
    lng,
    bbox: normalizeBbox(hit.boundingbox),
    name: formatNominatimName(hit, fallbackName, addressQuery),
  };
}

function parsePhotonFeature(feature: Record<string, unknown>): PlaceSuggestion | null {
  const geom = feature.geometry as { coordinates?: unknown[] } | undefined;
  const props = (
    feature.properties && typeof feature.properties === 'object'
      ? feature.properties
      : {}
  ) as Record<string, unknown>;
  const coords = Array.isArray(geom?.coordinates) ? geom.coordinates : [];
  const lng = parseFloat(String(coords[0]));
  const lat = parseFloat(String(coords[1]));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  const ext = Array.isArray(props.extent) && props.extent.length === 4
    ? props.extent.map((v) => parseFloat(String(v)))
    : null;
  // Photon GeoJSON extent is [minLon, maxLat, maxLon, minLat]
  const bbox =
    ext && ext.every((n) => Number.isFinite(n))
      ? normalizeBbox([ext[3], ext[1], ext[0], ext[2]])
      : null;

  const cc = String(props.countrycode || '').toLowerCase();
  const streetLine = [props.housenumber, props.street]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ');
  const primary = String(props.name || streetLine || props.city || props.postcode || '').trim();
  const city = String(props.city || props.locality || '').trim();
  const state = String(props.state || props.county || '').trim();
  const country = String(props.country || '').trim();

  const labelParts: string[] = [];
  if (primary) labelParts.push(primary);
  if (city && city.toLowerCase() !== primary.toLowerCase()) labelParts.push(city);
  if (state && !labelParts.some((p) => p.toLowerCase() === state.toLowerCase())) {
    labelParts.push(state);
  }
  const name = labelParts.slice(0, 2).join(', ') || country || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

  const subtitleParts: string[] = [];
  if (state && !name.toLowerCase().includes(state.toLowerCase())) subtitleParts.push(state);
  if (country && !name.toLowerCase().includes(country.toLowerCase())) {
    subtitleParts.push(cc === 'us' ? 'USA' : country);
  }
  const subtitle = subtitleParts.join(', ') || (cc ? cc.toUpperCase() : 'Place');

  const osmKey = `${props.osm_type || 'p'}:${props.osm_id || `${lat.toFixed(3)},${lng.toFixed(3)}`}`;
  return {
    id: `photon:${osmKey}`,
    cc,
    lat,
    lng,
    bbox,
    name,
    subtitle,
  };
}

function parseOpenMeteoResult(row: Record<string, unknown>): PlaceSuggestion | null {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }
  const placeName = String(row.name || '').trim();
  const admin1 = String(row.admin1 || '').trim();
  const country = String(row.country || '').trim();
  const cc = String(row.country_code || '').toLowerCase();
  if (!placeName) return null;

  const name =
    admin1 && admin1.toLowerCase() !== placeName.toLowerCase()
      ? `${placeName}, ${admin1}`
      : country && country.toLowerCase() !== placeName.toLowerCase()
        ? `${placeName}, ${country}`
        : placeName;
  const subtitle =
    cc === 'us'
      ? 'USA'
      : country && !name.toLowerCase().includes(country.toLowerCase())
        ? country
        : admin1 || 'City';

  return {
    id: `om:${String(row.id ?? `${lat.toFixed(3)},${lng.toFixed(3)}`)}`,
    cc,
    lat,
    lng,
    bbox: null,
    name,
    subtitle,
  };
}

function dedupeSuggestions(list: PlaceSuggestion[], max = 4): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  const seenNames = new Set<string>();
  for (const item of list) {
    const key = `${item.name.toLowerCase()}|${item.cc}`;
    if (seenNames.has(key)) continue;
    const nearDup = out.some(
      (existing) =>
        Math.abs(existing.lat - item.lat) < 0.02 &&
        Math.abs(existing.lng - item.lng) < 0.02 &&
        existing.name.toLowerCase() === item.name.toLowerCase(),
    );
    if (nearDup) continue;
    seenNames.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

async function queryPhoton(
  text: string,
  limit: number,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const json = (await fetchJsonWithTimeout(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=${limit}&lang=en`,
    signal,
  )) as { features?: unknown[] } | null;
  if (!Array.isArray(json?.features)) return [];
  const parsed: PlaceSuggestion[] = [];
  for (const feat of json.features) {
    if (feat && typeof feat === 'object') {
      const hit = parsePhotonFeature(feat as Record<string, unknown>);
      if (hit) parsed.push(hit);
    }
  }
  return dedupeSuggestions(parsed, limit);
}

async function queryOpenMeteo(
  text: string,
  count: number,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const runSingle = async (q: string): Promise<PlaceSuggestion[]> => {
    const json = (await fetchJsonWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`,
      signal,
    )) as { results?: unknown[] } | null;
    if (!Array.isArray(json?.results)) return [];
    const parsed: PlaceSuggestion[] = [];
    for (const row of json.results) {
      if (row && typeof row === 'object') {
        const hit = parseOpenMeteoResult(row as Record<string, unknown>);
        if (hit) parsed.push(hit);
      }
    }
    return parsed;
  };

  let hits = await runSingle(text);
  // Handle "City, State" queries like "Austin, TX" or "Evansville, IN"
  if (!hits.length && text.includes(',')) {
    const [cityPart, ...rest] = text.split(',').map((s) => s.trim()).filter(Boolean);
    const regionHint = rest.join(' ').toLowerCase();
    if (cityPart && cityPart.length >= 2) {
      const cityHits = await runSingle(cityPart);
      if (regionHint) {
        const filtered = cityHits.filter(
          (h) =>
            h.name.toLowerCase().includes(regionHint) ||
            h.subtitle.toLowerCase().includes(regionHint) ||
            h.cc === regionHint,
        );
        hits = filtered.length ? filtered : cityHits;
      } else {
        hits = cityHits;
      }
    }
  }
  return dedupeSuggestions(hits, count);
}

export async function suggestPlaces(
  q: string,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<PlaceSuggestion[]> {
  const normalized = q.trim().replace(/\s+/g, ' ');
  if (normalized.length < 2) return [];
  const limit = options?.limit ?? 4;
  const cacheKey = `${normalized.toLowerCase()}|${limit}`;

  const cached = getCached(suggestCache, cacheKey);
  if (cached.hit) return cached.value;

  const signal = options?.signal;
  if (!signal) {
    const pending = suggestInflight.get(cacheKey);
    if (pending) return pending;
  }

  const run = (async (): Promise<PlaceSuggestion[]> => {
    let results: PlaceSuggestion[] = [];
    let providerSucceeded = false;
    try {
      results = await queryPhoton(normalized, Math.max(limit, 5), signal);
      providerSucceeded = true;
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
    }

    if (!results.length && !isStreetAddressQuery(normalized)) {
      try {
        results = await queryOpenMeteo(normalized, Math.max(limit, 5), signal);
        providerSucceeded = true;
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) throw err;
      }
    }

    const trimmed = results.slice(0, limit);
    if (providerSucceeded || trimmed.length > 0) {
      setCached(
        suggestCache,
        cacheKey,
        trimmed,
        trimmed.length ? SUGGEST_CACHE_TTL_MS : NULL_CACHE_TTL_MS,
      );
    }
    return trimmed;
  })();

  if (!signal) {
    suggestInflight.set(cacheKey, run);
    try {
      return await run;
    } finally {
      suggestInflight.delete(cacheKey);
    }
  }
  return run;
}

export async function geocode(
  q: string,
  options?: { signal?: AbortSignal },
): Promise<GeocodeResult | null> {
  const normalized = q.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  const cacheKey = normalized.toLowerCase();

  const cached = getCached(geoCache, cacheKey);
  if (cached.hit) return cached.value;

  const signal = options?.signal;
  if (!signal) {
    const pending = geoInflight.get(cacheKey);
    if (pending) return pending;
  }

  const run = (async (): Promise<GeocodeResult | null> => {
    const addressQuery = isStreetAddressQuery(normalized);
    let providerSucceeded = false;
    let lastError: unknown = null;

    const queryNominatim = async (text: string): Promise<GeocodeResult | null> => {
      const json = await fetchJsonWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(text)}`,
        signal,
      );
      providerSucceeded = true;
      if (!Array.isArray(json) || json.length === 0) return null;
      const ranked = [...(json as Record<string, unknown>[])].sort(
        (a, b) => scoreGeoHit(b, addressQuery) - scoreGeoHit(a, addressQuery),
      );
      for (const candidate of ranked) {
        const parsed = parseGeoHit(candidate, text, addressQuery);
        if (parsed) return parsed;
      }
      return null;
    };

    let result: GeocodeResult | null = null;
    try {
      result = await queryNominatim(normalized);
      if (!result) {
        const withoutUnit = stripAddressUnit(normalized);
        if (withoutUnit && withoutUnit.toLowerCase() !== cacheKey) {
          result = await queryNominatim(withoutUnit);
        }
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
      lastError = err;
    }

    if (!result) {
      try {
        const photonHits = await queryPhoton(normalized, 5, signal);
        providerSucceeded = true;
        if (photonHits.length > 0) {
          const best = photonHits[0];
          result = {
            cc: best.cc,
            lat: best.lat,
            lng: best.lng,
            bbox: best.bbox,
            name: best.name,
          };
        }
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) throw err;
        lastError = err;
      }
    }

    if (!result && !addressQuery) {
      try {
        const omHits = await queryOpenMeteo(normalized, 5, signal);
        providerSucceeded = true;
        if (omHits.length > 0) {
          const best = omHits[0];
          result = {
            cc: best.cc,
            lat: best.lat,
            lng: best.lng,
            bbox: best.bbox,
            name: best.name,
          };
        }
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) throw err;
        lastError = err;
      }
    }

    if (!result && !providerSucceeded && lastError) {
      throw lastError;
    }

    setCached(geoCache, cacheKey, result, result ? CACHE_TTL_MS : NULL_CACHE_TTL_MS);
    return result;
  })();

  if (!signal) {
    geoInflight.set(cacheKey, run);
    try {
      return await run;
    } finally {
      geoInflight.delete(cacheKey);
    }
  }
  return run;
}

export interface IpLocationResult {
  lat: number;
  lng: number;
  label: string;
  zoom: number;
  cc: string;
}

let ipLocCache: CacheEntry<IpLocationResult | null> | null = null;
let ipLocInflight: Promise<IpLocationResult | null> | null = null;

export function clearIpLocationCache(): void {
  ipLocCache = null;
  ipLocInflight = null;
}

function isValidNonZeroCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function formatLocationLabel(
  city?: unknown,
  region?: unknown,
  country?: unknown,
): string {
  const c = String(city || '').trim();
  const r = String(region || '').trim();
  const co = String(country || '').trim();
  if (c && r && c.toLowerCase() !== r.toLowerCase()) return `${c}, ${r}`;
  if (c && co && c.toLowerCase() !== co.toLowerCase()) return `${c}, ${co}`;
  if (c) return c;
  if (r) return r;
  return 'Near you';
}

export async function detectLocationByIp(options?: {
  signal?: AbortSignal;
}): Promise<IpLocationResult | null> {
  if (ipLocCache && Date.now() <= ipLocCache.expiresAt) {
    return ipLocCache.value;
  }
  const signal = options?.signal;
  if (!signal && ipLocInflight) return ipLocInflight;

  const run = (async (): Promise<IpLocationResult | null> => {
    let providerSucceeded = false;
    // Primary: GeoJS (fast, Cloudflare-backed, CORS enabled)
    try {
      const data = (await fetchJsonWithTimeout(
        'https://get.geojs.io/v1/ip/geo.json',
        signal,
      )) as Record<string, unknown> | null;
      providerSucceeded = true;
      if (data) {
        const lat = parseFloat(String(data.latitude));
        const lng = parseFloat(String(data.longitude));
        if (isValidNonZeroCoord(lat, lng)) {
          const hit: IpLocationResult = {
            lat,
            lng,
            label: formatLocationLabel(data.city, data.region, data.country),
            zoom: 11,
            cc: String(data.country_code || '').toLowerCase(),
          };
          ipLocCache = { value: hit, expiresAt: Date.now() + CACHE_TTL_MS };
          return hit;
        }
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
    }

    // Fallback: ipwho.is
    try {
      const data = (await fetchJsonWithTimeout(
        'https://ipwho.is/',
        signal,
      )) as Record<string, unknown> | null;
      providerSucceeded = true;
      if (data && data.success !== false) {
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        if (isValidNonZeroCoord(lat, lng)) {
          const hit: IpLocationResult = {
            lat,
            lng,
            label: formatLocationLabel(data.city, data.region, data.country),
            zoom: 11,
            cc: String(data.country_code || '').toLowerCase(),
          };
          ipLocCache = { value: hit, expiresAt: Date.now() + CACHE_TTL_MS };
          return hit;
        }
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
    }

    if (providerSucceeded) {
      ipLocCache = { value: null, expiresAt: Date.now() + NULL_CACHE_TTL_MS };
    }
    return null;
  })();

  if (!signal) {
    ipLocInflight = run;
    try {
      return await run;
    } finally {
      ipLocInflight = null;
    }
  }
  return run;
}

export interface ReverseGeocodeAddress {
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  cc: string;
}

async function reverseGeocodePhoton(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeAddress | null> {
  const json = (await fetchJsonWithTimeout(
    `https://photon.komoot.io/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
    signal,
  )) as { features?: Array<{ properties?: Record<string, unknown> }> } | null;
  const p = json?.features?.[0]?.properties;
  if (!p || typeof p !== 'object') return null;
  const cc = String(p.countrycode || '').toLowerCase();
  const street = [p.housenumber, p.street]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  const city = String(p.city || p.locality || p.district || p.county || '').trim();
  const state = String(p.state || p.county || '').trim();
  const postal = String(p.postcode || '').trim();
  const country = String(p.country || '').trim();
  if (!street && !city && !postal) return null;
  return { street, city, state, postal, country, cc };
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options?: { signal?: AbortSignal },
): Promise<ReverseGeocodeAddress | null> {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  // Round to ~11m precision to maximize cache hits for nearby taps
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached(revCache, cacheKey);
  if (cached.hit) return cached.value;

  const signal = options?.signal;
  if (!signal) {
    const pending = revInflight.get(cacheKey);
    if (pending) return pending;
  }

  const run = (async (): Promise<ReverseGeocodeAddress | null> => {
    let result: ReverseGeocodeAddress | null = null;
    let providerSucceeded = false;
    try {
      const hit = (await fetchJsonWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`,
        signal,
      )) as Record<string, unknown> | null;
      providerSucceeded = true;
      const a = hit?.address as Record<string, unknown> | undefined;
      if (a && typeof a === 'object') {
        const cc = String(a.country_code || '').toLowerCase();
        const road = String(a.road || a.pedestrian || a.footway || a.neighbourhood || '').trim();
        const num = String(a.house_number || '').trim();
        const street = [num, road].filter(Boolean).join(' ').trim();
        const city = String(
          a.city ||
            a.town ||
            a.village ||
            a.hamlet ||
            a.municipality ||
            a.city_district ||
            a.borough ||
            a.suburb ||
            '',
        ).trim();
        const isoLvl4 = typeof a['ISO3166-2-lvl4'] === 'string' ? a['ISO3166-2-lvl4'] : '';
        const stateCode =
          cc && isoLvl4.toLowerCase().startsWith(`${cc}-`)
            ? isoLvl4.slice(cc.length + 1)
            : '';
        const state = (stateCode || String(a.state || a.region || a.county || '')).trim();
        const postal = String(a.postcode || '').trim();
        const country = String(a.country || '').trim();
        if (street || city || postal) {
          result = { street, city, state, postal, country, cc };
        }
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
    }

    if (!result) {
      try {
        result = await reverseGeocodePhoton(lat, lng, signal);
        providerSucceeded = true;
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) throw err;
      }
    }

    if (providerSucceeded || result) {
      setCached(revCache, cacheKey, result, result ? CACHE_TTL_MS : NULL_CACHE_TTL_MS);
    }
    return result;
  })();

  if (!signal) {
    revInflight.set(cacheKey, run);
    try {
      return await run;
    } finally {
      revInflight.delete(cacheKey);
    }
  }
  return run;
}

export function directionsUrl(
  s: Pick<Sale, 'address'> & Partial<Pick<Sale, 'lat' | 'lng'>>,
): string {
  const hasCoords =
    typeof s.lat === 'number' &&
    typeof s.lng === 'number' &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng) &&
    Math.abs(s.lat) <= 90 &&
    Math.abs(s.lng) <= 180;
  const dest = hasCoords
    ? `${s.lat!.toFixed(6)},${s.lng!.toFixed(6)}`
    : s.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
