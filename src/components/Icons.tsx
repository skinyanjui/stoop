import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PAYMENTS, payOf } from '../data/seedSales';
import type { Sale, UserProfile } from '../types/sale';
import { computeVisibleTagCount } from '../utils/format';

export const PATHS: Record<string, string> = {
  search: 'M11 11l3.5 3.5M7 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z',
  plus: 'M8 3v10M3 8h10',
  minus: 'M3 8h10',
  x: 'M4 4l8 8M12 4l-8 8',
  list: 'M3 4h10M3 8h10M3 12h10',
  map: 'M2 4l4-1.5 4 1.5 4-1.5v9.5l-4 1.5-4-1.5-4 1.5zM6 2.5v10M10 4v10',
  nav: 'M13 3L3 7.1l4.2 1.7L8.9 13z',
  user: 'M8 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14.5c.4-3 2.6-4.5 5.5-4.5s5.1 1.5 5.5 4.5',
  edit: 'M2.5 13.5l.7-3L10.7 3a1.4 1.4 0 0 1 2 0l.3.3a1.4 1.4 0 0 1 0 2L5.5 12.8zM9.5 4.2l2.3 2.3',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5',
  chevron: 'M6 3.5L10.5 8 6 12.5',
  share: 'M8 10V2M5 4.5L8 1.5 11 4.5M3.5 7.5v6h9v-6',
  'cat-household': 'M2 7.5L8 2.5l6 5M3.5 6.5v7h9v-7M6.5 13.5v-4h3v4',
  'cat-furniture': 'M3.5 7V5.5A1.5 1.5 0 0 1 5 4h6a1.5 1.5 0 0 1 1.5 1.5V7M1.8 7.5a1.2 1.2 0 0 1 2.4 0V10h7.6V7.5a1.2 1.2 0 0 1 2.4 0V12H1.8zM4 12v1.5M12 12v1.5',
  'cat-tools': 'M10.2 2.2a3.3 3.3 0 0 0-3.1 4.4L2.4 11.3a1.3 1.3 0 0 0 1.8 1.8L8.9 8.4a3.3 3.3 0 0 0 4.4-3.1L11.4 7.2 9.7 6.3 8.8 4.6z',
  'cat-antiques': 'M8 4.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM8 7v3l1.8 1M6.5 2h3M8 2v2.5',
  'cat-books': 'M3 2.5h7.5a1 1 0 0 1 1 1v10H4a1 1 0 0 1-1-1zM11.5 5.5h1.5v8h-1.5M5.5 5.5h3.5',
  'cat-electronics': 'M2 3.5h12v7.5H2zM5.5 13.5h5M8 11v2.5',
  'cat-kids': 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM5.8 6.8h.01M10.2 6.8h.01M5.5 9.5c1.2 1.5 3.8 1.5 5 0',
  'cat-clothing': 'M5.5 2.5L2 4.5l1.5 3L5 6.8v6.7h6V6.8l1.5.7 1.5-3-3.5-2c-.4 1-1.3 1.6-2.5 1.6S5.9 3.5 5.5 2.5z',
  'cat-toys': 'M2.5 8.5h5v5h-5zM8.5 8.5h5v5h-5zM5.5 3h5v5.5h-5z',
  'cat-sports': 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM2 8h12M8 2c-2.4 2.4-2.4 9.6 0 12M8 2c2.4 2.4 2.4 9.6 0 12',
  'cat-garden': 'M8 14V8.5M8 8.5C8 5.5 6 3.5 3 3.5 3 6.5 4.5 8.5 8 8.5M8 10c0-2.5 1.8-4.2 5-4.2 0 3-1.5 4.2-5 4.2',
  'cat-kitchen': 'M5 2v4.5a1.5 1.5 0 0 0 3 0V2M6.5 2v12M11.5 14V2C10 3 9.5 5 9.5 7.5h2',
  'cat-appliances': 'M3.5 2h9v12h-9zM3.5 5h9M8 12.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4zM5.5 3.5h.01',
  'cat-music': 'M6 12V3.5l7-1.5v9M6 12a1.7 1.7 0 1 1-3.4 0A1.7 1.7 0 0 1 6 12zM13 10.5a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0z',
  'cat-games': 'M4.5 5h7a3 3 0 0 1 3 3.2l-.4 3a1.7 1.7 0 0 1-2.9.9L10.1 11H5.9l-1.1 1.1a1.7 1.7 0 0 1-2.9-.9l-.4-3A3 3 0 0 1 4.5 5zM5.5 7v2.5M4.3 8.3h2.4M10.5 7.8h.01M12 9.2h.01',
  'cat-baby': 'M6.5 4h3M7 4V2.5h2V4M6 6.5C6 5 6.8 4 8 4s2 1 2 2.5v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM6 8.5h4M6 11h4',
  'cat-jewelry': 'M5 3h6l3 3.5L8 14 2 6.5zM2 6.5h12M6 6.5L8 3l2 3.5M8 14L6 6.5M8 14l2-7.5',
  'cat-art': 'M2.5 2.5h11v11h-11zM5 11.5l2.5-3 2 2 1.5-1.5 2 2.5M5.5 5.5h.01',
  'cat-auto': 'M8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6L5 5M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4',
  'cat-crafts': 'M4 6.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM4 13.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM5.4 5.4L13.5 12M5.4 10.6L13.5 4',
  'cat-collectibles': 'M8 2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13.1l.7-4L2.2 6.3l4-.6z',
  'cat-holiday': 'M2.5 6h11v2.5h-11zM3.5 8.5v5h9v-5M8 6v7.5M8 6C6 6 4.5 5 5 3.8 5.6 2.5 7.5 3.5 8 6c.5-2.5 2.4-3.5 3-2.2.5 1.2-1 2.2-3 2.2z',
  'cat-bikes': 'M4 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4 11L6.5 5.5h3.5l2 5.5M6.5 5.5L8 11h4M5.5 3.8h2',
  'cat-pets': 'M8 12.5c-2 0-3.5-1-3.5-2.3 0-1.4 1.6-3 3.5-3s3.5 1.6 3.5 3c0 1.3-1.5 2.3-3.5 2.3zM3 6.5a1 1.2 0 1 0 2 0 1 1.2 0 1 0-2 0zM6 3.8a1.3 0 1 0 2 0 1 1.3 0 1 0-2 0zM8 3.8a1.3 0 1 0 2 0 1 1.3 0 1 0-2 0zM11 6.5a1.2 0 1 0 2 0 1 1.2 0 1 0-2 0z',
  'cat-free': 'M2.5 8.5v-6h6l5 5-6 6zM5.5 5.5h.01',
  'cat-tag': 'M2.5 8.5v-6h6l5 5-6 6zM5.5 5.5h.01',
  heart: 'M8 13.3S2 9.8 2 5.8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z',
  cal: 'M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3',
  image: 'M2 3h12v10H2zM2 11l3.5-3.5L9 11l2-2 3 3M10.5 6.2h.01',
  cash: 'M1.5 4h13v8h-13zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3.5 6.2v3.6M12.5 6.2v3.6',
  card: 'M1.5 3.5h13v9h-13zM1.5 6.5h13M3.5 10h3',
  nfc: 'M5.5 5.5a3.5 3.5 0 0 1 0 5M8.5 3.5a6.5 6.5 0 0 1 0 9M11.5 1.5a9.5 9.5 0 0 1 0 13',
  check: 'M1.5 3.5h13v9h-13zM3.5 6.5h5M3.5 9h3M10 10.5l1-1 1 1 1.5-2',
  locate: 'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15',
  flag: 'M4.25 13.5V2.5h7.5l-1.5 3 1.5 3H4.25',
  grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  checkmark: 'M3 8.5l3.2 3.2L13 4.5',
  sms: 'M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6.5L3.2 14v-2.5h-.7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z',
};

