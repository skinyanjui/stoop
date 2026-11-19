import { useEffect, useRef, useState } from 'react';
import type { Sale, UserProfile } from '../types/sale';
import { Avatar, Icon, PayPicker } from './Icons';
import type { LegalPageId } from './LegalDialog';
import { COMPACT_LEGAL_LINKS, LegalLinks, POLICY_ONLY_LINKS } from './LegalLinks';
import { ModalDialog } from './ModalDialog';
import { MyListings } from './MyListings';
import { TermsConsentField } from './SaleActions';

export function ProfileDialog({
  onClose,
  user,
  signingIn,
  onSignIn,
  onUpdateName,
  onPayments,
  onSignOut,
  mine,
  onEdit,
  onDelete,
  onReorder,
  onView,
  onAdd,
  termsAccepted,
  onAcceptTerms,
  onOpenLegal,
}: {
  onClose: () => void;
  user: UserProfile | null;
  signingIn: boolean;
  onSignIn: () => void;
  onUpdateName: (name: string) => void;
  onPayments: (payments: string[]) => void;
  onSignOut: () => void;
  mine: Sale[];
  onEdit: (s: Sale) => void;
  onDelete: (s: Sale) => void;
  onReorder: (orderedIds: string[]) => void;
  onView: (id: string) => void;
  onAdd: () => void;
  termsAccepted: boolean;
  onAcceptTerms: () => void;
  onOpenLegal: (page: LegalPageId) => void;
}) {
  const termsInputAnchorRef = useRef<HTMLDivElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(user?.name || '');
  const [accepted, setAccepted] = useState(termsAccepted);
  const [termsErr, setTermsErr] = useState(false);

  useEffect(() => {
    if (termsAccepted) {
      setAccepted(true);
      setTermsErr(false);
    }
  }, [termsAccepted]);

  useEffect(() => {
    setDraftName(user?.name || '');
  }, [user?.name]);

  const saveName = () => {
    const clean = draftName.trim();
    if (clean && clean !== user?.name) onUpdateName(clean);
    setEditingName(false);
  };

  return (
    <ModalDialog
      labelledBy="profile-title"
      onClose={onClose}
      suppressEscapeSelector=".legal-scrim"
      autoFocusSelector="input, .dialog-foot .btn-primary, .dialog-head button"
      autoFocusKey={user ? 'in' : 'out'}
    >
      <div className="dialog-head">
        <h2 id="profile-title">{user ? 'Your profile' : 'Welcome to Stoop'}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>

      {!user ? (
        <>
          <div className="dialog-body" ref={termsInputAnchorRef}>
            <p className="lede">
              Sign in with Google to publish sales to the live neighborhood map,
              sync your saved favorites, and edit or remove your listings anytime.
            </p>
            {mine.length > 0 && (
              <p className="hint">
                Your {mine.length} {mine.length === 1 ? 'draft sale' : 'draft sales'}{' '}
                from this visit can be viewed below after signing in.
              </p>
            )}
            <TermsConsentField
              id="p-terms"
              verb="accept"
              checked={accepted}
              onChange={(checked) => {
                setAccepted(checked);
                if (checked) setTermsErr(false);
              }}
              error={termsErr ? 'Please accept the Terms & Conditions to continue.' : undefined}
              onOpenLegal={onOpenLegal}
            />

            <div className="field">
              <span className="label">Policies &amp; Support</span>
              <LegalLinks links={POLICY_ONLY_LINKS} onOpenLegal={onOpenLegal} />
            </div>
          </div>
          <div className="dialog-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={signingIn}
              onClick={() => {
                if (!accepted) {
                  setTermsErr(true);
                  termsInputAnchorRef.current?.querySelector<HTMLInputElement>('#p-terms')?.focus();
                  return;
                }
                if (!termsAccepted) onAcceptTerms();
                onSignIn();
              }}
            >
              {signingIn ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="dialog-body">
            <div className="who">
              <Avatar user={user} />
              <div className="who-t">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="input h-8 text-sm"
                      value={draftName}
                      maxLength={80}
                      aria-label="Display name"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveName();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraftName(user.name);
                          setEditingName(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={saveName}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <b>{user.name}</b>
                    <button
                      type="button"
                      className="link text-xs"
                      onClick={() => setEditingName(true)}
                    >
                      Edit name
                    </button>
                  </div>
                )}
                <span>{user.email}</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onSignOut}
              >
                Sign out
              </button>
            </div>

            <div className="field">
              <span className="label" id="my-pay-label">
                Payments you accept
              </span>
              <PayPicker
                value={user.payments || []}
                onChange={onPayments}
                labelId="my-pay-label"
              />
              <div className="hint">We’ll pre-fill these on new sales.</div>
            </div>

            <MyListings
              mine={mine}
              onEdit={onEdit}
              onDelete={onDelete}
              onReorder={onReorder}
              onView={onView}
              onAdd={onAdd}
            />

            <div className="field">
              <span className="label">Legal &amp; Support</span>
              <LegalLinks links={COMPACT_LEGAL_LINKS} onOpenLegal={onOpenLegal} />
            </div>
          </div>
          <div className="dialog-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Done
            </button>
            {mine.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={onAdd}>
                <Icon name="plus" />
                Add sale
              </button>
            )}
          </div>
        </>
      )}
    </ModalDialog>
  );
}
