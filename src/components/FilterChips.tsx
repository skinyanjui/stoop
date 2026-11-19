import { payOf, SALE_TYPES } from '../data/seedSales';
import type { SaleType, SortMode } from '../types/sale';
import { catIcon, Chip, Icon } from './Icons';

export function FilterChips({
  floating,
  bar,
  savedCount,
  onlySaved,
  onToggleOnlySaved,
  payF,
  onRemovePay,
  items,
  onRemoveItem,
  when,
  onToggleWhen,
  canSortNearest,
  sortBy,
  onToggleNearest,
  onOpenPaySheet,
  saleType,
  onToggleSaleType,
  filterCats,
  activeCats,
  onToggleCat,
  hasFilters,
  onClearAll,
}: {
  floating: boolean;
  bar?: boolean;
  savedCount: number;
  onlySaved: boolean;
  onToggleOnlySaved: () => void;
  payF: string[];
  onRemovePay: (id: string) => void;
  items: string[];
  onRemoveItem: (item: string) => void;
  when: 'today' | 'weekend' | null;
  onToggleWhen: (target: 'today' | 'weekend') => void;
  canSortNearest?: boolean;
  sortBy?: SortMode;
  onToggleNearest?: () => void;
  onOpenPaySheet: () => void;
  saleType: SaleType | null;
  onToggleSaleType: (t: SaleType) => void;
  filterCats: string[];
  activeCats: string[];
  onToggleCat: (c: string) => void;
  hasFilters: boolean;
  onClearAll: () => void;
}) {
  return (
    <div
      className={`filters${floating ? ' is-floating' : ''}${bar ? ' is-bar' : ''}`}
      role="group"
      aria-label="Filters"
    >
      {(savedCount > 0 || onlySaved) && (
        <Chip
          active={onlySaved}
          label="Saved sales"
          onClick={onToggleOnlySaved}
        >
          <Icon name="heart" size={12} />
          {`Saved (${savedCount})`}
        </Chip>
      )}
      {payF.map((id) => {
        const method = payOf(id);
        return (
          <Chip
            key={`pay-${id}`}
            active
            label={`Accepts ${method?.label || id}`}
            onClick={() => onRemovePay(id)}
          >
            {method?.label || id}
          </Chip>
        );
      })}
      {items.map((i) => (
        <Chip key={`item-${i}`} active label={i} onClick={() => onRemoveItem(i)}>
          {i}
        </Chip>
      ))}
      <Chip
        active={when === 'today'}
        label="Today"
        onClick={() => onToggleWhen('today')}
      >
        Today
      </Chip>
      <Chip
        active={when === 'weekend'}
        label="This weekend"
        onClick={() => onToggleWhen('weekend')}
      >
        This weekend
      </Chip>
      {canSortNearest && onToggleNearest && (
        <Chip
          active={sortBy === 'nearest'}
          label="Sort by nearest"
          onClick={onToggleNearest}
        >
          <Icon name="locate" size={13} />
          Nearest
        </Chip>
      )}
      <button
        type="button"
        className="chip"
        aria-haspopup="dialog"
        onClick={onOpenPaySheet}
      >
        <Icon name="card" size={14} />
        Accepts
      </button>
      <span className="divider" aria-hidden="true" />
      {SALE_TYPES.map((t) => (
        <Chip
          key={t}
          label={t}
          active={saleType === t}
          onClick={() => onToggleSaleType(t)}
        >
          {t}
        </Chip>
      ))}
      <span className="divider" aria-hidden="true" />
      {filterCats.map((c) => (
        <Chip
          key={c}
          label={c}
          active={activeCats.includes(c)}
          onClick={() => onToggleCat(c)}
        >
          <Icon name={catIcon(c)} size={14} />
          {c}
        </Chip>
      ))}
      {hasFilters && (
        <button
          type="button"
          className="btn btn-ghost btn-sm flex-none"
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
