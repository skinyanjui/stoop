import { useEffect, useRef, useState } from 'react';
import type { SponsorAd } from '../types/sale';
import { copyText } from '../utils/format';
import { Icon } from './Icons';
import { ModalDialog } from './ModalDialog';

export function AdDialog({
  ad,
  onClose,
  onAddSale,
  onAdvertise,
}: {
  ad: SponsorAd;
  onClose: () => void;
  onAddSale?: () => void;
  onAdvertise?: () => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [imgErr, setImgErr] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImgErr(false);
    setCopyState('idle');
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [ad.id, ad.image]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copyCode = async () => {
    const ok = await copyText(ad.code);
    setCopyState(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState('idle'), 2200);
  };

  return (
    <ModalDialog
      dialogClassName="dialog ad-dialog"
      labelledBy="ad-dialog-title"
      onClose={onClose}
      autoFocusSelector=".dialog-head button"
    >
      <div className="dialog-head">
        <h2 id="ad-dialog-title">{ad.sponsor}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="dialog-body">
        <div className="ad-modal-media">
          {!imgErr && (
            <img
              src={ad.image}
              alt={ad.sponsor}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
            />
          )}
          <span className="ad-flag">Sponsored</span>
        </div>

        <div className="ad-modal-copy">
          <div className="ad-modal-meta">{ad.meta}</div>
          <h3>{ad.title}</h3>
          <p>{ad.details}</p>
        </div>

        <div className="ad-promo-box">
          <div>
            <span className="ad-promo-lbl">Neighborhood code</span>
            <strong className="ad-promo-code">{ad.code}</strong>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={copyCode}
            aria-live="polite"
          >
            {copyState === 'copied'
              ? 'Copied!'
              : copyState === 'failed'
                ? 'Copy failed'
                : 'Copy code'}
          </button>
        </div>

        <p className="hint m-0">
          Offer provided directly by {ad.sponsor}.{' '}
          {onAdvertise && (
            <button
              type="button"
              className="link"
              onClick={onAdvertise}
            >
              Advertise on Stoop
            </button>
          )}
        </p>
      </div>

      <div className="dialog-foot">
        {onAddSale && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAddSale}
          >
            List a sale
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </ModalDialog>
  );
}
