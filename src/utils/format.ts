import type {
  MasterTaxonomy,
  Sale,
  SortMode,
  TaxonomyEntry,
  UserLocation,
} from '../types/sale';

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MON = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const todayStart = (): Date => startOfDay(new Date());
export const TODAY = todayStart();
export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const pad = (n: number): string => String(n).padStart(2, '0');
export const iso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDate = (s: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return todayStart();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const dayDiff = (s: string): number =>
  Math.round((parseDate(s).getTime() - todayStart().getTime()) / 864e5);

export const fmtDate = (s: string): string => {
  const n = dayDiff(s);
  const d = parseDate(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};

export const shortDay = (s: string): string =>
  dayDiff(s) === 0 ? 'Today' : DOW[parseDate(s).getDay()];

export const dayLabel = (d: string): string => {
  const n = dayDiff(d);
  if (n <= 1) return fmtDate(d);
  const x = parseDate(d);
  return n <= 6 ? DOW[x.getDay()] : `${DOW[x.getDay()]} ${MON[x.getMonth()]} ${x.getDate()}`;
};

export const fmtTime = (t: string): string => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  if (!m) return t;
  const H = Number(m[1]);
  const M = Number(m[2]);
  if (H < 0 || H > 23 || M < 0 || M > 59) return t;
  const ap = H >= 12 ? 'pm' : 'am';
  const hh = H % 12 === 0 ? 12 : H % 12;
  return `${hh}${M ? `:${pad(M)}` : ''}${ap}`;
};

export const timeRange = (s: Pick<Sale, 'start' | 'end'>): string =>
  `${fmtTime(s.start)}–${fmtTime(s.end)}`;

export const weekendEnd = (): Date => {
  const t = todayStart();
  return addDays(t, (7 - t.getDay()) % 7);
};

export const isWeekend = (s: Pick<Sale, 'date'>): boolean => {
  const d = parseDate(s.date);
  const t = todayStart();
  return [5, 6, 0].includes(d.getDay()) && d >= t && d <= weekendEnd();
};

export interface EndingSoonInfo {
  minutesLeft: number;
  urgent: boolean;
  started: boolean;
  label: string;
  tag: 'Last chance' | 'Ending soon';
}

export function getEndingSoonInfo(
  s: Pick<Sale, 'date' | 'start' | 'end'>,
  now: Date = new Date(),
  windowMinutes = 120,
): EndingSoonInfo | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return null;
  const startMatch = /^(\d{2}):(\d{2})$/.exec(String(s.start || '').trim());
  const endMatch = /^(\d{2}):(\d{2})$/.exec(String(s.end || '').trim());
  if (!startMatch || !endMatch) return null;

  const [y, m, d] = s.date.split('-').map(Number);
  const sh = Number(startMatch[1]);
  const sm = Number(startMatch[2]);
  const eh = Number(endMatch[1]);
  const em = Number(endMatch[2]);
  if (sh > 23 || sm > 59 || eh > 23 || em > 59) return null;

  const startAt = new Date(y, m - 1, d, sh, sm, 0, 0);
  if (
    startAt.getFullYear() !== y ||
    startAt.getMonth() !== m - 1 ||
    startAt.getDate() !== d
  ) {
    return null;
  }
  const endAt = new Date(y, m - 1, d, eh, em, 0, 0);
  if (endAt.getTime() <= startAt.getTime()) return null;

  const msLeft = endAt.getTime() - now.getTime();
  if (msLeft <= 0 || msLeft > windowMinutes * 60_000) return null;

  const minutesLeft = Math.max(1, Math.ceil(msLeft / 60_000));
  const urgent = minutesLeft <= 30;
  const started = now.getTime() >= startAt.getTime();

  let label: string;
  if (minutesLeft < 60) {
    label = `Ending in ${minutesLeft} min`;
  } else if (minutesLeft === 60) {
    label = 'Ending in 1 hr';
  } else if (minutesLeft % 60 === 0) {
    label = `Ending in ${minutesLeft / 60} hrs`;
  } else {
    const hrs = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;
    label = `Ending in ${hrs}h ${mins}m`;
  }

  return {
    minutesLeft,
    urgent,
    started,
    label,
    tag: urgent ? 'Last chance' : 'Ending soon',
  };
}

