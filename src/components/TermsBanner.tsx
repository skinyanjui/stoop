import type { LegalPageId } from './LegalDialog';

export function TermsBanner({
  onOpenLegal,
  onAccept,
}: {
  onOpenLegal: (page: LegalPageId) => void;
  onAccept: () => void;
}) {
  return (
    <aside className="terms-banner" aria-label="Terms and privacy notice">
      <p>
        By using Stoop, you agree to our{' '}
        <button
          type="button"
          className="link"
          onClick={() => onOpenLegal('terms')}
        >
          Terms &amp; Conditions
        </button>{' '}
        and{' '}
        <button
          type="button"
          className="link"
          onClick={() => onOpenLegal('privacy')}
        >
          Privacy Policy
        </button>
        .
      </p>
      <div className="terms-banner-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenLegal('terms')}
        >
          Review
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAccept}
        >
          Accept
        </button>
      </div>
    </aside>
  );
}
