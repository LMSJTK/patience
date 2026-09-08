import React, { useEffect } from 'react';
import { usePyramidStore } from '../../store/usePyramidStore';
import PlayingCard from './PlayingCard';
import { cn } from '../../lib/utils';
import { Undo2, RefreshCw } from 'lucide-react';
import { getRowCol, isCardExposed } from '../../lib/solitaire/pyramid';
import { WinScreen, useDealSeed, useGameSounds } from './table';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const X_SPACING = 90;
const Y_SPACING = 45;

export default function PyramidBoard() {
  const { 
    stock, waste, pyramid, selectedCard, isWon,
    initGame, drawCard, handleCardClick, undo, history
  } = usePyramidStore();

  const dealSeed = useDealSeed();
  const { dealDelayOf } = useGameSounds(usePyramidStore);

  useEffect(() => {
    initGame(dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    // initGame takes an optional seed, so it must not be used as a click
    // handler directly: React would pass the event in as the deal number.
    return <WinScreen xp={100} onPlayAgain={() => initGame()} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Controls */}
      <div className="flex justify-end">
        <button 
          onClick={undo}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="w-4 h-4" /> Undo
        </button>
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
                  top: row * Y_SPACING,
                  left: `calc(50% + ${(col - row / 2) * X_SPACING}px)`,
                  transform: 'translateX(-50%)',
                  zIndex: row,
                }}
              >
                <div onClick={() => isExposed && handleCardClick(card, { type: 'pyramid', index: i })}>
                  <PlayingCard 
                    card={card} 
                    dealDelay={dealDelayOf(card.id)}
                    className={cn(
                      "w-20 h-28 shadow-md transition-all",
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
            className="relative w-24 h-36" 
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
    </div>
  );
}
