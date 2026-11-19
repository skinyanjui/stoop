export type PaymentId =
  | 'cash'
  | 'card'
  | 'nfc'
  | 'applepay'
  | 'googlepay'
  | 'venmo'
  | 'cashapp'
  | 'zelle'
  | 'paypal'
  | 'check'
  | 'mpesa'
  | 'upi'
  | 'pix'
  | 'etransfer'
  | 'bank';

export interface PaymentMethod {
  id: PaymentId;
  label: string;
  icon?: 'cash' | 'card' | 'nfc' | 'check';
  mono?: string;
}

export type SaleType = 'Garage Sale' | 'Flea Market' | 'Car Boot Sale';

export interface Sale {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  date: string;
  start: string;
  end: string;
  saleType?: SaleType;
  cats: string[];
  items: string[];
  prices?: Record<string, number>;
  level: number;
  cur: string;
  food: boolean;
  drinks: boolean;
  photos: string[];
  pay: string[];
  desc: string;
  owner?: string;
  ownerId?: string;
  local?: boolean;
  isSeed?: boolean;
}

export interface SaleDraft {
  title: string;
  address: string;
  lat: number;
  lng: number;
  date: string;
  start: string;
  end: string;
  saleType: SaleType;
  cats: string[];
  items: string[];
  prices: Record<string, number>;
  level: number;
  cur: string;
  food: boolean;
  drinks: boolean;
  photos: string[];
  pay: string[];
  desc: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  payments: string[];
  savedIds: string[];
  listingOrder?: string[];
}

export interface MapViewState {
  s: number;
  w: number;
  n: number;
  e: number;
  lat: number;
  lng: number;
  zoom: number;
}

export interface ViewReq {
  lat: number;
  lng: number;
  zoom?: number;
  bbox?: number[] | null;
  n: number;
}

export interface CenterReq {
  id: string;
  n: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  precise?: boolean;
}

export type SortMode = 'soonest' | 'nearest';

export interface TaxonomyEntry {
  type: 'category' | 'item';
  name: string;
  count: number;
  cats: Record<string, number>;
}

export type MasterTaxonomy = Record<string, TaxonomyEntry>;

export interface GeocodeResult {
  cc: string;
  lat: number;
  lng: number;
  bbox: number[] | null;
  name: string;
}

export interface ToastState {
  msg: string;
  undo?: () => void;
}

export interface SponsorAd {
  id: string;
  sponsor: string;
  title: string;
  subtitle: string;
  details: string;
  meta: string;
  cta: string;
  code: string;
  image: string;
}

