import { Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { isValidSequence } from '../../lib/solitaire/freecell';
import { FreecellLocation, useFreecellStore } from '../../store/useFreecellStore';
import PlayingCard from './PlayingCard';
import {
  CardTable,
  DraggableCard,
  DroppableArea,
  WinScreen,
  useDealSeed,
  useGameSounds,
  useTableMetrics,
} from './table';

type FreecellTarget = { type: 'tableau' | 'foundation' | 'freecell'; index: number };

/** Eight columns, everything face up. */
const SHAPE = { columns: 8, deepestColumn: 14 };

/** Every pile is one card's worth of space. */
const slot = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function FreecellBoard() {
  const { freeCells, foundations, tableau, initGame, autoMoveCard, isWon, handleDrop, undo, history } =
    useFreecellStore();

  const { cardSpacing, cardHeight, style: tableStyle } = useTableMetrics(SHAPE);

  const dealSeed = useDealSeed();
  const { onDrop, dealDelayOf } = useGameSounds(useFreecellStore, handleDrop);

  useEffect(() => {
    initGame(dealSeed);
  }, [initGame, dealSeed]);

  if (isWon) {
    return <WinScreen xp={100} onPlayAgain={() => initGame()} />;
  }

  return (
    <CardTable<FreecellLocation, FreecellTarget>
      onDrop={onDrop}
      style={tableStyle}
    >
      {/* Controls */}
      <div className="flex justify-end">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" /> Undo
        </button>
      </div>

      {/* Top Row: Free Cells and Foundations */}
      <div className="flex justify-between items-start gap-2 sm:gap-8">
        {/* Free Cells */}
        <div className="flex gap-1 sm:gap-2 md:gap-4">
          {freeCells.map((card, i) => (
            <DroppableArea
              key={`freecell-${i}`}
              id={`freecell-${i}`}
              data={{ type: 'freecell', index: i } as FreecellTarget}
              style={slot}
              className="rounded-xl border-2 border-white/20 bg-black/20 relative"
              onClick={() => {
                if (card) autoMoveCard({ type: 'freecell', index: i });
              }}
            >
              {card && (
                <DraggableCard
                  card={card}
                  location={{ type: 'freecell', index: i } as FreecellLocation}
                  cardsToDrag={[card]}
                  className="absolute inset-0"
                />
              )}
            </DroppableArea>
          ))}
        </div>

        {/* Foundations */}
        <div className="flex gap-1 sm:gap-2 md:gap-4">
          {foundations.map((col, i) => (
            <DroppableArea
              key={`foundation-${i}`}
              id={`foundation-${i}`}
              data={{ type: 'foundation', index: i } as FreecellTarget}
              style={slot}
              className="rounded-xl border-2 border-white/20 bg-black/20 relative"
              onClick={() => {
                if (col.length > 0) autoMoveCard({ type: 'foundation', index: i });
              }}
            >
              {col.map((card) => (
                <PlayingCard key={card.id} card={card} className="absolute inset-0 pointer-events-none" />
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
            data={{ type: 'tableau', index: i } as FreecellTarget}
            className="rounded-xl border-2 border-white/10 bg-black/10 relative transition-all"
            style={{ width: 'var(--card-w)', height: col.length > 0 ? (col.length - 1) * cardSpacing + cardHeight : cardHeight }}
          >
            {col.map((card, j) => (
              <DraggableCard
                key={card.id}
                card={card}
                location={{ type: 'tableau', index: i, cardIndex: j } as FreecellLocation}
                cardsToDrag={col.slice(j)}
                canDrag={isValidSequence(col.slice(j))}
                dealDelay={dealDelayOf(card.id)}
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
    </CardTable>
  );
}
