import { Fragment } from 'react';
import type { LegalPageId } from './LegalDialog';

export interface LegalLinkItem {
  id: LegalPageId;
  label: string;
}

export const ALL_LEGAL_LINKS: readonly LegalLinkItem[] = [
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'prohibited', label: 'Prohibited Items' },
  { id: 'guidelines', label: 'Safety Guidelines' },
  { id: 'contact', label: 'Contact' },
];

export const COMPACT_LEGAL_LINKS: readonly LegalLinkItem[] = [
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'prohibited', label: 'Prohibited Items' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'contact', label: 'Contact' },
];

export const POLICY_ONLY_LINKS: readonly LegalLinkItem[] = [
  { id: 'prohibited', label: 'Prohibited Items' },
  { id: 'guidelines', label: 'Safety Guidelines' },
  { id: 'contact', label: 'Contact' },
];

export function LegalLinks({
  links = ALL_LEGAL_LINKS,
  onOpenLegal,
  asNav,
  ariaLabel = 'Legal and contact',
}: {
  links?: readonly LegalLinkItem[];
  onOpenLegal: (page: LegalPageId) => void;
  asNav?: boolean;
  ariaLabel?: string;
}) {
  const items = links.map((link, idx) => (
    <Fragment key={link.id}>
      {idx > 0 && <span aria-hidden="true">·</span>}
      <button
        type="button"
        className="foot-link"
        onClick={() => onOpenLegal(link.id)}
      >
        {link.label}
      </button>
    </Fragment>
  ));

  if (asNav) {
    return (
      <nav className="foot-links" aria-label={ariaLabel}>
        {items}
      </nav>
    );
  }

  return <div className="foot-links">{items}</div>;
}
