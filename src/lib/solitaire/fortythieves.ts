import { Card } from '../cards';

export function canMoveToTableau(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return true; // Any card can be moved to an empty tableau column
  }
  // In Forty Thieves, you build down by suit
  return targetCard.suit === movingCard.suit && targetCard.value === movingCard.value + 1;
}

export function canMoveToFoundation(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return movingCard.value === 1; // Ace
  }
  return targetCard.suit === movingCard.suit && targetCard.value + 1 === movingCard.value;
}

export function isValidFortyThievesSequence(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    // Must be same suit and descending rank
    if (cards[i].suit !== cards[i + 1].suit || cards[i].value !== cards[i + 1].value + 1) {
      return false;
    }
  }
  return true;
}

export function getMaxMoveCount(emptyTableauCols: number, isMovingToEmptyTableau: boolean): number {
  // In Forty Thieves, you can only move 1 card at a time.
  // However, with empty columns, you can temporarily store cards to move a sequence.
  // The formula for max cards you can move is (1 + emptyCols).
  // If moving TO an empty column, that column doesn't count as an available empty column for the intermediate steps.
  const availableEmptyCols = isMovingToEmptyTableau ? emptyTableauCols - 1 : emptyTableauCols;
  return 1 + availableEmptyCols;
}
