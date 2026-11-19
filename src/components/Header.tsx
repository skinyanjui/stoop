import type { UserProfile } from '../types/sale';
import { Combobox, type ComboOption } from './Combobox';
import { Avatar, GarageIcon, Icon } from './Icons';

export function Header({
  place,
  onPlaceChange,
  options,
  onPickOption,
  onSubmitSearch,
  onClearRecent,
  onLocateMe,
  searching,
  locating,
  located,
  user,
  onOpenAdd,
  onOpenProfile,
  onGoHome,
}: {
  place: string;
  onPlaceChange: (next: string) => void;
  options: ComboOption[];
  onPickOption: (opt: ComboOption) => void;
  onSubmitSearch: () => void;
  onClearRecent: () => void;
  onLocateMe: () => void;
  searching: boolean;
  locating?: boolean;
  located?: boolean;
  user: UserProfile | null;
  onOpenAdd: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
}) {
  return (
    <header className="header">
      <h1 className="brand">
        <a
          href="/"
          className="brand-link"
          aria-label="Stoop — go to home"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              return;
            }
            e.preventDefault();
            onGoHome();
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <GarageIcon />
          </span>
          <span className="brand-name">Stoop</span>
          <span className="brand-sub">sales near you</span>
        </a>
      </h1>
      <form
        className="search"
        role="search"
        aria-busy={searching || undefined}
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector('input');
          if (input instanceof HTMLElement) input.blur();
          onSubmitSearch();
        }}
      >
        <Combobox
          id="q"
          label="Search an item, city, ZIP code or address"
          value={place}
          onChange={onPlaceChange}
          options={options}
          onPick={onPickOption}
          onSubmit={onSubmitSearch}
          clearable
          groupActions={{
            'Recent Searches': {
              label: 'Clear',
              onClick: onClearRecent,
            },
          }}
          placeholder="Search an item, city or ZIP"
          enterKeyHint="search"
          leading={
            <button
              type="submit"
              className="combo-lead-btn"
              aria-label={searching ? 'Searching' : 'Search'}
              disabled={searching}
            >
              {searching ? (
                <span className="search-spin" aria-hidden="true" />
              ) : (
                <Icon name="search" />
              )}
            </button>
          }
          trailing={
            <>
              <span className="combo-divider" aria-hidden="true" />
              <button
                type="button"
                className={`locate${locating ? ' is-locating' : ''}${located && !locating ? ' is-located' : ''}`}
                aria-label={
                  locating
                    ? 'Finding your location'
                    : located
                      ? 'Showing sales near your location — click to refresh'
                      : 'Use my location'
                }
                title={
                  locating
                    ? 'Finding your location…'
                    : located
                      ? 'Near your location — click to re-center'
                      : 'Use my location'
                }
                disabled={locating}
                onClick={onLocateMe}
              >
                {locating ? (
                  <span className="search-spin" aria-hidden="true" />
                ) : (
                  <Icon name="locate" size={15} />
                )}
                <span className="locate-lbl">
                  {locating ? 'Locating…' : 'Near me'}
                </span>
              </button>
            </>
          }
        />
      </form>
      <div className="header-actions">
        <button
          type="button"
          className="btn btn-primary header-add"
          onClick={onOpenAdd}
        >
          <Icon name="plus" />
          Add sale
        </button>
        <button
          type="button"
          className="avatar-btn"
          aria-label={user ? `Profile, ${user.name}` : 'Sign in'}
          title={user ? user.name : 'Sign in'}
          onClick={onOpenProfile}
        >
          <Avatar user={user} />
        </button>
      </div>
    </header>
  );
}
