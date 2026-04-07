import { Card } from '../cards';

export function canMoveToTableau(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return movingCard.rank === 'K';
  }
  return targetCard.color !== movingCard.color && targetCard.value === movingCard.value + 1;
}

export function canMoveToFoundation(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return movingCard.rank === 'A';
  }
  return targetCard.suit === movingCard.suit && targetCard.value + 1 === movingCard.value;
}
