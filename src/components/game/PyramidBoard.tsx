import React, { useEffect } from 'react';
import { usePyramidStore } from '../../store/usePyramidStore';
import PlayingCard from './PlayingCard';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';
import { getRowCol, isCardExposed } from '../../lib/solitaire/pyramid';
import { HintButton, NoMoves, UndoRedo, WinScreen, useDealSeed, useGameSounds, useHint, useKeyboard, useTableMetrics } from './table';
import { HintContext } from './table/hintContext';

/**
 * The pyramid is seven rows deep and its widest row is seven cards, but each
 * sits half over its neighbour, so it needs about four cards' width across.
 */
const SHAPE = { columns: 4, typicalColumn: 7 };

export default function PyramidBoard() {
  const { 
    stock, waste, pyramid, selectedCard, isWon,
    initGame, drawCard, handleCardClick, undo, redo, history, future, moves, seed
  } = usePyramidStore();

  const dealSeed = useDealSeed();
  const { dealDelayOf } = useGameSounds(usePyramidStore);
  const { shown: hint, next: showHint, stuck } = useHint(usePyramidStore, moves, isWon);
  const stockHinted = hint?.target === 'stock';
  useKeyboard({
    undo,
    redo,
    hint: showHint,
    newDeal: () => initGame(),
    stock: drawCard,
  });
  const { cardWidth, cardHeight, style: tableStyle } = useTableMetrics(SHAPE);

  // Cards overlap by half across a row and by two fifths down the pyramid,
  // which is what makes the shape read as a pyramid rather than a grid.
  const xSpacing = Math.round(cardWidth * 1.12);
  const ySpacing = Math.round(cardHeight * 0.4);

  useEffect(() => {
    initGame(dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    // initGame takes an optional seed, so it must not be used as a click
    // handler directly: React would pass the event in as the deal number.
    return <WinScreen xp={100} onNewDeal={() => initGame()} onReplay={() => initGame(seed)} />;
  }

  return (
    <HintContext.Provider value={hint}>
    <div style={tableStyle} className="w-full mx-auto flex flex-col gap-8">
      {/* Controls */}
      <div className="flex justify-end gap-2 sm:gap-4">
        <HintButton onClick={showHint} />
        <UndoRedo
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      {/* Pyramid */}
      <div className="relative w-full h-[400px] flex justify-center">
        <div className="relative w-full max-w-2xl h-full">
          {pyramid.map((card, i) => {
            if (!card) return null;
            
            const { row, col } = getRowCol(i);
            const isExposed = isCardExposed(i, pyramid);
            const isSelected = selectedCard?.card.id === card.id;
            
            return (
              <div 
                key={card.id}
                className="absolute"
                style={{
                  top: row * ySpacing,
                  left: `calc(50% + ${(col - row / 2) * xSpacing}px)`,
                  transform: 'translateX(-50%)',
                  zIndex: row,
                }}
              >
                <div onClick={() => isExposed && handleCardClick(card, { type: 'pyramid', index: i })}>
                  <PlayingCard 
                    card={card} 
                    dealDelay={dealDelayOf(card.id)}
                    className={cn(
                      "shadow-md transition-all",
                      !isExposed && "brightness-75",
                      isExposed && "cursor-pointer hover:-translate-y-1 hover:shadow-xl",
                      isSelected && "ring-4 ring-yellow-400 ring-inset"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock and Waste */}
      <div className="flex justify-center gap-8 items-center mt-4">
        {/* Stock */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn('relative w-24 h-36 rounded-xl', stockHinted && 'ring-4 ring-sky-400 ring-inset')}
            onClick={drawCard}
          >
            {stock.length > 0 ? (
              <PlayingCard 
                card={stock[stock.length - 1]} 
                className="absolute w-full h-full shadow-lg cursor-pointer hover:-translate-y-1 transition-transform"
              />
            ) : (
              <div className="w-full h-full rounded-xl border-2 border-white/10 bg-black/20 flex items-center justify-center cursor-pointer hover:bg-black/30">
                <RefreshCw className="w-8 h-8 text-white/30" />
              </div>
            )}
          </div>
          <span className="text-slate-300 text-sm font-medium">{stock.length} Cards</span>
        </div>

        {/* Waste */}
        <div className="relative w-24 h-36">
          {waste.length > 0 && (
            <div onClick={() => handleCardClick(waste[waste.length - 1], { type: 'waste' })}>
              <PlayingCard 
                card={waste[waste.length - 1]} 
                className={cn(
                  "absolute w-full shadow-xl cursor-pointer hover:-translate-y-1 transition-all",
                  selectedCard?.card.id === waste[waste.length - 1].id && "ring-4 ring-yellow-400 ring-inset"
                )}
              />
            </div>
          )}
        </div>
      </div>
      {stuck && <NoMoves onUndo={undo} onNewDeal={() => initGame()} />}
    </div>
    </HintContext.Provider>
  );
}
