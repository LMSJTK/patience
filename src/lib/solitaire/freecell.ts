import { Card } from '../cards';

export function canMoveToTableau(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return true; // Any card can be moved to an empty tableau column in FreeCell
  }
  return targetCard.color !== movingCard.color && targetCard.value === movingCard.value + 1;
}

export function canMoveToFoundation(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return movingCard.rank === 'A';
  }
  return targetCard.suit === movingCard.suit && targetCard.value + 1 === movingCard.value;
}

export function isValidSequence(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].color === cards[i + 1].color || cards[i].value !== cards[i + 1].value + 1) {
      return false;
    }
  }
  return true;
}

export function getMaxMoveCount(emptyFreeCells: number, emptyTableauCols: number, isMovingToEmptyTableau: boolean): number {
  // If moving to an empty tableau column, that column itself doesn't count towards the empty columns available for maneuvering
  const effectiveEmptyCols = isMovingToEmptyTableau ? Math.max(0, emptyTableauCols - 1) : emptyTableauCols;
  return (1 + emptyFreeCells) * Math.pow(2, effectiveEmptyCols);
}
