import type { Sale } from '../types/sale';
import { directionsUrl } from '../utils/geocode';
import { Icon } from './Icons';
import type { LegalPageId } from './LegalDialog';

export function SaveIconButton({
  saleId,
  title,
  saved,
  onSave,
  extraClassName,
}: {
  saleId: string;
  title: string;
  saved: boolean;
  onSave: (id: string) => void;
  extraClassName?: string;
}) {
  const cls = [
    'icon-btn',
    extraClassName,
    'save',
    saved ? 'is-saved' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      aria-pressed={saved}
      aria-label={`${saved ? 'Remove ' : 'Save '}${title}${saved ? ' from saved' : ''}`}
      onClick={() => onSave(saleId)}
    >
      <Icon name="heart" />
    </button>
  );
}

export function DirectionsIconLink({
  sale,
  extraClassName,
}: {
  sale: Pick<Sale, 'title' | 'address' | 'lat' | 'lng'>;
  extraClassName?: string;
}) {
  const cls = ['icon-btn', extraClassName].filter(Boolean).join(' ');
  return (
    <a
      className={cls}
      href={directionsUrl(sale)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Directions to ${sale.title}`}
    >
      <Icon name="nav" />
    </a>
  );
}

export function TermsConsentField({
  id,
  checked,
  onChange,
  error,
  errorId,
  verb = 'agree to',
  onOpenLegal,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: string;
  errorId?: string;
  verb?: 'accept' | 'agree to';
  onOpenLegal: (page: LegalPageId) => void;
}) {
  return (
    <div className="field">
      <div className="terms-check">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error && errorId ? errorId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <label htmlFor={id}>{`I ${verb} the `}</label>
          <button
            type="button"
            className="link"
            onClick={() => onOpenLegal('terms')}
          >
            Terms &amp; Conditions
          </button>
          <label htmlFor={id}>{' and '}</label>
          <button
            type="button"
            className="link"
            onClick={() => onOpenLegal('privacy')}
          >
            Privacy Policy
          </button>
          <label htmlFor={id}>.</label>
        </span>
      </div>
      {error && (
        <div className="error" id={errorId}>
          {error}
        </div>
      )}
    </div>
  );
}
