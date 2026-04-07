import { Card } from '../cards';

export function canMoveToTableau(targetCard: Card | undefined, movingCard: Card): boolean {
  if (!targetCard) {
    return true; // Any card can be moved to an empty tableau column
  }
  // In Spider, you can build down regardless of suit
  return targetCard.value === movingCard.value + 1;
}

export function isValidSpiderSequence(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    // To move a sequence, it must be same suit and descending rank
    if (cards[i].suit !== cards[i + 1].suit || cards[i].value !== cards[i + 1].value + 1) {
      return false;
    }
  }
  return true;
}

export function checkForCompletedSequence(column: Card[]): boolean {
  if (column.length < 13) return false;
  
  const last13 = column.slice(-13);
  
  // Must start with King and end with Ace
  if (last13[0].rank !== 'K' || last13[12].rank !== 'A') return false;
  
  // Must be same suit and descending
  for (let i = 0; i < 12; i++) {
    if (last13[i].suit !== last13[i + 1].suit || last13[i].value !== last13[i + 1].value + 1) {
      return false;
    }
    // Must be face up
    if (!last13[i].isFaceUp || !last13[i + 1].isFaceUp) {
      return false;
    }
  }
  
  return true;
}
