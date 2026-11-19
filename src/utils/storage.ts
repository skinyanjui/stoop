export const LOCAL_SAVED_KEY = 'stoop.saved.v1';
export const LISTING_ORDER_KEY = 'stoop.listingOrder.v1';
export const TERMS_KEY = 'stoop.termsAccepted.v1';
export const RECENT_SEARCHES_KEY = 'stoop.recentSearches.v1';
export const MAX_RECENT_SEARCHES = 6;

export interface RecentSearch {
  id: string;
  kind: 'item' | 'category' | 'place';
  label: string;
  value: string;
  coords?: {
    lat: number;
    lng: number;
    zoom?: number;
    bbox?: number[] | null;
  };
}

export function readLocalStringList(key: string, maxItems = 200): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

export function writeLocalJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function readLocalFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeLocalFlag(key: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

export function sanitizeRecentSearches(raw: unknown): RecentSearch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is RecentSearch =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as RecentSearch).id === 'string' &&
        typeof (x as RecentSearch).label === 'string' &&
        typeof (x as RecentSearch).value === 'string' &&
        ((x as RecentSearch).kind === 'item' ||
          (x as RecentSearch).kind === 'category' ||
          (x as RecentSearch).kind === 'place'),
    )
    .slice(0, MAX_RECENT_SEARCHES);
}

export function readRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return sanitizeRecentSearches(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function upsertRecentSearch(
  prev: RecentSearch[],
  entry: Omit<RecentSearch, 'id'>,
): RecentSearch[] {
  const cleanVal = entry.value.trim();
  const cleanLbl = entry.label.trim();
  if (!cleanVal || !cleanLbl) return prev;
  const id = `${entry.kind}:${cleanVal.toLowerCase()}`;
  return [
    { ...entry, id, label: cleanLbl, value: cleanVal },
    ...prev.filter(
      (r) =>
        r.id !== id &&
        !(r.kind === entry.kind && r.label.toLowerCase() === cleanLbl.toLowerCase()),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);
}
