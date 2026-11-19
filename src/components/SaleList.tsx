import type { Sale, SponsorAd, UserLocation, ViewReq } from '../types/sale';
import { buildSaleFeed } from '../utils/feed';
import { AdCard, SaleRow, SkeletonRow } from './SaleCard';

export function SaleList({
  loading,
  visible,
  matches,
  hasFilters,
  selectedId,
  saved,
  userLoc,
  onToggleCard,
  onHover,
  onHold,
  onSave,
  onOpenAd,
  onClearAll,
  onShowMatchesOnMap,
  onOpenAdd,
  areaName,
  onResetArea,
}: {
  loading: boolean;
  visible: Sale[];
  matches: Sale[];
  hasFilters: boolean;
  selectedId: string | null;
  saved: string[];
  userLoc: UserLocation | null;
  onToggleCard: (id: string) => void;
  onHover: (id: string | null) => void;
  onHold: (id: string) => void;
  onSave: (id: string) => void;
  onOpenAd: (ad: SponsorAd) => void;
  onClearAll: () => void;
  onShowMatchesOnMap: (req: Omit<ViewReq, 'n'>) => void;
  onOpenAdd: () => void;
  areaName?: string | null;
  onResetArea?: () => void;
}) {
  if (loading) {
    return (
      <ul className="rows" aria-busy="true" aria-label="Loading sales">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </ul>
    );
  }

  if (!visible.length) {
    if (hasFilters && matches.length) {
      const lats = matches.map((x) => x.lat);
      const lngs = matches.map((x) => x.lng);
      const showAll = () =>
        onShowMatchesOnMap({
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
          lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          bbox: [
            Math.min(...lats) - 0.05,
            Math.max(...lats) + 0.05,
            Math.min(...lngs) - 0.05,
            Math.max(...lngs) + 0.05,
          ],
        });
      return (
        <div className="empty">
          <h3>Nothing matches here yet</h3>
          <p>
            {`${matches.length} ${matches.length === 1 ? 'sale matches' : 'sales match'} your filters in other areas.`}
          </p>
          <button type="button" className="btn btn-primary" onClick={showAll}>
            {`Show ${matches.length === 1 ? 'it' : 'them'} on the map`}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearAll}
          >
            Clear filters
          </button>
        </div>
      );
    }
    return (
      <div className="empty">
        <h3>{areaName ? `No sales in ${areaName} yet` : 'No sales here yet'}</h3>
        <p>Try zooming out, or be the first to post one!</p>
        <button type="button" className="btn btn-primary" onClick={onOpenAdd}>
          Add a sale
        </button>
        {areaName && onResetArea && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetArea}
          >
            Browse sample sales
          </button>
        )}
      </div>
    );
  }

  const feed = buildSaleFeed(visible);

  return (
    <ul className="rows">
      {feed.map((item) => {
        if (item.kind === 'ad') {
          return (
            <li
              key={item.isTail ? 'ad-tail' : `adc-${item.adIndex}`}
              className={`ad-cell${item.isTail ? ' is-tail' : ''}`}
            >
              <AdCard index={item.adIndex} onOpen={onOpenAd} />
            </li>
          );
        }
        const s = item.sale;
        return (
          <li key={s.id}>
            <SaleRow
              s={s}
              selected={s.id === selectedId}
              onToggle={onToggleCard}
              onHover={onHover}
              onHold={onHold}
              saved={saved.includes(s.id)}
              onSave={onSave}
              userLoc={userLoc}
            />
          </li>
        );
      })}
    </ul>
  );
}