export const norm = (t: string): string => t.trim().replace(/\s+/g, ' ');
export const cap = (t: string): string => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
export const mkey = (type: 'category' | 'item', name: string): string => {
  const k = norm(name).toLowerCase();
  return `${type}:${k.length > 3 && k.endsWith('s') ? k.slice(0, -1) : k}`;
};

function addTo(
  m: MasterTaxonomy,
  type: 'category' | 'item',
  name: string,
  cats: string[],
  n: number,
) {
  const k = mkey(type, name);
  const existing = m[k];
  const e: TaxonomyEntry =
    existing || { type, name: cap(norm(name)), count: 0, cats: {} };
  m[k] = e;
  e.count += n;
  (cats || []).forEach((c) => {
    e.cats[c] = (e.cats[c] || 0) + n;
  });
}

export function buildMaster(
  sales: Sale[],
  baseCats: readonly string[],
  baseCatalog: Record<string, readonly string[]>,
): MasterTaxonomy {
  const m: MasterTaxonomy = {};
  baseCats.forEach((c) => addTo(m, 'category', c, [], 0));
  Object.keys(baseCatalog).forEach((c) =>
    baseCatalog[c].forEach((i) => addTo(m, 'item', i, [c], 0)),
  );
  sales.forEach((s) => {
    s.cats.forEach((c) => addTo(m, 'category', c, [], 1));
    (s.items || []).forEach((i) => addTo(m, 'item', i, s.cats, 1));
  });
  return m;
}

export function ranked(master: MasterTaxonomy, type: 'category' | 'item'): TaxonomyEntry[] {
  return Object.values(master)
    .filter((e) => e.type === type)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const primaryCat = (e: TaxonomyEntry): string | undefined =>
  Object.keys(e.cats).sort((a, b) => e.cats[b] - e.cats[a])[0];

export const itemsFor = (
  master: MasterTaxonomy,
  cats: string[],
  n: number,
): TaxonomyEntry[] => {
  const score = (e: TaxonomyEntry) =>
    cats.reduce((t, c) => t + (e.cats[c] || 0), 0);
  return ranked(master, 'item')
    .filter((e) => !cats.length || cats.some((c) => c in e.cats))
    .sort(
      (a, b) =>
        score(b) - score(a) || b.count - a.count || a.name.localeCompare(b.name),
    )
    .slice(0, n);
};

export const searchMaster = (
  master: MasterTaxonomy,
  type: 'category' | 'item',
  q: string,
  exclude: string[],
  n: number,
): TaxonomyEntry[] => {
  const lo = q.trim().toLowerCase();
  const ex = new Set(exclude.map((x) => x.toLowerCase()));
  return ranked(master, type)
    .filter((e) => {
      const nameLo = e.name.toLowerCase();
      return nameLo.includes(lo) && !ex.has(nameLo);
    })
    .sort(
      (a, b) =>
        (b.name.toLowerCase().startsWith(lo) ? 1 : 0) -
        (a.name.toLowerCase().startsWith(lo) ? 1 : 0),
    )
    .slice(0, n);
};

export const countMeta = (e: TaxonomyEntry): string | undefined =>
  e.count ? `${e.count}${e.count === 1 ? ' listing' : ' listings'}` : undefined;

export const shareUrl = (s: Sale): string => {
  try {
    return `${location.href.split('#')[0]}#${encodeURIComponent(s.id)}`;
  } catch {
    return '';
  }
};

export const shareText = (s: Sale): string =>
  `${s.title} — ${fmtDate(s.date)}, ${timeRange(s)} · ${s.address}`;

export async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    // fallback below
  }
  try {
    const a = document.createElement('textarea');
    a.value = t;
    a.setAttribute('readonly', '');
    a.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(a);
    a.select();
    const ok = document.execCommand('copy');
    a.remove();
    return ok;
  } catch {
    return false;
  }
}