export const GARAGE_SVG =
  '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 13.5V6.5L8 2.5l5.5 4v7h-11zM5 13.5V8.5h6v5M5 11h6"/></svg>';

export const LEMON_SVG =
  '<svg class="lemon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.6 9.2c0-3.3 3.2-6 6.6-6 1.7 0 3 .5 3.9 1.3l1.7-.9-.6 1.9c.5.7.8 1.5.8 2.4 0 3.2-3.3 5.9-6.6 5.9-1.4 0-2.6-.4-3.4-1.1l-1.9.3.7-1.7c-.7-.6-1.2-1.3-1.2-2.1z" fill="#fde047" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M5 6.2c.8-.9 1.9-1.4 3-1.4" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/></svg>';

export const FOOD_SVG =
  '<svg class="food" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2v4.2M2.5 2v3.2a2 2 0 0 0 4 0V2M4.5 7.2V14M11.5 14V2c-1.7 1-2.5 3-2.5 5.2h2.5"/></svg>';

export function GarageIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable={false}
    >
      <path d="M2.5 13.5V6.5L8 2.5l5.5 4v7h-11zM5 13.5V8.5h6v5M5 11h6" />
    </svg>
  );
}

export function FoodIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="food"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable={false}
    >
      <path d="M4.5 2v4.2M2.5 2v3.2a2 2 0 0 0 4 0V2M4.5 7.2V14M11.5 14V2c-1.7 1-2.5 3-2.5 5.2h2.5" />
    </svg>
  );
}

