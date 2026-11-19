import { curOf, saleTypeOf } from '../data/seedSales';
import type { Sale, UserProfile } from '../types/sale';
import { iso, todayStart } from './format';

const DOC_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const PHOTO_BUDGET_BYTES = 650_000;
const PHOTO_MAX_BYTES = 180_000;
const MAX_PHOTOS = 4;

export function isValidDocId(id: unknown): id is string {
  return typeof id === 'string' && DOC_ID_RE.test(id);
}

export function sanitizeStringList(
  values: unknown,
  maxItemLength: number,
  maxItems: number,
): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, maxItemLength);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeIdList(values: unknown, maxItems: number): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (!isValidDocId(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= maxItems) break;
  }
  return out;
}

export interface AuthUserLike {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export function normalizeUserProfile(
  fbUser: AuthUserLike,
  data?: Record<string, unknown> | null,
): UserProfile {
  const name =
    data && typeof data.name === 'string' && data.name.trim()
      ? data.name.trim().slice(0, 80)
      : (fbUser.displayName || 'Seller').trim().slice(0, 80) || 'Seller';
  const email =
    data && typeof data.email === 'string'
      ? data.email.trim().slice(0, 160)
      : (fbUser.email || '').trim().slice(0, 160);
  const payments = data ? sanitizeStringList(data.payments, 32, 15) : ['cash'];
  return {
    uid: fbUser.uid,
    name,
    email,
    photoURL: fbUser.photoURL || undefined,
    payments: payments.length > 0 ? payments : ['cash'],
    savedIds: data ? sanitizeIdList(data.savedIds, 200) : [],
    listingOrder: data ? sanitizeIdList(data.listingOrder, 200) : [],
  };
}

export function buildUserUpdatePatch<T>(
  fields: Partial<Pick<UserProfile, 'name' | 'payments' | 'savedIds' | 'listingOrder'>>,
  updatedAtValue: T,
): { hasChanges: boolean; patch: Record<string, unknown> } {
  const patch: Record<string, unknown> = {};
  let hasChanges = false;

  if (fields.name !== undefined) {
    patch.name = fields.name.trim().slice(0, 80) || 'Seller';
    hasChanges = true;
  }
  if (fields.payments !== undefined) {
    patch.payments = sanitizeStringList(fields.payments, 32, 15);
    hasChanges = true;
  }
  if (fields.savedIds !== undefined) {
    patch.savedIds = sanitizeIdList(fields.savedIds, 200);
    hasChanges = true;
  }
  if (fields.listingOrder !== undefined) {
    patch.listingOrder = sanitizeIdList(fields.listingOrder, 200);
    hasChanges = true;
  }

  if (hasChanges) {
    patch.updatedAt = updatedAtValue;
  }

  return { hasChanges, patch };
}

function normalizeTimeHHMM(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  const singleHour = trimmed.match(/^(\d):(\d{2})(?::\d{2})?$/);
  if (singleHour) {
    return `0${singleHour[1]}:${singleHour[2]}`;
  }
  const full = trimmed.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (full) {
    const h = Number(full[1]);
    const m = Number(full[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${full[1]}:${full[2]}`;
    }
  }
  return fallback;
}

export function buildSalePayload<T>(
  sale: Sale,
  uid: string,
  isUpdate: boolean,
  timestampValue: T,
): { payload: Record<string, unknown>; droppedPhotos: boolean } {
  const lat = Number(sale.lat);
  const lng = Number(sale.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new Error('Invalid sale coordinates');
  }

  const rawPhotos = Array.isArray(sale.photos) ? sale.photos : [];
  const boundedPhotos: string[] = [];
  let budget = PHOTO_BUDGET_BYTES;
  for (const p of rawPhotos) {
    if (
      typeof p === 'string' &&
      (p.startsWith('data:image/') || p.startsWith('https://')) &&
      p.length <= PHOTO_MAX_BYTES &&
      p.length <= budget &&
      boundedPhotos.length < MAX_PHOTOS
    ) {
      boundedPhotos.push(p);
      budget -= p.length;
    }
  }

  const cleanCats = sanitizeStringList(sale.cats, 60, 40);
  const cleanItems = sanitizeStringList(sale.items, 80, 30);
  const cleanPay = sanitizeStringList(sale.pay, 32, 15);
  const levelNum = Number(sale.level);
  const level = Number.isFinite(levelNum) && levelNum >= 0 && levelNum <= 3 ? Math.round(levelNum) : 0;

  const payload: Record<string, unknown> = {
    title: (typeof sale.title === 'string' ? sale.title.trim().slice(0, 120) : '') || 'Yard sale',
    address:
      (typeof sale.address === 'string' ? sale.address.trim().slice(0, 200) : '') ||
      'Address listed on map',
    lat,
    lng,
    date:
      typeof sale.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sale.date)
        ? sale.date
        : iso(todayStart()),
    start: normalizeTimeHHMM(sale.start, '08:00'),
    end: normalizeTimeHHMM(sale.end, '14:00'),
    saleType: saleTypeOf(sale.saleType),
    cats: cleanCats.length ? cleanCats : ['Household'],
    items: cleanItems,
    level,
    cur: curOf(sale),
    food: !!sale.food,
    drinks: !!sale.drinks,
    photos: boundedPhotos,
    pay: cleanPay,
    desc: typeof sale.desc === 'string' ? sale.desc.trim().slice(0, 2000) : '',
    updatedAt: timestampValue,
  };

  if (sale.prices && typeof sale.prices === 'object') {
    const validPrices: Array<[string, number]> = [];
    for (const [k, v] of Object.entries(sale.prices)) {
      const cleanKey = k.trim().slice(0, 80);
      if (cleanKey && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        validPrices.push([cleanKey, v]);
        if (validPrices.length >= 30) break;
      }
    }
    if (validPrices.length > 0 || isUpdate) {
      payload.prices = Object.fromEntries(validPrices);
    }
  } else if (isUpdate) {
    payload.prices = {};
  }

  if (!isUpdate) {
    payload.status = 'active';
    payload.ownerUid = uid;
    payload.createdAt = timestampValue;
  }

  return {
    payload,
    droppedPhotos: rawPhotos.length > boundedPhotos.length,
  };
}

export function applySaleOwnership(sales: Sale[], uid: string | null): Sale[] {
  return sales.map((s) => ({
    ...s,
    ownerId: uid && s.owner === uid ? 'me' : s.owner || 'cloud',
  }));
}
