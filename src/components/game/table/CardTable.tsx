import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import React, { useState } from 'react';
import { Card } from '../../../lib/cards';
import { cn } from '../../../lib/utils';
import PlayingCard from '../PlayingCard';
import { DragPayload } from './DraggableCard';

/**
 * The card being dragged, drawn under the pointer.
 *
 * Its width matches PlayingCard's own so the preview is the same size as the
 * card it stands for. Phase 2 removes this second copy entirely and drags the
 * real card, which is what stops the blink on drop.
 */
function DraggedStack({ cards, cardSpacing }: { cards: Card[]; cardSpacing: number }) {
  return (
    <div className="relative w-12 sm:w-16 md:w-20 lg:w-24">
      {cards.map((card, i) => (
        <PlayingCard
          key={card.id}
          card={card}
          className="absolute w-full shadow-2xl"
          style={{ top: i * cardSpacing }}
        />
      ))}
    </div>
  );
}

export interface CardTableProps<L, T> {
  /** Called when a drag ends over a pile. The store decides if it is legal. */
  onDrop: (from: L, to: T) => void;
  /** Fan spacing, so the dragged stack matches the column it came from. */
  cardSpacing: number;
  /** Layout classes for the board itself, which differ by column count. */
  className?: string;
  children: React.ReactNode;
}

/**
 * The drag surface every game plays on: pointer sensors, collision detection
 * and the dragged-card overlay, in one place instead of five.
 */
export function CardTable<L, T>({ onDrop, cardSpacing, className, children }: CardTableProps<L, T>) {
  const [dragging, setDragging] = useState<DragPayload<L> | null>(null);

  // A few pixels of travel before a drag starts, so a click stays a click.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(event) => setDragging(event.active.data.current as DragPayload<L>)}
      onDragEnd={(event) => {
        setDragging(null);
        const payload = event.active.data.current as DragPayload<L> | undefined;
        if (event.over && payload) onDrop(payload.location, event.over.data.current as T);
      }}
      // Without this an escaped or interrupted drag leaves the preview stuck
      // on screen, because nothing else clears it.
      onDragCancel={() => setDragging(null)}
    >
      <div className={cn('w-full mx-auto flex flex-col gap-4 sm:gap-8 p-2 sm:p-4', className)}>
        {children}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? <DraggedStack cards={dragging.cards} cardSpacing={cardSpacing} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
