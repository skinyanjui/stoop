import { useEffect, useRef } from 'react';
import { Icon } from './Icons';
import { LegalContactForm } from './LegalContactForm';
import {
  GuidelinesSection,
  PrivacySection,
  ProhibitedSection,
  TermsSection,
} from './LegalSections';
import { ModalDialog } from './ModalDialog';

export type LegalPageId = 'terms' | 'privacy' | 'prohibited' | 'guidelines' | 'contact';

const TABS: ReadonlyArray<{ id: LegalPageId; label: string }> = [
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'prohibited', label: 'Prohibited' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'contact', label: 'Contact' },
];

const TITLES: Record<LegalPageId, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  prohibited: 'Prohibited Items Policy',
  guidelines: 'Safety & Community Guidelines',
  contact: 'Contact & Legal Inquiries',
};

export function LegalDialog({
  page,
  onChangePage,
  onClose,
  termsAccepted,
  onAcceptTerms,
  contactSeed,
}: {
  page: LegalPageId;
  onChangePage: (p: LegalPageId) => void;
  onClose: () => void;
  termsAccepted: boolean;
  onAcceptTerms: () => void;
  contactSeed?: { topic?: string; message?: string } | null;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [page]);

  return (
    <ModalDialog
      scrimClassName="legal-scrim"
      dialogClassName="dialog legal-dialog"
      labelledBy="legal-title"
      onClose={onClose}
      autoFocusSelector=".dialog-head button"
    >
      <div className="dialog-head">
        <h2 id="legal-title">{TITLES[page]}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>

      <nav className="legal-tabs" aria-label="Legal and contact pages">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`legal-tab${page === t.id ? ' is-active' : ''}`}
            aria-current={page === t.id ? 'page' : undefined}
            onClick={() => onChangePage(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="dialog-body legal-body" ref={bodyRef}>
        {page === 'terms' && <TermsSection onChangePage={onChangePage} />}
        {page === 'privacy' && <PrivacySection onChangePage={onChangePage} />}
        {page === 'prohibited' && <ProhibitedSection />}
        {page === 'guidelines' && <GuidelinesSection onChangePage={onChangePage} />}
        {page === 'contact' && <LegalContactForm contactSeed={contactSeed} />}
      </div>

      <div className="dialog-foot">
        {page === 'terms' && !termsAccepted && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onAcceptTerms();
              onClose();
            }}
          >
            Accept Terms &amp; Conditions
          </button>
        )}
        <button
          type="button"
          className={page === 'terms' && !termsAccepted ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </ModalDialog>
  );
}
