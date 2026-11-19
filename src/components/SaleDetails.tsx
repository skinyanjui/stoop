import { useEffect } from 'react';
import { PAYMENTS } from '../data/seedSales';
import type { Sale, UserLocation } from '../types/sale';
import { fmtDate, getDistanceDisplay, timeRange } from '../utils/format';
import { AddToCalendarMenu } from './AddToCalendarMenu';
import { EndingSoonBadge, EndingSoonBanner } from './EndingSoonBanner';
import { Icon, PayIcon, RefreshBadge, Tags } from './Icons';
import { DirectionsIconLink, SaveIconButton } from './SaleActions';
import { Gallery, photosOf, ShareMenu } from './SaleCard';
import { SaleWeather } from './SaleWeather';

export function SaleDetails({
  s,
  saved,
  onSave,
  onClose,
  onReport,
  onToast,
  userLoc,
}: {
  s: Sale;
  saved: boolean;
  onSave: (id: string) => void;
  onClose: () => void;
  onReport?: (s: Sale) => void;
  onToast?: (msg: string) => void;
  userLoc?: UserLocation | null;
}) {
  const chips = s.items && s.items.length ? s.items : s.cats;
  const photos = photosOf(s);
  const dist = getDistanceDisplay(userLoc, s);
  const accepted = PAYMENTS.filter((m) => (s.pay || []).includes(m.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.scrim')) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="details-layer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="details-card"
        aria-label={`Details for ${s.title}`}
      >
        <div className="details-media">
          <Gallery
            resetKey={s.id}
            photos={photos}
            title={s.title}
            badge={<RefreshBadge s={s} />}
            topLeftBadge={<EndingSoonBadge s={s} />}
          />
        </div>
        <div className="details-top-actions">
          <SaveIconButton
            saleId={s.id}
            title={s.title}
            saved={saved}
            onSave={onSave}
            extraClassName="details-pill-btn"
          />
          <DirectionsIconLink
            sale={s}
            extraClassName="details-pill-btn"
          />
          {onReport && (
            <button
              type="button"
              className="icon-btn details-pill-btn"
              aria-label={`Report ${s.title}`}
              title="Report listing"
              onClick={() => onReport(s)}
            >
              <Icon name="flag" />
            </button>
          )}
          <button
            type="button"
            className="icon-btn details-pill-btn"
            aria-label="Close details"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="details-body">
          <h2 className="details-title">{s.title}</h2>

          <div className="details-meta-box">
            <div className="details-meta-line">
              <b>{`${fmtDate(s.date)} · ${timeRange(s)}`}</b>
              {dist && (
                <span
                  className="details-dist"
                  aria-label={dist.ariaLabel}
                  title={dist.title}
                >
                  {` · ${dist.display} away`}
                </span>
              )}
              <span>{` · ${s.saleType || 'Garage Sale'}`}</span>
            </div>
            <div className="details-meta-line details-addr" title={s.address}>
              {s.address}
            </div>
          </div>

          <EndingSoonBanner s={s} />

          <SaleWeather lat={s.lat} lng={s.lng} date={s.date} />

          <div className="details-desc">
            {s.desc ? (
              <p>{s.desc}</p>
            ) : (
              <p className="details-empty">No extra description from the seller.</p>
            )}
          </div>

          <div className="details-tags">
            <Tags cats={chips} responsive maxRows={1} expandable />
          </div>

          <div className="details-pay">
            <span className="pay-lbl">Accepts</span>
            {accepted.length > 0 ? (
              accepted.map((m) => (
                <span key={m.id} className="pay-item">
                  <PayIcon id={m.id} size={18} />
                  {m.label}
                </span>
              ))
            ) : (
              <span className="details-empty">Not specified</span>
            )}
          </div>
        </div>

        <div className="details-foot">
          <AddToCalendarMenu
            s={s}
            onAdded={(msg) => onToast?.(msg)}
          />
          <ShareMenu
            s={s}
            onShared={(msg) => onToast?.(msg)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm details-save-btn"
            aria-pressed={saved}
            onClick={() => onSave(s.id)}
          >
            <Icon name="heart" size={14} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  );
}