export function LemonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="lemon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable={false}
    >
      <path
        d="M1.6 9.2c0-3.3 3.2-6 6.6-6 1.7 0 3 .5 3.9 1.3l1.7-.9-.6 1.9c.5.7.8 1.5.8 2.4 0 3.2-3.3 5.9-6.6 5.9-1.4 0-2.6-.4-3.4-1.1l-1.9.3.7-1.7c-.7-.6-1.2-1.3-1.2-2.1z"
        fill="#fde047"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path
        d="M5 6.2c.8-.9 1.9-1.4 3-1.4"
        fill="none"
        stroke="#fff"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
}

export const CAT_ICON: Record<string, string> = {
  household: 'household',
  furniture: 'furniture',
  tools: 'tools',
  antiques: 'antiques',
  books: 'books',
  electronics: 'electronics',
  kids: 'kids',
  clothing: 'clothing',
  toys: 'toys',
  'sports & outdoors': 'sports',
  garden: 'garden',
  kitchen: 'kitchen',
  appliances: 'appliances',
  music: 'music',
  games: 'games',
  baby: 'baby',
  jewelry: 'jewelry',
  'art & decor': 'art',
  'auto parts': 'auto',
  crafts: 'crafts',
  collectibles: 'collectibles',
  holiday: 'holiday',
  bikes: 'bikes',
  pets: 'pets',
  'free stuff': 'free',
};

export const catIcon = (c: string): string =>
  `cat-${CAT_ICON[String(c).toLowerCase()] || 'tag'}`;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable={false}
    >
      <path d={PATHS[name] || PATHS['cat-tag']} />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3L11 8 6 13" stroke="#000" strokeWidth={5} />
      <path d="M6 3L11 8 6 13" stroke="#fff" strokeWidth={2.6} />
    </svg>
  );
}

export function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={!!active}
      aria-label={active && label ? `Remove filter: ${label}` : undefined}
      onClick={onClick}
    >
      {children}
      {active && <Icon name="x" size={12} />}
    </button>
  );
}

export function Tags({
  cats,
  max,
  responsive = false,
  maxRows = 1,
  expandable = false,
}: {
  cats: string[];
  max?: number;
  responsive?: boolean;
  maxRows?: number;
  expandable?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const more1Ref = useRef<HTMLSpanElement>(null);
  const more2Ref = useRef<HTMLSpanElement>(null);
  const catsKey = cats.join('\u0001');
  const [visibleCount, setVisibleCount] = useState(cats.length);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [catsKey]);

  useLayoutEffect(() => {
    if (!responsive) {
      setVisibleCount(cats.length);
      return;
    }
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    let cancelled = false;
    const recalc = () => {
      if (cancelled) return;
      const containerWidth = Math.floor(wrap.clientWidth);
      if (containerWidth <= 0) return;

      const nodes = measure.querySelectorAll<HTMLElement>('[data-measure-tag]');
      const widths = Array.from(nodes, (el) =>
        Math.ceil(el.getBoundingClientRect().width),
      );
      const more1 = more1Ref.current
        ? Math.ceil(more1Ref.current.getBoundingClientRect().width)
        : 28;
      const more2 = more2Ref.current
        ? Math.ceil(more2Ref.current.getBoundingClientRect().width)
        : 34;

      const computedGap = parseFloat(
        window.getComputedStyle(measure).columnGap || '4',
      );
      const gap = Number.isFinite(computedGap) ? computedGap : 4;

      const next = computeVisibleTagCount(
        containerWidth,
        widths,
        gap,
        (hidden) => (hidden < 10 ? more1 : more2),
        maxRows,
      );
      setVisibleCount((prev) => (prev === next ? prev : next));
    };

    recalc();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(recalc);
      ro.observe(wrap);
    }
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(recalc);
    }

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [responsive, catsKey, cats.length, maxRows]);

  if (!responsive) {
    const shown = max ? cats.slice(0, max) : cats;
    const rest = cats.length - shown.length;
    return (
      <div className="tags">
        {shown.map((c, idx) => (
          <span key={`${c}-${idx}`} className="tag" title={c}>
            {c}
          </span>
        ))}
        {rest > 0 && <span className="tag tag-more">+{rest}</span>}
      </div>
    );
  }

  const clampedCount = Math.max(0, Math.min(cats.length, visibleCount));
  const showAll = expanded || clampedCount >= cats.length;
  const shown = showAll ? cats : cats.slice(0, clampedCount);
  const hiddenCats = showAll ? [] : cats.slice(clampedCount);
  const rest = hiddenCats.length;
  const canCollapse = expandable && expanded && clampedCount < cats.length;

  return (
    <div className="tags-wrap" ref={wrapRef}>
      <div className="tags-measure" ref={measureRef} aria-hidden="true">
        {cats.map((c, idx) => (
          <span key={`${c}-${idx}`} className="tag" data-measure-tag="1">
            {c}
          </span>
        ))}
        <span ref={more1Ref} className="tag tag-more">
          +9
        </span>
        <span ref={more2Ref} className="tag tag-more">
          +99
        </span>
      </div>
      <div
        className="tags"
        data-single-row={maxRows === 1 && !expanded ? 'true' : undefined}
      >
        {shown.map((c, idx) => (
          <span key={`${c}-${idx}`} className="tag" title={c}>
            {c}
          </span>
        ))}
        {rest > 0 &&
          (expandable ? (
            <button
              type="button"
              className="tag tag-more is-btn"
              title={hiddenCats.join(', ')}
              aria-label={`Show ${rest} more items: ${hiddenCats.join(', ')}`}
              onClick={() => setExpanded(true)}
            >
              +{rest}
            </button>
          ) : (
            <span
              className="tag tag-more"
              title={hiddenCats.join(', ')}
              aria-label={`${rest} more: ${hiddenCats.join(', ')}`}
            >
              +{rest}
            </span>
          ))}
        {canCollapse && (
          <button
            type="button"
            className="tag tag-more is-btn"
            aria-label="Show fewer items"
            onClick={() => setExpanded(false)}
          >
            Less
          </button>
        )}
      </div>
    </div>
  );
}

