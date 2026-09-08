import React, { forwardRef } from 'react';
import { Card as CardType } from '../../lib/cards';
import { cn } from '../../lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

/**
 * motion.div redefines the drag and animation handlers with its own
 * signatures, so those four are dropped rather than passed through. Nothing
 * renders a card with them, and Phase 2 removes motion from this file
 * entirely.
 */
type DivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

export interface PlayingCardProps extends DivProps {
  card: CardType;
  isSelected?: boolean;
}

const SuitIcon = ({ suit, className }: { suit: string, className?: string }) => {
  const props = { className: cn("fill-current", className), strokeWidth: 1.5 };
  switch (suit) {
    case 'hearts': return <Heart {...props} />;
    case 'diamonds': return <Diamond {...props} />;
    case 'clubs': return <Club {...props} />;
    case 'spades': return <Spade {...props} />;
    default: return null;
  }
};

/**
 * How a card travels when it changes pile.
 *
 * motion's default for a layout transition is a spring, which crawls for the
 * first tenth of the move and takes about half a second to settle. A short
 * ease-out reads as a card being dealt: quick off the mark, soft landing.
 * Measured by `npm run trace`, which fails above 250ms.
 */
const MOVE_TRANSITION = { type: 'tween', duration: 0.19, ease: [0.2, 0.8, 0.2, 1] } as const;

/** Instant for anyone who has asked their system for less motion. */
const NO_MOTION = { duration: 0 } as const;

const PlayingCard = forwardRef<HTMLDivElement, PlayingCardProps>(
  ({ card, className, style, isSelected, ...props }, ref) => {
    const { cardBack } = useGameStore();
    const reduceMotion = useReducedMotion();
    const transition = reduceMotion ? NO_MOTION : MOVE_TRANSITION;

    if (!card.isFaceUp) {
      return (
        <motion.div
          ref={ref}
          layoutId={card.id}
          transition={transition}
          className={cn(
            "w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border-2 shadow-md cursor-pointer overflow-hidden relative",
            cardBack === 'default' ? "bg-gradient-to-br from-indigo-500 to-purple-700 border-white/10" : "border-transparent",
            className
          )}
          style={style}
          {...props}
        >
          {cardBack === 'default' ? (
            <div className="absolute inset-1 sm:inset-2 border-2 border-white/20 rounded-lg opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] bg-repeat" />
          ) : (
            <img src={cardBack} alt="Card back" className="w-full h-full object-cover pointer-events-none" />
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        layoutId={card.id}
        transition={transition}
        className={cn(
          "w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-36 rounded-lg sm:rounded-xl border shadow-md bg-white flex flex-col justify-between p-1 sm:p-2 cursor-pointer relative overflow-hidden",
          card.color === 'red' ? 'text-red-600 border-red-200' : card.suit === 'clubs' ? 'text-slate-700 border-slate-200' : 'text-black border-slate-200',
          isSelected && 'ring-2 sm:ring-4 ring-yellow-400 ring-offset-1 sm:ring-offset-2 ring-offset-green-900 z-50',
          className
        )}
        style={style}
        {...props}
      >
        <div className="text-[10px] sm:text-sm md:text-base lg:text-lg font-bold leading-none flex flex-col items-center w-3 sm:w-4 md:w-6 gap-0 sm:gap-0.5 lg:gap-1">
          <span>{card.rank}</span>
          <SuitIcon suit={card.suit} className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <SuitIcon suit={card.suit} className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" />
        </div>

        <div className="text-[10px] sm:text-sm md:text-base lg:text-lg font-bold leading-none flex flex-col items-center w-3 sm:w-4 md:w-6 gap-0 sm:gap-0.5 lg:gap-1 self-end rotate-180">
          <span>{card.rank}</span>
          <SuitIcon suit={card.suit} className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </div>
      </motion.div>
    );
  }
);

PlayingCard.displayName = 'PlayingCard';

export default PlayingCard;
