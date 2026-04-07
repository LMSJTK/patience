import React, { useEffect, useState } from 'react';
import { useFortyThievesStore, FortyThievesLocation } from '../../store/useFortyThievesStore';
import PlayingCard from './PlayingCard';
import { cn } from '../../lib/utils';
import { Trophy, Undo2, Settings } from 'lucide-react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Card } from '../../lib/cards';
import { isValidFortyThievesSequence, getMaxMoveCount } from '../../lib/solitaire/fortythieves';

function DraggableCard({ 
  card, 
  location, 
  cardsToDrag,
  className, 
  style, 
  onClick 
}: { 
  key?: React.Key;
  card: Card; 
  location: FortyThievesLocation; 
  cardsToDrag: Card[];
  className?: string; 
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { isJosephine, tableau } = useFortyThievesStore();
  const emptyTableauCols = tableau.filter(c => c.length === 0).length;
  // We don't know the exact target here, so we use the most permissive maxMoveCount (not moving to empty)
  // The actual drop validation handles the strict check.
  const maxMoveCount = isJosephine ? cardsToDrag.length : getMaxMoveCount(emptyTableauCols, false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { location, cards: cardsToDrag },
    disabled: !card.isFaceUp || !isValidFortyThievesSequence(cardsToDrag) || cardsToDrag.length > maxMoveCount,
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes} 
      className={cn("absolute w-full touch-none", className, isDragging && "opacity-0")}
      style={style}
      onClick={onClick}
    >
      <PlayingCard card={card} />
    </div>
  );
}

function DroppableArea({ 
  id, 
  data, 
  className, 
  style,
  children,
  onClick
}: { 
  key?: React.Key;
  id: string; 
  data: any; 
  className?: string; 
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(className, isOver && "ring-4 ring-yellow-400 ring-inset")}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function FortyThievesBoard() {
  const { 
    stock, waste, foundations, tableau, isJosephine,
    initGame, drawCard, autoMoveCard, isWon, handleDrop, undo, history
  } = useFortyThievesStore();

  const [activeDragData, setActiveDragData] = useState<{ location: FortyThievesLocation; cards: Card[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cardSpacing, setCardSpacing] = useState(24);

  useEffect(() => {
    initGame(false);
    
    const handleResize = () => {
      if (window.innerWidth < 640) setCardSpacing(12);
      else if (window.innerWidth < 768) setCardSpacing(16);
      else if (window.innerWidth < 1024) setCardSpacing(20);
      else setCardSpacing(24);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initGame]);

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragData(active.data.current as { location: FortyThievesLocation; cards: Card[] });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);

    if (over && active.data.current) {
      const from = active.data.current.location as FortyThievesLocation;
      const to = over.data.current as { type: 'tableau' | 'foundation', index: number };
      handleDrop(from, to);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const getCardHeight = () => {
    if (window.innerWidth < 640) return 72;
    if (window.innerWidth < 768) return 96;
    if (window.innerWidth < 1024) return 112;
    return 144;
  };

  if (isWon) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
        <Trophy className="w-24 h-24 text-yellow-400" />
        <h2 className="text-4xl font-bold text-white">You Won!</h2>
        <p className="text-xl text-green-200">+200 XP</p>
        <button 
          onClick={() => initGame(isJosephine)}
          className="px-6 py-3 bg-white text-green-900 font-bold rounded-xl hover:bg-green-100 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetection={pointerWithin}>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-8 p-2 sm:p-4">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 sm:gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs sm:text-sm"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" /> Options
            </button>
            {showSettings && (
              <div className="flex items-center gap-4 bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                <label className="flex items-center gap-2 text-[10px] sm:text-sm text-white">
                  <input 
                    type="checkbox" 
                    checked={isJosephine}
                    onChange={(e) => initGame(e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600"
                  />
                  Josephine
                </label>
              </div>
            )}
          </div>
          <button 
            onClick={undo}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
          >
            <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Undo
          </button>
        </div>

        {/* Top Row: Stock, Waste, and Foundations */}
        <div className="flex justify-between items-start gap-2 sm:gap-8">
          <div className="flex gap-2 sm:gap-4">
            {/* Stock */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <div 
                className={cn(
                  "relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20",
                  stock.length > 0 ? "cursor-pointer hover:border-white/40" : "opacity-50"
                )}
                onClick={drawCard}
              >
                {stock.length > 0 && (
                  <PlayingCard 
                    card={stock[stock.length - 1]} 
                    className="absolute w-full h-full shadow-lg"
                  />
                )}
              </div>
              <span className="text-slate-300 text-[10px] sm:text-sm font-medium">{stock.length}</span>
            </div>

            {/* Waste */}
            <div className="relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10">
              {waste.map((card, i) => {
                const isTop = i === waste.length - 1;
                return isTop ? (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    location={{ type: 'waste' }}
                    cardsToDrag={[card]}
                    className="absolute inset-0"
                    onClick={() => autoMoveCard({ type: 'waste' })}
                  />
                ) : (
                  <PlayingCard 
                    key={card.id}
                    card={card}
                    className="absolute inset-0 pointer-events-none"
                  />
                );
              })}
            </div>
          </div>

          {/* Foundations */}
          <div className="flex gap-1 sm:gap-2 md:gap-4 flex-wrap justify-end max-w-[60%]">
            {foundations.map((col, i) => (
              <DroppableArea 
                key={`foundation-${i}`}
                id={`foundation-${i}`}
                data={{ type: 'foundation', index: i }}
                className="w-10 h-15 sm:w-14 sm:h-20 md:w-18 md:h-26 lg:w-20 lg:h-28 rounded-lg border-2 border-white/20 bg-black/20 relative"
                onClick={() => {
                  if (col.length > 0) {
                    autoMoveCard({ type: 'foundation', index: i });
                  }
                }}
              >
                {col.map((card, j) => (
                  <PlayingCard 
                    key={card.id}
                    card={card}
                    className="absolute inset-0 pointer-events-none"
                  />
                ))}
              </DroppableArea>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="flex justify-between gap-0.5 sm:gap-1 md:gap-2">
          {tableau.map((col, i) => (
            <DroppableArea 
              key={`tableau-${i}`}
              id={`tableau-${i}`}
              data={{ type: 'tableau', index: i }}
              className="w-12 sm:w-16 md:w-20 lg:w-24 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
              style={{ height: col.length > 0 ? (col.length - 1) * cardSpacing + getCardHeight() : getCardHeight() }}
            >
              {col.map((card, j) => (
                <DraggableCard
                  key={card.id}
                  card={card}
                  location={{ type: 'tableau', index: i, cardIndex: j }}
                  cardsToDrag={col.slice(j)}
                  style={{ top: j * cardSpacing, zIndex: j }}
                  onClick={(e) => {
                    e.stopPropagation();
                    autoMoveCard({ type: 'tableau', index: i, cardIndex: j });
                  }}
                />
              ))}
            </DroppableArea>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragData ? (
          <div className="relative w-12 sm:w-16 md:w-20 lg:w-24">
            {activeDragData.cards.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                className="absolute w-full shadow-2xl"
                style={{ top: i * cardSpacing }}
              />
            ))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
