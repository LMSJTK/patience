import React, { useEffect, useState } from 'react';
import { useKlondikeStore, CardLocation } from '../../store/useKlondikeStore';
import PlayingCard from './PlayingCard';
import { cn } from '../../lib/utils';
import { Trophy, Undo2, Settings } from 'lucide-react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Card } from '../../lib/cards';

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
  location: CardLocation; 
  cardsToDrag: Card[];
  className?: string; 
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { location, cards: cardsToDrag },
    disabled: !card.isFaceUp,
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

export default function KlondikeBoard() {
  const { 
    stock, waste, foundations, tableau, 
    initGame, drawCard, selectCard, isWon, handleDrop, undo, history
  } = useKlondikeStore();

  const [activeDragData, setActiveDragData] = useState<{ location: CardLocation; cards: Card[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cardSpacing, setCardSpacing] = useState(28);

  useEffect(() => {
    initGame(1);
    
    const handleResize = () => {
      if (window.innerWidth < 640) setCardSpacing(16);
      else if (window.innerWidth < 768) setCardSpacing(22);
      else setCardSpacing(28);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initGame]);

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragData(active.data.current as { location: CardLocation; cards: Card[] });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);

    if (over && active.data.current) {
      const from = active.data.current.location as CardLocation;
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

  if (isWon) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
        <Trophy className="w-24 h-24 text-yellow-400" />
        <h2 className="text-4xl font-bold text-white">You Won!</h2>
        <p className="text-xl text-green-200">+100 XP</p>
        <button 
          onClick={() => initGame(useKlondikeStore.getState().drawCount)}
          className="px-6 py-3 bg-white text-green-900 font-bold rounded-xl hover:bg-green-100 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetection={pointerWithin}>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 sm:gap-8 p-2 sm:p-4">
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
              <div className="flex items-center gap-2 sm:gap-4 bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                <select 
                  value={useKlondikeStore.getState().drawCount}
                  onChange={(e) => initGame(Number(e.target.value) as 1 | 3)}
                  className="bg-slate-700 text-white px-2 py-1 rounded text-xs sm:text-sm"
                >
                  <option value={1}>Draw 1</option>
                  <option value={3}>Draw 3</option>
                </select>
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

        {/* Top Row: Stock, Waste, Foundations */}
        <div className="flex justify-between gap-2">
          <div className="flex gap-2 sm:gap-4">
            {/* Stock */}
            <div 
              className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20 cursor-pointer relative"
              onClick={drawCard}
            >
              {stock.length > 0 && (
                <PlayingCard 
                  card={stock[stock.length - 1]} 
                  className="absolute inset-0" 
                />
              )}
            </div>
            
            {/* Waste */}
            <div className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg sm:rounded-xl border-2 border-white/10 relative">
              {waste.map((card, i) => {
                const isTop = i === waste.length - 1;
                const offset = Math.min(i * (cardSpacing / 2), cardSpacing);
                if (isTop) {
                  return (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      location={{ type: 'waste' }}
                      cardsToDrag={[card]}
                      style={{ left: offset }}
                      onClick={() => selectCard({ type: 'waste' })}
                    />
                  );
                }
                return (
                  <PlayingCard 
                    key={card.id}
                    card={card}
                    className="absolute top-0"
                    style={{ left: offset }}
                  />
                );
              })}
            </div>
          </div>

          {/* Foundations */}
          <div className="flex gap-1 sm:gap-2 md:gap-4">
            {foundations.map((col, i) => (
              <DroppableArea 
                key={`foundation-${i}`}
                id={`foundation-${i}`}
                data={{ type: 'foundation', index: i }}
                className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20 relative"
                onClick={() => selectCard({ type: 'foundation', index: i })}
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
        <div className="flex justify-between gap-1 sm:gap-2 md:gap-4">
          {tableau.map((col, i) => (
            <DroppableArea 
              key={`tableau-${i}`}
              id={`tableau-${i}`}
              data={{ type: 'tableau', index: i }}
              className="w-16 sm:w-20 md:w-24 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
              style={{ height: col.length > 0 ? (col.length - 1) * cardSpacing + (window.innerWidth < 640 ? 96 : window.innerWidth < 768 ? 112 : 144) : (window.innerWidth < 640 ? 96 : window.innerWidth < 768 ? 112 : 144) }}
              onClick={(e) => {
                if (col.length === 0) {
                  selectCard({ type: 'tableau', index: i, cardIndex: 0 });
                }
              }}
            >
              {col.map((card, j) => {
                if (card.isFaceUp) {
                  return (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      location={{ type: 'tableau', index: i, cardIndex: j }}
                      cardsToDrag={col.slice(j)}
                      style={{ top: j * cardSpacing, zIndex: j }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCard({ type: 'tableau', index: i, cardIndex: j });
                      }}
                    />
                  );
                }
                return (
                  <PlayingCard 
                    key={card.id}
                    card={card}
                    className="absolute w-full"
                    style={{ top: j * cardSpacing, zIndex: j }}
                  />
                );
              })}
            </DroppableArea>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragData ? (
          <div className="relative w-16 sm:w-20 md:w-24">
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
