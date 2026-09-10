import React from 'react';
import { useSettingsStore } from '../../../store/useSettingsStore';

/**
 * How a card is asked to play itself: one click, or two.
 *
 * A single click is quicker and is what this has always done. A double click
 * is Windows Solitaire's convention, and it stops a mis-aimed click sending a
 * card off somewhere while you were only trying to pick it up — which matters
 * more the smaller the cards are.
 *
 * Returns props rather than a handler, because the two modes listen to
 * different events. Counting clicks by hand would work but would have to
 * re-implement the double-click timing the browser already knows.
 */
export type MoveClickProps = {
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
};

export function useMoveClick(): (handler: (e: React.MouseEvent) => void) => MoveClickProps {
  const mode = useSettingsStore((state) => state.clickToMove);
  return (handler) => (mode === 'double' ? { onDoubleClick: handler } : { onClick: handler });
}
