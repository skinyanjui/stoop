import type { UserProfile } from '../types/sale';
import { Avatar, Icon } from './Icons';

export function BottomBar({
  view,
  onChangeView,
  onOpenAdd,
  onOpenProfile,
  user,
}: {
  view: 'list' | 'map';
  onChangeView: (next: 'list' | 'map') => void;
  onOpenAdd: () => void;
  onOpenProfile: () => void;
  user: UserProfile | null;
}) {
  return (
    <nav className="bottom-bar" aria-label="View and actions">
      <div className="segmented" role="group" aria-label="View">
        <button
          type="button"
          aria-pressed={view === 'list'}
          onClick={() => onChangeView('list')}
        >
          <Icon name="list" />
          List
        </button>
        <button
          type="button"
          aria-pressed={view === 'map'}
          onClick={() => onChangeView('map')}
        >
          <Icon name="map" />
          Map
        </button>
      </div>
      <button type="button" className="btn btn-primary" onClick={onOpenAdd}>
        <Icon name="plus" />
        Add
      </button>
      <button
        type="button"
        aria-label={user ? `Profile, ${user.name}` : 'Profile'}
        onClick={onOpenProfile}
      >
        <Avatar user={user} size={20} />
        Profile
      </button>
    </nav>
  );
}
