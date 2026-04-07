import { Card } from '../cards';

export function canMoveToTableau(targetCard: Card | undefined, movingCard: Card, isTabbyCat: boolean = false): boolean {
  if (!targetCard) {
    if (isTabbyCat) return true; // Tabby Cat allows any card on empty columns
    return movingCard.value === 13; // Standard only allows Kings
  }
  const isDifferentColor = targetCard.color !== movingCard.color;
  const isDescending = targetCard.value === movingCard.value + 1;
  return isDifferentColor && isDescending;
}

export function canMoveToFoundation(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return movingCard.value === 1; // Ace
  }
  return targetCard.suit === movingCard.suit && targetCard.value + 1 === movingCard.value;
}

export function isValidMissMilliganSequence(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].color === cards[i + 1].color || cards[i].value !== cards[i + 1].value + 1) {
      return false;
    }
  }
  return true;
}