export interface ShareSaleResult {
  method: 'web-share' | 'clipboard' | 'cancelled';
  ok: boolean;
  url: string;
  message?: string;
}

export interface ShareSaleDeps {
  nav?: Partial<Pick<Navigator, 'share' | 'canShare'>> | null;
  copy?: (text: string) => Promise<boolean>;
  getUrl?: (sale: Sale) => string;
}

export async function shareSaleLink(
  s: Sale,
  deps?: ShareSaleDeps,
): Promise<ShareSaleResult> {
  const url = (deps?.getUrl ?? shareUrl)(s);
  const text = shareText(s);
  const nav =
    deps && 'nav' in deps
      ? deps.nav
      : typeof navigator !== 'undefined'
        ? navigator
        : undefined;

  if (nav && typeof nav.share === 'function') {
    const payload: ShareData = url
      ? { title: s.title, text, url }
      : { title: s.title, text };
    let allowed = true;
    if (typeof nav.canShare === 'function') {
      try {
        allowed = nav.canShare(payload);
      } catch {
        allowed = false;
      }
    }
    if (allowed) {
      try {
        await nav.share(payload);
        return {
          method: 'web-share',
          ok: true,
          url,
          message: 'Sale link shared',
        };
      } catch (err) {
        if (err && (err as { name?: string }).name === 'AbortError') {
          return { method: 'cancelled', ok: false, url };
        }
        // Non-abort share error (e.g. iframe restriction or desktop policy): fall back to clipboard.
      }
    }
  }

  const copy = deps?.copy ?? copyText;
  const ok = await copy(url || text);
  return {
    method: 'clipboard',
    ok,
    url,
    message: ok ? 'Share link copied to clipboard' : "Couldn't copy share link.",
  };
}

export function isAppleMobileDevice(
  userAgent?: string,
  maxTouchPoints?: number,
): boolean {
  const ua =
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  const touch =
    maxTouchPoints ??
    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0);
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && touch > 1;
}

export function smsShareBody(
  s: Sale,
  getUrl: (sale: Sale) => string = shareUrl,
): string {
  const url = getUrl(s);
  const summary = shareText(s);
  return url ? `${summary}\n${url}` : summary;
}

export function smsShareUrl(
  s: Sale,
  opts?: {
    userAgent?: string;
    maxTouchPoints?: number;
    getUrl?: (sale: Sale) => string;
  },
): string {
  const body = smsShareBody(s, opts?.getUrl ?? shareUrl);
  const sep = isAppleMobileDevice(opts?.userAgent, opts?.maxTouchPoints) ? '&' : '?';
  return `sms:${sep}body=${encodeURIComponent(body)}`;
}

export function fitsTagsInRows(
  widths: number[],
  containerWidth: number,
  gap: number,
  maxRows: number,
): boolean {
  if (widths.length === 0) return true;
  if (containerWidth <= 0 || maxRows < 1) return false;
  let rows = 1;
  let lineW = 0;
  for (let i = 0; i < widths.length; i++) {
    const w = Math.min(Math.max(0, widths[i]), containerWidth);
    if (lineW === 0) {
      lineW = w;
    } else if (lineW + gap + w <= containerWidth) {
      lineW += gap + w;
    } else {
      rows += 1;
      if (rows > maxRows) return false;
      lineW = w;
    }
  }
  return rows <= maxRows;
}

export function computeVisibleTagCount(
  containerWidth: number,
  itemWidths: number[],
  gap: number,
  measureOverflowWidth: (hiddenCount: number) => number,
  maxRows = 1,
): number {
  const n = itemWidths.length;
  if (n === 0) return 0;
  if (containerWidth <= 0) return n;
  const safeRows = Math.max(1, Math.floor(maxRows));

  if (fitsTagsInRows(itemWidths, containerWidth, gap, safeRows)) {
    return n;
  }

  for (let k = n - 1; k >= 1; k--) {
    const hidden = n - k;
    const moreW = Math.max(0, measureOverflowWidth(hidden));
    const candidate = itemWidths.slice(0, k);
    candidate.push(moreW);
    if (fitsTagsInRows(candidate, containerWidth, gap, safeRows)) {
      return k;
    }
  }

  return 1;
}

