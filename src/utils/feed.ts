import type { Sale } from '../types/sale';

export type FeedItem =
  | { kind: 'sale'; sale: Sale }
  | { kind: 'ad'; adIndex: number; isTail: boolean };

/**
 * Interleaves periodic in-feed sponsor cards into the listing grid and ALWAYS
 * appends a trailing sponsor card as the final grid item so no listing sits
 * alone or leaves trailing empty cells in 1-, 2-, or 3-column orientations.
 */
export function buildSaleFeed(visible: Sale[]): FeedItem[] {
  if (!visible.length) return [];

  const items: FeedItem[] = [];
  let sinceAd = 0;
  let adIndex = 0;

  visible.forEach((sale, k) => {
    const remaining = visible.length - k;
    const shouldInsertMidAd =
      k > 0 &&
      remaining >= 2 &&
      ((adIndex === 0 && sinceAd >= 5) || (adIndex > 0 && sinceAd >= 7));

    if (shouldInsertMidAd) {
      items.push({ kind: 'ad', adIndex, isTail: false });
      adIndex++;
      sinceAd = 0;
    }

    items.push({ kind: 'sale', sale });
    sinceAd++;
  });

  items.push({ kind: 'ad', adIndex, isTail: true });
  return items;
}

/**
 * Returns the column span (1..columns) needed for the trailing ad card so the
 * final row is completely filled with zero empty grid cells in any orientation.
 */
export function tailAdColumnSpan(
  precedingItemCount: number,
  columns: 1 | 2 | 3,
): number {
  const remainder = precedingItemCount % columns;
  return remainder === 0 ? columns : columns - remainder;
}
