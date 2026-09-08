import { useEffect, useState } from 'react';

/** The widths the card art switches size at (Tailwind's sm, md and lg). */
const BREAKPOINTS = [640, 768, 1024];

/**
 * One value per screen size: below 640, below 768, below 1024, then above.
 * Written smallest screen first, the same order the Tailwind classes read in.
 */
export type Ladder = readonly [number, number, number, number];

export interface TableMetrics {
  /** Vertical gap between fanned cards in a column. */
  cardSpacing: number;
  /** Height of a single card, used to size a column to its contents. */
  cardHeight: number;
}

function pick(ladder: Ladder, width: number): number {
  for (let i = 0; i < BREAKPOINTS.length; i++) {
    if (width < BREAKPOINTS[i]) return ladder[i];
  }
  return ladder[BREAKPOINTS.length];
}

/**
 * Card geometry for the current window size.
 *
 * Each board used to carry its own copy of this resize listener. The ladders
 * stay per-game because the games genuinely differ: ten Spider columns need
 * tighter fanning than seven Klondike ones.
 *
 * These are fixed steps, so a large monitor gets the same cards as a laptop
 * with more empty felt around them. Phase 2 replaces them with metrics
 * measured from the table itself so the cards grow to fill the window.
 */
export function useTableMetrics(spacing: Ladder, height: Ladder): TableMetrics {
  const read = (): TableMetrics => {
    const width = typeof window === 'undefined' ? BREAKPOINTS[2] : window.innerWidth;
    return { cardSpacing: pick(spacing, width), cardHeight: pick(height, width) };
  };

  const [metrics, setMetrics] = useState<TableMetrics>(read);

  // Boards pass array literals, so depend on the values rather than identity.
  const ladderKey = `${spacing.join()}|${height.join()}`;

  useEffect(() => {
    const onResize = () => setMetrics(read());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ladderKey]);

  return metrics;
}
