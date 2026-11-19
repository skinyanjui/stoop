import { useEffect, useState } from 'react';
import type { Sale } from '../types/sale';
import { downloadIcs, googleCalUrl } from '../utils/calendar';
import { dayLabel, shareSaleLink, smsShareUrl, timeRange } from '../utils/format';
import { directionsUrl, reverseGeocode } from '../utils/geocode';
import { Icon } from './Icons';
import { ModalDialog } from './ModalDialog';

export type HoldActionTarget =
  | { kind: 'sale'; sale: Sale }
  | { kind: 'spot'; lat: number; lng: number };

export function QuickActionsSheet({
  target,
  saved,
  onClose,
  onSave,
  onShowOnMap,
  onViewDetails,
  onPostAtSpot,
  onReport,
  onToast,
}: {
  target: HoldActionTarget;
  saved: boolean;
  onClose: () => void;
  onSave: (id: string) => void;
  onShowOnMap: (id: string) => void;
  onViewDetails: (id: string) => void;
  onPostAtSpot: (ll: { lat: number; lng: number }) => void;
  onReport?: (sale: Sale) => void;
  onToast: (msg: string) => void;
}) {
  const [spotLabel, setSpotLabel] = useState<string | null>(null);

  useEffect(() => {
    if (target.kind !== 'spot') {
      setSpotLabel(null);
      return;
    }
    const ctrl = new AbortController();
    setSpotLabel(null);
    void reverseGeocode(target.lat, target.lng, { signal: ctrl.signal })
      .then((rev) => {
        if (ctrl.signal.aborted || !rev) return;
        const text = [rev.street, rev.city, rev.state].filter(Boolean).join(', ');
        if (text) setSpotLabel(text);
      })
      .catch(() => {});
    return () => {
      ctrl.abort();
    };
  }, [target]);

  const handleShare = async (s: Sale) => {
    const result = await shareSaleLink(s);
    onClose();
    if (result.method !== 'cancelled' && result.message) {
      onToast(result.message);
    }
  };

  return (
    <ModalDialog
      scrimClassName="sheet-scrim"
      dialogClassName="action-sheet"
      labelledBy="sheet-title"
      onClose={onClose}
      autoFocusSelector=".sheet-item, .icon-btn"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-head">
        <div className="sheet-head-copy">
          <h2 id="sheet-title">
            {target.kind === 'sale'
              ? target.sale.title
              : spotLabel || 'Dropped map pin'}
          </h2>
          <p>
            {target.kind === 'sale'
              ? `${dayLabel(target.sale.date)} ${timeRange(target.sale)} · ${target.sale.address.split(',')[0]}`
              : `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}`}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close actions"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>

      {target.kind === 'sale' ? (
        <div className="sheet-list">
          <button
            type="button"
            className="sheet-item"
            onClick={() => {
              onSave(target.sale.id);
              onClose();
              onToast(saved ? 'Removed from saved' : 'Saved to your list');
            }}
          >
            <Icon name="heart" />
            <span>{saved ? 'Remove from saved' : 'Save listing'}</span>
          </button>

          <button
            type="button"
            className="sheet-item"
            onClick={() => {
              onShowOnMap(target.sale.id);
              onClose();
            }}
          >
            <Icon name="map" />
            <span>Show on map</span>
          </button>

          <a
            className="sheet-item"
            href={directionsUrl(target.sale)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <Icon name="nav" />
            <span>Get directions</span>
          </a>

          <a
            className="sheet-item"
            href={googleCalUrl(target.sale)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              onClose();
              onToast('Opening Google Calendar…');
            }}
          >
            <Icon name="cal" />
            <span>Add to Google Calendar</span>
          </a>

          <button
            type="button"
            className="sheet-item"
            onClick={() => {
              downloadIcs(target.sale);
              onClose();
              onToast('Apple Calendar event (.ics) downloaded');
            }}
          >
            <Icon name="cal" />
            <span>Add to Apple Calendar (.ics)</span>
          </button>

          <button
            type="button"
            className="sheet-item"
            onClick={() => void handleShare(target.sale)}
          >
            <Icon name="share" />
            <span>Share sale</span>
          </button>

          <a
            className="sheet-item"
            href={smsShareUrl(target.sale)}
            onClick={() => {
              onClose();
              onToast('Opening Messages…');
            }}
          >
            <Icon name="sms" />
            <span>Share via SMS</span>
          </a>

          <button
            type="button"
            className="sheet-item"
            onClick={() => {
              onViewDetails(target.sale.id);
              onClose();
            }}
          >
            <Icon name="list" />
            <span>View full details</span>
          </button>

          {onReport && (
            <button
              type="button"
              className="sheet-item"
              onClick={() => {
                const s = target.sale;
                onClose();
                onReport(s);
              }}
            >
              <Icon name="flag" />
              <span>Report listing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="sheet-list">
          <button
            type="button"
            className="sheet-item is-primary"
            onClick={() => {
              onClose();
              onPostAtSpot({ lat: target.lat, lng: target.lng });
            }}
          >
            <Icon name="plus" />
            <span>Post a sale at this location</span>
          </button>
          <button
            type="button"
            className="sheet-item"
            onClick={onClose}
          >
            <Icon name="x" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </ModalDialog>
  );
}
