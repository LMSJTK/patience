import React, { useEffect, useState } from 'react';

/**
 * Card geometry, derived from the window rather than fixed per breakpoint.
 *
 * Cards used to come in four sizes chosen by Tailwind breakpoint, so a 27-inch
 * monitor showed the same 96px cards as a laptop with more empty felt around
 * them. Here the cards are as large as the table can hold: wide enough to fill
 * the row, short enough that the longest column still fits on screen.
 */

/** A playing card is half again as tall as it is wide, and so is the art. */
const CARD_RATIO = 1.5;

/** Below this a card is unreadable; above it the board looks like a toy. */
const MIN_CARD_WIDTH = 40;
const MAX_CARD_WIDTH = 132;

/** Fraction of a card's height left showing when cards are fanned down a column. */
const FAN_FRACTION = 0.26;

/** Tighter than this and the rank in the corner starts to disappear. */
const MIN_FAN = 13;

/** Roughly what the header, the controls row and the top row of piles take. */
const CHROME_HEIGHT = 240;

export interface TableMetrics {
  cardWidth: number;
  cardHeight: number;
  /** Vertical gap between fanned cards in a column. */
  cardSpacing: number;
  /** Horizontal gap between columns. */
  columnGap: number;
  /** Exactly the width the columns need, so the table centres rather than stretches. */
  tableWidth: number;
  /**
   * Carries the sizes down to every card and pile below, so nothing has to be
   * passed through by hand.
   */
  style: React.CSSProperties;
}

export interface TableShape {
  /** How many columns sit across the table. */
  columns: number;
  /** The deepest a column is expected to get, for the height budget. */
  deepestColumn: number;
}

function measure({ columns, deepestColumn }: TableShape): TableMetrics {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;

  const padding = viewportWidth < 640 ? 8 : 28;
  const columnGap = viewportWidth < 640 ? 4 : 12;

  // Cards are as wide as the row allows. Height is not allowed to shrink
  // them: a long column is handled by fanning tighter, the way a real player
  // squares up a pile, rather than by making every card smaller.
  const acrossTheTable = viewportWidth - padding * 2 - columnGap * (columns - 1);
  const width = Math.round(
    Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, acrossTheTable / columns))
  );
  const height = Math.round(width * CARD_RATIO);

  // Fan as generously as the height budget allows, down to the point where the
  // corner rank would start to be covered.
  const budget = viewportHeight - CHROME_HEIGHT - height;
  const perCard = budget / Math.max(1, deepestColumn - 1);
  const spacing = Math.round(
    Math.max(MIN_FAN, Math.min(height * FAN_FRACTION, perCard))
  );

  // Cards stop growing at MAX_CARD_WIDTH, so on a large monitor the row would
  // otherwise be spread across the whole screen with great gulfs between the
  // columns. Holding the table to the width its columns actually need keeps
  // the spacing tight and centres the board.
  const tableWidth = columns * width + columnGap * (columns - 1);

  return {
    cardWidth: width,
    cardHeight: height,
    cardSpacing: spacing,
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

/**
 * Card geometry for the current window.
 *
 * `deepestColumn` is what the game's longest column can reach, not what it
 * holds right now — sizing to the current board would make every card resize
 * as the game went on.
 */
export function useTableMetrics(shape: TableShape): TableMetrics {
  const [metrics, setMetrics] = useState<TableMetrics>(() => measure(shape));
  const { columns, deepestColumn } = shape;

  useEffect(() => {
    const update = () => setMetrics(measure({ columns, deepestColumn }));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [columns, deepestColumn]);

  return metrics;
}
