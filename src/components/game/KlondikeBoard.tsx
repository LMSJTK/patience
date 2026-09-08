import { Settings, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CardLocation, useKlondikeStore } from '../../store/useKlondikeStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  Ladder,
  WinScreen,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type KlondikeTarget = { type: 'tableau' | 'foundation'; index: number };

/** Seven columns, so cards can sit relatively far apart. */
const SPACING: Ladder = [16, 22, 28, 28];
/**
 * Klondike's piles are sized on a three-step scale (h-24/h-28/h-36) while the
 * cards themselves use four steps, so on the narrowest screens a slot is
 * taller than the card in it. Preserved here rather than quietly changed;
 * Phase 2 derives both from one measurement.
 */
const HEIGHT: Ladder = [96, 112, 144, 144];

export default function KlondikeBoard() {
  const { stock, waste, foundations, tableau, initGame, selectCard, isWon, handleDrop, undo, history } =
    useKlondikeStore();

  const [showSettings, setShowSettings] = useState(false);
  const { cardSpacing, cardHeight } = useTableMetrics(SPACING, HEIGHT);

  const dealSeed = useDealSeed();
  const onDrop = useGameSounds(useKlondikeStore, handleDrop);

  useEffect(() => {
    initGame(1, dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    return <WinScreen xp={100} onPlayAgain={() => initGame(useKlondikeStore.getState().drawCount)} />;
  }

  return (
    <CardTable<CardLocation, KlondikeTarget>
      onDrop={onDrop}
      cardSpacing={cardSpacing}
      className="max-w-6xl"
    >
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
            onClick={useKlondikeStore.getState().drawCard}
          >
            {stock.length > 0 && <PlayingCard card={stock[stock.length - 1]} className="absolute inset-0" />}
          </div>

          {/* Waste */}
          <div className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg sm:rounded-xl border-2 border-white/10 relative">
            {waste.map((card, i) => {
              const offset = Math.min(i * (cardSpacing / 2), cardSpacing);
              const isTop = i === waste.length - 1;
              if (isTop) {
                return (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    location={{ type: 'waste' } as CardLocation}
                    cardsToDrag={[card]}
                    style={{ left: offset }}
                    onClick={() => selectCard({ type: 'waste' })}
                  />
                );
              }
              return <PlayingCard key={card.id} card={card} className="absolute top-0" style={{ left: offset }} />;
            })}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1 sm:gap-2 md:gap-4">
          {foundations.map((col, i) => (
            <DroppableArea
              key={`foundation-${i}`}
              id={`foundation-${i}`}
              data={{ type: 'foundation', index: i } as KlondikeTarget}
              className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg sm:rounded-xl border-2 border-white/20 bg-black/20 relative"
              onClick={() => selectCard({ type: 'foundation', index: i })}
            >
              {col.map((card) => (
                <PlayingCard key={card.id} card={card} className="absolute inset-0 pointer-events-none" />
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
            data={{ type: 'tableau', index: i } as KlondikeTarget}
            className="w-16 sm:w-20 md:w-24 rounded-lg sm:rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ height: col.length > 0 ? (col.length - 1) * cardSpacing + cardHeight : cardHeight }}
            onClick={() => {
              if (col.length === 0) selectCard({ type: 'tableau', index: i, cardIndex: 0 });
            }}
          >
            {col.map((card, j) => {
              if (card.isFaceUp) {
                return (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    location={{ type: 'tableau', index: i, cardIndex: j } as CardLocation}
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
    </CardTable>
  );
}
