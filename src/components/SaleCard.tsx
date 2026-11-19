import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SPONSOR_ADS } from '../data/sponsorAds';
import type { Sale, SponsorAd, UserLocation } from '../types/sale';
import {
  dayLabel,
  getDistanceDisplay,
  shareSaleLink,
  shareText,
  shareUrl,
  smsShareUrl,
  timeRange,
} from '../utils/format';
import { EndingSoonBadge } from './EndingSoonBanner';
import {
  Arrow,
  Icon,
  PayRow,
  RefreshBadge,
  Tags,
} from './Icons';
import { DirectionsIconLink, SaveIconButton } from './SaleActions';

const CAN_HOVER =
  typeof window !== 'undefined' &&
  !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

const TINT_CLASSES = [
  'bg-[#d9efe9]',
  'bg-[#e2ecd5]',
  'bg-[#f0e6cf]',
  'bg-[#dde6f0]',
  'bg-[#efe0dc]',
] as const;

export type PhotoSlide =
  | string
  | { sample: true; name: string; tintClass: string };

export const photosOf = (s: Sale): PhotoSlide[] => {
  if (s.photos && s.photos.length) return s.photos;
  const labels =
    s.items && s.items.length
      ? s.items.slice(0, 4)
      : [s.cats[0] || s.title];
  return labels.map((name, i) => ({
    sample: true,
    name,
    tintClass: TINT_CLASSES[(i + s.id.length) % TINT_CLASSES.length],
  }));
};

function useDismiss(open: boolean, setOpen: (v: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        const b = ref.current?.querySelector('button');
        b?.focus();
      }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key, true);
    };
  }, [open, setOpen]);
  return ref;
}

