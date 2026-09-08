import { Card, Rank, Suit, getCardColor, getCardValue } from '../lib/cards';

/**
 * Build one card for a test. Face-up by default, because a test that cares
 * about face-down says so and every other test wants a playable card.
 */
export function card(rank: Rank, suit: Suit, isFaceUp = true, deck = 0): Card {
  return {
    id: `${deck}-${suit}-${rank}`,
    suit,
    rank,
    color: getCardColor(suit),
    isFaceUp,
    value: getCardValue(rank),
  };
}

/**
 * Build a run of cards from a compact notation, e.g. `pile('KS', 'QH', 'JS')`.
 * Suits are the usual initials; `10` is written as `T`.
 */
export function pile(...specs: string[]): Card[] {
  return specs.map((spec, i) => {
    const suitLetter = spec.slice(-1).toUpperCase();
    const rankPart = spec.slice(0, -1).toUpperCase();
    const suits: Record<string, Suit> = { H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' };
    const suit = suits[suitLetter];
    if (!suit) throw new Error(`unknown suit in "${spec}"`);
    const rank = (rankPart === 'T' ? '10' : rankPart) as Rank;
    return card(rank, suit, true, i);
  });
}
