import { Card } from '../cards';

export function getRowCol(index: number): { row: number, col: number } {
  // The pyramid has 28 cards.
  // Row 0: index 0
  // Row 1: index 1, 2
  // Row 2: index 3, 4, 5
  // Row 3: index 6, 7, 8, 9
  // Row 4: index 10, 11, 12, 13, 14
  // Row 5: index 15, 16, 17, 18, 19, 20
  // Row 6: index 21, 22, 23, 24, 25, 26, 27
  
  // Using the quadratic formula to find the row:
  // r^2 + r - 2*index <= 0
  const row = Math.floor((-1 + Math.sqrt(1 + 8 * index)) / 2);
  const col = index - (row * (row + 1)) / 2;
  return { row, col };
}

export function getCoveringIndices(index: number): [number, number] {
  const { row } = getRowCol(index);
  return [index + row + 1, index + row + 2];
}

export function isCardExposed(index: number, pyramid: (Card | null)[]): boolean {
  if (index >= 21) return true; // Bottom row (row 6, indices 21-27) is always exposed if it exists
  const [left, right] = getCoveringIndices(index);
  return pyramid[left] === null && pyramid[right] === null;
}
