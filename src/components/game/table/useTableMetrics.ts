import React, { useEffect, useState } from 'react';
import { CARD_RATIO, cornerDepthOfHeight } from '../cardGeometry';
import { useSettingsStore } from '../../../store/useSettingsStore';

/**
 * Card geometry, derived from the window rather than fixed per breakpoint.
 *
 * Two jobs. Cards are as large as the table can hold, so a big monitor gets
 * big cards rather than the same cards with more felt around them. And a
 * fanned column always shows enough of each covered card to read it: the rank
 * and the pip under it, never a bare sliver.
 */

/** Below this a card is unreadable; above it the board looks like a toy. */
const MIN_CARD_WIDTH = 40;
const MAX_CARD_WIDTH = 132;

/**
 * How much of a card shows when a column is fanned loosely, as a fraction of
 * its height. Comfortably clear of the rank and pip, which reach
 * CORNER_DEPTH_OF_HEIGHT (about 0.27) down the card.
 */
const FAN_FRACTION = 0.34;

/**
 * The tightest a column may ever be fanned: exactly enough for the rank and
 * pip. A column too deep for even this overflows and the board scrolls, which
 * is better than cards that cannot be told apart.
 *
 * Large print makes the rank taller, so the floor rises with it. A fan tuned
 * to the ordinary corner would bury a large-print one.
 */
const minFanFraction = (largePrint: boolean) => cornerDepthOfHeight(largePrint);

/**
 * The header, the controls row and the gaps between rows — everything above
 * the tableau except the row of piles, which is a card tall and counted
 * separately. Measured from the rendered board rather than estimated.
 */
const FIXED_CHROME = 220;

export interface TableMetrics {
  cardWidth: number;
  cardHeight: number;
  /** The loose fan, for a column short enough not to need squeezing. */
  cardSpacing: number;
  /**
   * The fan for a column of this many cards. Loose by default, tightening
   * only for a column that would otherwise run off the bottom, and never
   * below what it takes to read a covered card.
   */
  fanFor: (cards: number) => number;
  /** Horizontal gap between columns. */
  columnGap: number;
  /** Exactly the width the columns need, so the table centres rather than stretches. */
  tableWidth: number;
  /** Carries the sizes down to every card and pile below. */
  style: React.CSSProperties;
}

export interface TableShape {
  /** How many columns sit across the table. */
  columns: number;
  /**
   * The column depth to size cards for. A design target, not a hard maximum:
   * a deeper column fans tighter, and deeper still it scrolls. Setting this to
   * the theoretical worst case would shrink every card for a board that almost
   * never happens.
   */
  typicalColumn: number;
}

/**
 * Work out the geometry for a given window size.
 *
 * Exported so the rule that matters can be tested directly: however deep a
 * column gets and however small the window, a covered card still shows its
 * rank and pip.
 */
export function computeTableMetrics(
  { columns, typicalColumn }: TableShape,
  viewport?: { width: number; height: number },
  largePrint = false
): TableMetrics {
  const MIN_FAN_FRACTION = minFanFraction(largePrint);
  const viewportWidth = viewport?.width ?? (typeof window === 'undefined' ? 1280 : window.innerWidth);
  const viewportHeight = viewport?.height ?? (typeof window === 'undefined' ? 800 : window.innerHeight);

  const padding = viewportWidth < 640 ? 8 : 28;
  const columnGap = viewportWidth < 640 ? 4 : 12;

  // As wide as the row allows.
  const acrossTheTable = viewportWidth - padding * 2 - columnGap * (columns - 1);
  const byWidth = acrossTheTable / columns;

  // And short enough that a column of the usual depth fits underneath the row
  // of piles, which is itself a card tall. Solving
  //   chrome + cardHeight + cardHeight + (n - 1) * minFan <= viewport
  // for the height, with the fan at its tightest so cards stay as big as
  // possible; shorter columns then fan out loosely from there.
  const perColumn = 2 + MIN_FAN_FRACTION * Math.max(0, typicalColumn - 1);
  const byHeight = (viewportHeight - FIXED_CHROME) / perColumn / CARD_RATIO;

  const width = Math.round(
    Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, byWidth, byHeight))
  );
  const height = Math.round(width * CARD_RATIO);

  const tightest = Math.ceil(height * MIN_FAN_FRACTION);
  // Never below the floor. In large print the rank reaches further down the
  // card than the loose fan allows for, and a short column takes the loose
  // fan directly — so without this the two- and three-card columns are the
  // ones that end up unreadable, which is the wrong way round.
  const loose = Math.max(tightest, Math.round(height * FAN_FRACTION));

  // Room under the row of piles for the column itself.
  const columnBudget = viewportHeight - FIXED_CHROME - height - height;
  const fanFor = (cards: number): number => {
    if (cards <= 2) return loose;
    const toFit = columnBudget / (cards - 1);
    return Math.round(Math.max(tightest, Math.min(loose, toFit)));
  };

  // Cards stop growing at MAX_CARD_WIDTH, so on a large monitor the row would
  // otherwise be spread across the whole screen with great gulfs between the
  // columns. Holding the table to the width its columns need keeps the spacing
  // tight and centres the board.
  const tableWidth = columns * width + columnGap * (columns - 1);

  return {
    cardWidth: width,
    cardHeight: height,
    cardSpacing: loose,
    fanFor,
    columnGap,
    tableWidth,
    style: {
      '--card-w': `${width}px`,
      '--card-h': `${height}px`,
      '--card-gap': `${columnGap}px`,
      maxWidth: `${tableWidth}px`,
    } as React.CSSProperties,
  };
}

export function useTableMetrics(shape: TableShape): TableMetrics {
  const largePrint = useSettingsStore((state) => state.largePrint);
  const [metrics, setMetrics] = useState<TableMetrics>(() =>
    computeTableMetrics(shape, undefined, largePrint)
  );
  const { columns, typicalColumn } = shape;

  useEffect(() => {
    const update = () =>
      setMetrics(computeTableMetrics({ columns, typicalColumn }, undefined, largePrint));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [columns, typicalColumn, largePrint]);

  return metrics;
}