export function PayIcon({ id, size = 22 }: { id: string; size?: number }) {
  const m = payOf(id);
  if (!m) return null;
  const smallClass = size <= 20 ? 'w-5 h-5 text-[9px]' : 'w-[22px] h-[22px] text-[10px]';
  return (
    <span
      className={`pay-tile ${smallClass}`}
      title={m.label}
      aria-hidden="true"
    >
      {m.icon ? <Icon name={m.icon} size={Math.round(size * 0.7)} /> : m.mono}
    </span>
  );
}

export function PayPicker({
  value,
  onChange,
  labelId,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  labelId: string;
}) {
  return (
    <div className="pay-grid" role="group" aria-labelledby={labelId}>
      {PAYMENTS.map((m) => {
        const on = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            className="chip pay-chip"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])
            }
          >
            <PayIcon id={m.id} size={20} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function PayRow({ pay, max = 3 }: { pay: string[]; max?: number }) {
  const list = PAYMENTS.filter((m) => pay.includes(m.id));
  if (!list.length) return null;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <div
      className="srow-pay"
      role="img"
      aria-label={`Accepts ${list.map((m) => m.label).join(', ')}`}
    >
      <span className="pay-lbl" aria-hidden="true">
        Accepts
      </span>
      <span className="pay-icons">
        {shown.map((m) =>
          m.id === 'cash' ? (
            <span key={m.id} className="pay-tile pay-cash" aria-hidden="true">
              <Icon name="cash" size={14} />
              Cash
            </span>
          ) : (
            <PayIcon key={m.id} id={m.id} size={20} />
          ),
        )}
      </span>
      {rest > 0 && <span className="pay-more">+{rest}</span>}
    </div>
  );
}

const initialsOf = (n?: string): string => {
  const w = (n || '').trim().split(/\s+/).filter(Boolean);
  return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() : '';
};

export function Avatar({
  user,
  size = 40,
}: {
  user: UserProfile | null;
  size?: number;
}) {
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => {
    setPhotoBroken(false);
  }, [user?.photoURL]);
  const initials = user ? initialsOf(user.name) : '';
  const sizeClass =
    size <= 20
      ? 'w-5 h-5 text-[10px]'
      : size <= 24
        ? 'w-6 h-6 text-[10px]'
        : 'w-10 h-10 text-sm';
  return (
    <span
      className={`av ${sizeClass}${user ? ' is-in' : ''}`}
      aria-hidden="true"
    >
      {user?.photoURL && !photoBroken ? (
        <img
          src={user.photoURL}
          alt=""
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
          onError={() => setPhotoBroken(true)}
        />
      ) : initials ? (
        initials
      ) : (
        <Icon name="user" size={size <= 24 ? 14 : 18} />
      )}
    </span>
  );
}

export const refreshLabel = (s: Pick<Sale, 'food' | 'drinks'>): string =>
  s.food && s.drinks ? 'Food & drinks' : s.food ? 'Food' : s.drinks ? 'Drinks' : '';

export const refreshIconsHtml = (s: Pick<Sale, 'food' | 'drinks'>): string =>
  (s.food ? FOOD_SVG : '') + (s.drinks ? LEMON_SVG : '');

export function RefreshBadge({ s }: { s: Pick<Sale, 'food' | 'drinks'> }) {
  if (!s.food && !s.drinks) return null;
  const label = refreshLabel(s);
  return (
    <span
      className={`refresh-badge${s.food && s.drinks ? ' is-both' : ''}`}
      title={label}
    >
      <span className="refresh-ic">
        {s.food && <FoodIcon />}
        {s.drinks && <LemonIcon />}
      </span>
      <span className="refresh-txt">{label}</span>
    </span>
  );
}
