import { Rng } from './rng';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Color = 'red' | 'black';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  color: Color;
  isFaceUp: boolean;
  value: number; // 1 for A, 11 for J, 12 for Q, 13 for K
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getCardColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

export function createDeck(decks: number = 1, suits: Suit[] = SUITS): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        deck.push({
          id: `${d}-${suit}-${rank}`,
          suit,
          rank,
          color: getCardColor(suit),
          isFaceUp: false,
          value: getCardValue(rank),
        });
      }
    }
  }
  return deck;
}

/**
 * Fisher-Yates, drawing from `rng` so a seeded generator produces the same
 * deal every time. Defaults to Math.random for callers that do not care.
 */
export function shuffleDeck(deck: Card[], rng: Rng = Math.random): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}
