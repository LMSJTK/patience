import { useDraggable } from '@dnd-kit/core';
import React from 'react';
import { RETURN_MS, useDraggingCards } from './CardTable';
import { Card } from '../../../lib/cards';
import { cn } from '../../../lib/utils';
import PlayingCard from '../PlayingCard';

/**
 * What a drag carries: where it started, and which cards came with it.
 * Every game shares this shape; only the location type differs.
 */
export interface DragPayload<L> {
  location: L;
  cards: Card[];
}

export interface DraggableCardProps<L> {
  /**
   * Declared because TypeScript does not apply JSX's implicit key handling
   * to a generic component, so a keyed element fails to typecheck without it.
   */
  key?: React.Key;
  card: Card;
  /** Where this card sits, handed back to the store when the drag lands. */
  location: L;
  /** This card and everything stacked on it, moved as one. */
  cardsToDrag: Card[];
  /**
   * The game's own rule beyond "face up" — that the run is a legal sequence,
   * say, or short enough to move with the free cells available.
   */
  canDrag?: boolean;
  /** Passed through to the card, so dealt cards animate in. */
  dealDelay?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export function DraggableCard<L>({
  card,
  location,
  cardsToDrag,
  canDrag = true,
  dealDelay,
  className,
  style,
  onClick,
  onDoubleClick,
}: DraggableCardProps<L>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { location, cards: cardsToDrag },
    disabled: !card.isFaceUp || !canDrag,
  });

  // dnd-kit only reports the card that was grabbed; the rest of the run finds
  // itself here. The offset lives in CSS custom properties on the table, so
  // following the pointer costs no renders.
  const carried = useDraggingCards()?.has(card.id) ?? false;

  const carriedStyle: React.CSSProperties = carried
    ? {
        transform: 'translate3d(var(--drag-x, 0px), var(--drag-y, 0px), 0)',
        // No transition while the pointer has it, so the card tracks exactly;
        // one afterwards, so a refused card slides home instead of snapping.
        transition: isDragging ? 'none' : `transform ${RETURN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        zIndex: 999,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('absolute w-full touch-none', className)}
      style={{ ...style, ...carriedStyle }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <PlayingCard card={card} dealDelay={dealDelay} />
    </div>
  );
}
