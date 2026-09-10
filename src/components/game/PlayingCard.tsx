import React, { forwardRef, memo } from 'react';
import { Card as CardType } from '../../lib/cards';
import * as geometry from './cardGeometry';
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
  /**
   * Seconds to wait before this card appears, while a hand is being dealt.
   * Undefined at every other time, so a card that arrives because it was
   * played does not drop in from nowhere.
   */
  dealDelay?: number;
}

const SuitIcon = ({ suit, className, style }: { suit: string; className?: string; style?: React.CSSProperties }) => {
  const props = { className: cn('fill-current', className), style, strokeWidth: 1.5 };
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

/** Where a card comes from when it is dealt: above its place, small and faint. */
const DEAL_FROM = { opacity: 0, scale: 0.88, y: -26 } as const;

/**
 * A card at rest.
 *
 * Always passed as the animation target, even when nothing is being dealt.
 * Dropping it while a card is still travelling leaves the card frozen at
 * whatever size it had reached, which is how a dealt hand ended up with a
 * dozen permanently shrunken cards.
 */
const CARD_AT_REST = { opacity: 1, scale: 1, y: 0 } as const;

/**
 * Every measurement on a card, as a fraction of its width.
 *
 * The table decides how big a card is and publishes it as --card-w; the art
 * inside follows, so a card on a large monitor is genuinely bigger rather than
 * the same card with more felt around it. The fallbacks are the old fixed
 * size, so a card rendered outside a table still looks right.
 */
const W = 'var(--card-w, 96px)';
const H = 'var(--card-h, 144px)';
const cardSize: React.CSSProperties = {
  width: W,
  height: H,
  borderRadius: `calc(${W} * ${geometry.CARD_RADIUS})`,
};
/** Rank and suit in the corners. */
const corner: React.CSSProperties = {
  fontSize: `calc(${W} * ${geometry.RANK_SIZE})`,
  width: `calc(${W} * 0.2)`,
  gap: `calc(${W} * ${geometry.RANK_PIP_GAP})`,
};
const cornerPip = {
  width: `calc(${W} * ${geometry.CORNER_PIP})`,
  height: `calc(${W} * ${geometry.CORNER_PIP})`,
};
/** The big watermark suit behind the face. */
const centrePip = {
  width: `calc(${W} * ${geometry.CENTRE_PIP})`,
  height: `calc(${W} * ${geometry.CENTRE_PIP})`,
};
const facePadding = { padding: `calc(${W} * ${geometry.FACE_PADDING})` };

/**
 * How long a card takes to turn over.
 *
 * Both faces live in one node and the node rotates, so the card you were
 * looking at is the card that turns. Swapping one component tree for another
 * cannot be animated at all: React replaces the element and the browser has
 * nothing to interpolate from.
 */
const FLIP_MS = 200;

/** Deep enough to read as a card turning, shallow enough not to fish-eye it. */
const PERSPECTIVE = `calc(${W} * 4)`;

const PlayingCardInner = forwardRef<HTMLDivElement, PlayingCardProps>(
  ({ card, className, style, isSelected, dealDelay, ...props }, ref) => {
    // Subscribed to the one field this needs. Reading the whole store meant a
    // card re-rendered whenever anything in it changed, XP included.
    const cardBack = useGameStore((state) => state.cardBack);
    const reduceMotion = useReducedMotion();
    const transition = reduceMotion ? NO_MOTION : MOVE_TRANSITION;

    // While a hand is going out, each card waits its turn and then drops in.
    // The wait matches the card-slide sound exactly, so the two are one event.
    const dealing = dealDelay !== undefined && !reduceMotion;
    const motionProps = dealing
      ? {
          initial: DEAL_FROM,
          animate: CARD_AT_REST,
          transition: { duration: 0.2, ease: MOVE_TRANSITION.ease, delay: dealDelay },
        }
      : { animate: CARD_AT_REST, transition };

    const radius = cardSize.borderRadius;

    return (
      <motion.div
        ref={ref}
        layoutId={card.id}
        {...motionProps}
        // A stable hook for tests and the browser scripts, so they do not have
        // to guess at styling classes to find a card. Rank and suit are absent
        // while a card is face down: what the player cannot see should not be
        // sitting in the DOM for anyone who opens the inspector.
        data-card={card.id}
        data-face={card.isFaceUp ? 'up' : 'down'}
        {...(card.isFaceUp ? { 'data-rank': card.rank, 'data-suit': card.suit } : {})}
        className={cn(
          'relative shadow-md cursor-pointer',
          isSelected && 'ring-2 sm:ring-4 ring-yellow-400 ring-offset-1 sm:ring-offset-2 ring-offset-green-900 z-50',
          className
        )}
        style={{ ...cardSize, perspective: PERSPECTIVE, ...style }}
        {...props}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: card.isFaceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: reduceMotion
              ? undefined
              : `transform ${FLIP_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
          }}
        >
          {/* The face. Only built once the card is turned up, so a hidden card
              gives nothing away, and both faces are present through the turn. */}
          {card.isFaceUp && (
            <div
              className={cn(
                'absolute inset-0 border bg-white flex flex-col justify-between overflow-hidden',
                card.color === 'red'
                  ? 'text-red-600 border-red-200'
                  : card.suit === 'clubs'
                    ? 'text-slate-700 border-slate-200'
                    : 'text-black border-slate-200'
              )}
              style={{ backfaceVisibility: 'hidden', borderRadius: radius, ...facePadding }}
            >
              <div style={corner} className="font-bold leading-none flex flex-col items-center">
                <span>{card.rank}</span>
                <SuitIcon suit={card.suit} style={cornerPip} />
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <SuitIcon suit={card.suit} style={centrePip} />
              </div>

              <div style={corner} className="font-bold leading-none flex flex-col items-center self-end rotate-180">
                <span>{card.rank}</span>
                <SuitIcon suit={card.suit} style={cornerPip} />
              </div>
            </div>
          )}

          {/* The back, always built: it is what the far side of the turn shows,
              and it carries no information about the card. */}
          <div
            className={cn(
              'absolute inset-0 border-2 overflow-hidden',
              cardBack === 'default'
                ? 'bg-gradient-to-br from-indigo-500 to-purple-700 border-white/10'
                : 'border-transparent'
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: radius,
            }}
          >
            {cardBack === 'default' ? (
              <div style={{ inset: `calc(${W} * ${geometry.BACK_INSET})` }} className="absolute border-2 border-white/20 rounded-lg opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] bg-repeat" />
            ) : (
              <img src={cardBack} alt="" className="w-full h-full object-cover pointer-events-none" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

PlayingCardInner.displayName = 'PlayingCard';

function sameStyle(a?: React.CSSProperties, b?: React.CSSProperties): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof React.CSSProperties)[];
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

/**
 * A card is the same card if it is the same card.
 *
 * Not merely the same object: a store that turns a card over by setting the
 * flag where it stands leaves the object identical, and comparing by identity
 * alone would then decide nothing had changed and never redraw it. The stores
 * replace cards rather than mutate them, but this is the place where getting
 * that wrong stops being a style question and starts being an invisible bug,
 * so it does not depend on them getting it right.
 */
function sameCard(a: CardType, b: CardType): boolean {
  return a === b || (a.id === b.id && a.isFaceUp === b.isFaceUp);
}

/**
 * Boards rebuild their style objects on every render, so the default shallow
 * compare would never match and the memo would never hold. Everything else is
 * compared by identity, which is conservative: a card whose handler changed
 * identity re-renders, which is wasteful but never wrong.
 */
function samePlayingCard(a: PlayingCardProps, b: PlayingCardProps): boolean {
  const keys = Object.keys(a) as (keyof PlayingCardProps)[];
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    if (key === 'style') return sameStyle(a.style, b.style);
    if (key === 'card') return sameCard(a.card, b.card);
    return a[key] === b[key];
  });
}

/**
 * A move changes two piles, but every card on the board used to re-render.
 * With 104 cards out in a two-deck game that was tens of milliseconds a move.
 */
const PlayingCard = memo(PlayingCardInner, samePlayingCard);

export default PlayingCard;