export const MAX_PHOTOS = 4;
const MAX_PHOTO_DATA_CHARS = 170_000;

export function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      reject(new Error('empty file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= 0 || img.height <= 0) {
        reject(new Error('invalid dimensions'));
        return;
      }
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas unavailable'));
        return;
      }

      let maxDim = 760;
      let dataUrl = '';
      for (let attempt = 0; attempt < 6; attempt++) {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.68, 0.52, 0.36]) {
          dataUrl = c.toDataURL('image/jpeg', q);
          if (dataUrl.length <= MAX_PHOTO_DATA_CHARS) break;
        }
        if (dataUrl.length <= MAX_PHOTO_DATA_CHARS) break;
        maxDim = Math.round(maxDim * 0.72);
      }

      c.width = 0;
      c.height = 0;
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}

export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return NaN;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const rawH =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const h = Math.min(1, Math.max(0, rawH));
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const IMPERIAL_LOCALES = new Set(['en-US', 'en-GB', 'en-LR', 'en-MM']);

function prefersMiles(): boolean {
  try {
    const lang = navigator.language || 'en-US';
    if (IMPERIAL_LOCALES.has(lang)) return true;
    return lang === 'en';
  } catch {
    return true;
  }
}

export interface DistanceDisplay {
  miles: number;
  text: string;
  display: string;
  approximate: boolean;
  ariaLabel: string;
  title: string;
}

export function getDistanceDisplay(
  from: UserLocation | null | undefined,
  to: { lat: number; lng: number },
  opts?: { imperial?: boolean },
): DistanceDisplay | null {
  if (!from) return null;
  const mi = distanceMiles(from, to);
  if (!Number.isFinite(mi)) return null;

  const useMiles = opts?.imperial ?? prefersMiles();
  let text: string;
  if (useMiles) {
    if (mi < 0.1) text = '< 0.1 mi';
    else if (mi < 10) text = `${mi.toFixed(1)} mi`;
    else text = `${Math.round(mi).toLocaleString()} mi`;
  } else {
    const km = mi * 1.609344;
    if (km < 0.1) text = '< 0.1 km';
    else if (km < 10) text = `${km.toFixed(1)} km`;
    else text = `${Math.round(km).toLocaleString()} km`;
  }

  const approximate = from.precise === false;
  const display = approximate ? `~${text}` : text;
  const ariaLabel = approximate
    ? `About ${text} away (approximate location)`
    : `${text} away`;
  const title = approximate
    ? `About ${text} from your approximate location`
    : `${text} from your location`;

  return { miles: mi, text, display, approximate, ariaLabel, title };
}

export function formatDistance(
  from: UserLocation | null | undefined,
  to: { lat: number; lng: number },
  opts?: { imperial?: boolean },
): string | null {
  return getDistanceDisplay(from, to, opts)?.display ?? null;
}

export function sortSalesByMode(
  sales: Sale[],
  sortBy: SortMode,
  userLoc: UserLocation | null | undefined,
): Sale[] {
  const chrono = (a: Sale, b: Sale) =>
    (a.date + a.start).localeCompare(b.date + b.start);
  if (
    sortBy !== 'nearest' ||
    !userLoc ||
    !Number.isFinite(userLoc.lat) ||
    !Number.isFinite(userLoc.lng)
  ) {
    return [...sales].sort(chrono);
  }
  return [...sales].sort((a, b) => {
    const da = distanceMiles(userLoc, a);
    const db = distanceMiles(userLoc, b);
    const fa = Number.isFinite(da);
    const fb = Number.isFinite(db);
    if (fa && fb && Math.abs(da - db) > 1e-6) return da - db;
    if (fa !== fb) return fa ? -1 : 1;
    return chrono(a, b);
  });
}
