import type { LegalPageId } from './LegalDialog';
import { LegalLinks } from './LegalLinks';

export function ListFooter({
  signedIn,
  onOpenLegal,
}: {
  signedIn: boolean;
  onOpenLegal: (page: LegalPageId) => void;
}) {
  return (
    <footer className="list-foot">
      <p className="list-foot-note">
        {signedIn
          ? 'Sample neighborhood listings. Sales you post are saved and shared with everyone here.'
          : 'Sample neighborhood listings. Sign in with Google to share your own sales with everyone.'}
      </p>
      <LegalLinks asNav onOpenLegal={onOpenLegal} />
      <div className="foot-copy">
        © {new Date().getFullYear()} Stoop · Local neighborhood sales
      </div>
    </footer>
  );
}
