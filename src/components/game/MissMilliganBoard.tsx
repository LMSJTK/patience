import React, { useEffect, useState } from 'react';
import { useMissMilliganStore, MissMilliganLocation } from '../../store/useMissMilliganStore';
import PlayingCard from './PlayingCard';
import { cn } from '../../lib/utils';
import { Trophy, Undo2, Settings } from 'lucide-react';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragStartEvent, DragEndEvent, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Card } from '../../lib/cards';
import { isValidMissMilliganSequence } from '../../lib/solitaire/missmilligan';

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
  location: MissMilliganLocation; 
  cardsToDrag: Card[];
  className?: string; 
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { location, cards: cardsToDrag },
    disabled: !card.isFaceUp || !isValidMissMilliganSequence(cardsToDrag),
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

export default function MissMilliganBoard() {
  const { 
    stock, foundations, tableau, pocket, isTabbyCat,
    initGame, dealCards, autoMoveCard, isWon, handleDrop, undo, history
  } = useMissMilliganStore();

  const [activeDragData, setActiveDragData] = useState<{ location: MissMilliganLocation; cards: Card[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cardSpacing, setCardSpacing] = useState(28);

  useEffect(() => {
    initGame(false);
    
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
    setActiveDragData(active.data.current as { location: MissMilliganLocation; cards: Card[] });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);

    if (over && active.data.current) {
      const from = active.data.current.location as MissMilliganLocation;
      const to = over.data.current as { type: 'tableau' | 'foundation' | 'pocket', index?: number };
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
        <p className="text-xl text-green-200">+250 XP</p>
        <button 
          onClick={() => initGame(isTabbyCat)}
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
                    checked={isTabbyCat}
                    onChange={(e) => initGame(e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600"
                  />
                  Tabby Cat
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

        {/* Top Row: Stock, Pocket, and Foundations */}
        <div className="flex justify-between items-start gap-2 sm:gap-8">
          <div className="flex gap-2 sm:gap-4">
            {/* Stock */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <div 
                className={cn(
                  "relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20",
                  stock.length > 0 ? "cursor-pointer hover:border-white/40" : "opacity-50"
                )}
                onClick={dealCards}
              >
                {stock.length > 0 && (
                  <div className="absolute inset-0">
                    {Array.from({ length: Math.ceil(stock.length / 8) }).map((_, i) => (
                      <PlayingCard
                        key={i}
                        card={stock[i * 8]}
                        className="absolute w-full h-full shadow-sm"
                        style={{ left: i * 2, top: i * 1 }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-slate-300 text-[10px] sm:text-sm font-medium">{stock.length}</span>
            </div>

            {/* Pocket (Waive) - Only visible/usable when stock is empty */}
            {stock.length === 0 && (
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <DroppableArea 
                  id="pocket"
                  data={{ type: 'pocket' }}
                  className="relative w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 border-dashed border-yellow-400/50 bg-black/20"
                >
                  {pocket.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-yellow-400/50 text-[10px] sm:text-sm font-medium">
                      Pocket
                    </div>
                  ) : (
                    pocket.map((card, j) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        location={{ type: 'pocket', cardIndex: j }}
                        cardsToDrag={pocket.slice(j)}
                        style={{ top: j * cardSpacing, zIndex: j }}
                        onClick={(e) => {
                          e.stopPropagation();
                          autoMoveCard({ type: 'pocket', cardIndex: j });
                        }}
                      />
                    ))
                  )}
                </DroppableArea>
                <span className="text-yellow-400/80 text-[10px] sm:text-sm font-medium">Pocket</span>
              </div>
            )}
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