export function Gallery({
  photos,
  title,
  badge,
  topLeftBadge,
  resetKey,
}: {
  photos: PhotoSlide[];
  title: string;
  badge: ReactNode;
  topLeftBadge?: ReactNode;
  resetKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const idxRef = useRef(0);

  useLayoutEffect(() => {
    setI(0);
    setBroken({});
    idxRef.current = 0;
    if (ref.current) ref.current.scrollLeft = 0;
  }, [resetKey]);

  const safeI = Math.min(i, Math.max(0, photos.length - 1));
  idxRef.current = safeI;

  useEffect(() => {
    const e = ref.current;
    if (!e || photos.length <= 1 || typeof ResizeObserver === 'undefined') return;
    let lastW = e.clientWidth;
    const ro = new ResizeObserver(() => {
      const nextW = e.clientWidth;
      if (nextW > 0 && nextW !== lastW) {
        lastW = nextW;
        e.scrollLeft = idxRef.current * nextW;
      }
    });
    ro.observe(e);
    return () => ro.disconnect();
  }, [photos.length]);

  const onScroll = () => {
    const e = ref.current;
    if (e && e.clientWidth) setI(Math.round(e.scrollLeft / e.clientWidth));
  };

  const scrollToIndex = (targetIdx: number) => {
    const e = ref.current;
    if (!e) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, targetIdx));
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    e.scrollTo({
      left: clamped * e.clientWidth,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const go = (d: number) => scrollToIndex(safeI + d);

  return (
    <div className="gal">
      <div
        ref={ref}
        className="gal-track"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (photos.length <= 1) return;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(-1);
          } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToIndex(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            scrollToIndex(photos.length - 1);
          }
        }}
      >
        {photos.map((p, k) => (
          <div
            key={k}
            className="gal-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${photos.length}`}
          >
            {typeof p === 'string' && !broken[k] ? (
              <img
                src={p}
                alt={`${title} photo ${k + 1}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() =>
                  setBroken((prev) => (prev[k] ? prev : { ...prev, [k]: true }))
                }
              />
            ) : (
              <div
                className={`gal-sample ${typeof p === 'string' ? TINT_CLASSES[k % TINT_CLASSES.length] : p.tintClass}`}
              >
                <b>{typeof p === 'string' ? title : p.name}</b>
              </div>
            )}
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="gal-count" aria-hidden="true">
            {safeI + 1}/{photos.length}
          </span>
          <button
            type="button"
            className="gal-nav prev"
            aria-label="Previous photo"
            disabled={safeI === 0}
            onClick={() => go(-1)}
          >
            <Arrow />
          </button>
          <button
            type="button"
            className="gal-nav next"
            aria-label="Next photo"
            disabled={safeI === photos.length - 1}
            onClick={() => go(1)}
          >
            <Arrow />
          </button>
        </>
      )}
      {topLeftBadge}
      {badge}
    </div>
  );
}

export function ShareMenu({
  s,
  onShared,
}: {
  s: Sale;
  onShared?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const ref = useDismiss(open, setOpen);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<'first' | 'last' | null>(null);
  const [note, setNote] = useState('');
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = shareUrl(s);
  const text = shareText(s);
  const smsHref = smsShareUrl(s);

  useEffect(() => {
    setOpen(false);
  }, [s.id]);

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !pendingFocusRef.current) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (items && items.length > 0) {
      const target =
        pendingFocusRef.current === 'last' ? items[items.length - 1] : items[0];
      target.focus();
    }
    pendingFocusRef.current = null;
  }, [open]);

  const flash = (m: string) => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setNote(m);
    noteTimer.current = setTimeout(() => setNote(''), 2500);
  };

  const handleCopyShareLink = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareSaleLink(s);
      setOpen(false);
      if (result.method === 'cancelled') return;
      if (result.message) {
        if (onShared) onShared(result.message);
        else flash(result.message);
      }
    } finally {
      setSharing(false);
    }
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [],
    );
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const enc = encodeURIComponent;
  return (
    <div className="cal" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-label={`Share ${s.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            pendingFocusRef.current = e.key === 'ArrowUp' ? 'last' : 'first';
            setOpen(true);
          }
        }}
      >
        <Icon name="share" size={14} />
        Share
        <span className={`cal-caret${open ? ' is-open' : ''}`} aria-hidden="true">
          <Icon name="chevron" size={12} />
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="cal-list cal-menu share-menu-pop"
          role="menu"
          aria-label="Share options"
          onKeyDown={onMenuKeyDown}
        >
          <button
            role="menuitem"
            type="button"
            className="cal-opt"
            disabled={sharing}
            onClick={() => void handleCopyShareLink()}
          >
            <Icon name="share" size={16} />
            <span className="cal-opt-copy">
              <b>Copy Share Link</b>
              <span>Share or copy listing URL</span>
            </span>
          </button>
          <a
            role="menuitem"
            className="cal-opt"
            href={smsHref}
            onClick={() => {
              setOpen(false);
              onShared?.('Opening Messages…');
            }}
          >
            <Icon name="sms" size={16} />
            <span className="cal-opt-copy">
              <b>Share via SMS</b>
              <span>Text sale details &amp; link</span>
            </span>
          </a>
          <a
            role="menuitem"
            className="cal-opt"
            href={`mailto:?subject=${enc(s.title)}&body=${enc(`${text}${url ? `\n${url}` : ''}`)}`}
            onClick={() => setOpen(false)}
          >
            <Icon name="cat-tag" size={16} />
            <span className="cal-opt-copy">
              <b>Email</b>
              <span>Send via email app</span>
            </span>
          </a>
          <a
            role="menuitem"
            className="cal-opt"
            href={`https://wa.me/?text=${enc(`${text}${url ? ` ${url}` : ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <Icon name="nav" size={16} />
            <span className="cal-opt-copy">
              <b>WhatsApp</b>
              <span>Share in a chat</span>
            </span>
          </a>
        </div>
      )}
      <span className="share-note" role="status" aria-live="polite">
        {note}
      </span>
    </div>
  );
}

export function SaleRow({
  s,
  selected,
  onToggle,
  onHover,
  onHold,
  saved,
  onSave,
  userLoc,
}: {
  s: Sale;
  selected?: boolean;
  onToggle: (id: string) => void;
  onHover?: (id: string | null) => void;
  onHold?: (id: string) => void;
  saved: boolean;
  onSave: (id: string) => void;
  userLoc?: UserLocation | null;
}) {
  const chips = s.items && s.items.length ? s.items : s.cats;
  const photos = photosOf(s);
  const badge = <RefreshBadge s={s} />;
  const dist = getDistanceDisplay(userLoc, s);

  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdOrigin = useRef<{ x: number; y: number } | null>(null);
  const holdFired = useRef(false);

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    holdOrigin.current = null;
    setHolding(false);
  };

  useEffect(() => cancelHold, []);

  return (
    <article
      id={`sale-${s.id}`}
      className={`srow${selected ? ' is-selected' : ''}${holding ? ' is-holding' : ''}${photos.length ? ' has-photo' : ''}`}
      onMouseEnter={() => CAN_HOVER && onHover?.(s.id)}
      onMouseLeave={() => {
        if (CAN_HOVER) onHover?.(null);
        cancelHold();
      }}
      onPointerDown={(e) => {
        if (!onHold || !e.isPrimary) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('.srow-top-actions, .save, .dir, .gal-nav')) return;
        cancelHold();
        holdFired.current = false;
        holdOrigin.current = { x: e.clientX, y: e.clientY };
        setHolding(true);
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          holdOrigin.current = null;
          holdFired.current = true;
          setHolding(false);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
          }
          onHold(s.id);
        }, 480);
      }}
      onPointerMove={(e) => {
        if (!holdOrigin.current) return;
        if (
          Math.hypot(
            e.clientX - holdOrigin.current.x,
            e.clientY - holdOrigin.current.y,
          ) > 8
        ) {
          cancelHold();
        }
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => {
        if (holdFired.current || holding) e.preventDefault();
      }}
      onClickCapture={(e) => {
        if (holdFired.current) {
          e.preventDefault();
          e.stopPropagation();
          holdFired.current = false;
        }
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, label, .gal-nav')) return;
        const sel = window.getSelection?.()?.toString();
        if (sel) return;
        onToggle(s.id);
      }}
    >
      <Gallery
        photos={photos}
        title={s.title}
        badge={badge}
        topLeftBadge={<EndingSoonBadge s={s} />}
      />

      <button
        type="button"
        className="srow-main"
        aria-expanded={!!selected}
        onClick={() => onToggle(s.id)}
      >
        <span className="srow-title">{s.title}</span>
        <span className="srow-meta">
          <b>{`${dayLabel(s.date)} ${timeRange(s)}`}</b>
        </span>
        <span className="srow-meta srow-loc">
          <span className="srow-addr">{s.address.split(',')[0]}</span>
          {dist && (
            <>
              <span className="srow-sep" aria-hidden="true">
                ·
              </span>
              <span
                className="srow-dist"
                aria-label={dist.ariaLabel}
                title={dist.title}
              >
                {dist.approximate && (
                  <span className="srow-dist-tilde" aria-hidden="true">
                    ~
                  </span>
                )}
                {dist.text}
              </span>
            </>
          )}
        </span>
      </button>

      <div className="srow-top-actions">
        <SaveIconButton
          saleId={s.id}
          title={s.title}
          saved={saved}
          onSave={onSave}
        />
        <DirectionsIconLink sale={s} extraClassName="dir" />
      </div>

      <div className="srow-tags">
        <Tags cats={chips} responsive maxRows={1} />
      </div>
      {s.pay && s.pay.length > 0 ? (
        <PayRow pay={s.pay} />
      ) : (
        <div className="srow-pay is-empty" aria-hidden="true" />
      )}
    </article>
  );
}

export function SkeletonRow() {
  return (
    <li className="sk-row" aria-hidden="true">
      <div className="skeleton h-4 w-[70%]" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-5 w-24 rounded-full" />
    </li>
  );
}


export function AdSlot({
  banner,
  index = 2,
  onOpen,
}: {
  banner?: boolean;
  index?: number;
  onOpen?: (ad: SponsorAd) => void;
}) {
  const ad = SPONSOR_ADS[index % SPONSOR_ADS.length];
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setImgErr(false);
  }, [ad.image]);
  return (
    <div className="ad" role="group" aria-label="Sponsored listing">
      <button
        type="button"
        className={`ad-banner${banner ? ' is-banner' : ''}`}
        aria-label={`Sponsored: ${ad.sponsor}, ${ad.title}`}
        onClick={() => onOpen?.(ad)}
      >
        {!imgErr && (
          <img
            src={ad.image}
            alt={ad.sponsor}
            className="ad-bg"
            loading="lazy"
            decoding="async"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        )}
        <span className="ad-banner-scrim">
          <span className="ad-banner-body">
            <span className="ad-banner-kicker">{`Sponsored · ${ad.sponsor}`}</span>
            <b className="ad-banner-title">{ad.title}</b>
            <span className="ad-banner-sub">{ad.subtitle}</span>
          </span>
          <span className="ad-overlay-cta ad-banner-cta">
            {ad.cta}
            <Icon name="chevron" size={12} />
          </span>
        </span>
      </button>
    </div>
  );
}

export function AdCard({
  index = 0,
  onOpen,
}: {
  index?: number;
  onOpen?: (ad: SponsorAd) => void;
}) {
  const ad = SPONSOR_ADS[index % SPONSOR_ADS.length];
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setImgErr(false);
  }, [ad.image]);
  return (
    <button
      type="button"
      className="ad-card"
      aria-label={`Sponsored: ${ad.sponsor}, ${ad.title}`}
      onClick={() => onOpen?.(ad)}
    >
      {!imgErr && (
        <img
          src={ad.image}
          alt={ad.sponsor}
          className="ad-bg"
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
        />
      )}
      <div className="ad-scrim">
        <div className="ad-scrim-top">
          <span className="ad-flag-pill">Sponsored</span>
        </div>
        <div className="ad-scrim-bot">
          <span className="ad-overlay-sponsor">{ad.sponsor}</span>
          <span className="ad-overlay-title">{ad.title}</span>
          <span className="ad-overlay-sub">{ad.subtitle}</span>
          <div className="ad-overlay-foot">
            <span className="ad-overlay-meta">{ad.meta}</span>
            <span className="ad-overlay-cta">
              {ad.cta}
              <Icon name="chevron" size={12} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

