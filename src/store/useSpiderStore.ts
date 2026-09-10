import { create } from 'zustand';
import { Card, createDeck, faceUp, revealTop, shuffleDeck } from '../lib/cards';
import { mulberry32, randomSeed } from '../lib/rng';
import { canMoveToTableau, isValidSpiderSequence, checkForCompletedSequence } from '../lib/solitaire/spider';
import { useGameStore } from './useGameStore';

export type SpiderLocation = 
  | { type: 'tableau', index: number, cardIndex: number };

interface GameStateSnapshot {
  stock: Card[];
  tableau: Card[][];
  completedSets: number;
}

interface SpiderState {
  stock: Card[];
  tableau: Card[][];
  completedSets: number;
  suitCount: 1 | 2 | 4;
  isRelaxed: boolean;
  isWon: boolean;
  /** The number this deal was shuffled from. Replaying it reproduces these cards. */
  seed: number;
  /**
   * True once this deal has paid out XP. Undo clears isWon so the board is
   * playable again, but must not clear this, or a win could be banked twice.
   * Only initGame resets it.
   */
  xpAwarded: boolean;
  history: GameStateSnapshot[];
  
  initGame: (suitCount: 1 | 2 | 4, isRelaxed: boolean, seed?: number) => void;
  dealCards: () => void;
  handleDrop: (from: SpiderLocation, to: { type: 'tableau', index: number }) => void;
  autoMoveCard: (location: SpiderLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<SpiderState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  tableau: state.tableau ? state.tableau.map(col => col.map(c => ({...c}))) : Array(10).fill([]),
  completedSets: state.completedSets || 0,
});

function getContinuousSequenceLength(column: Card[]): number {
  if (column.length === 0) return 0;
  let length = 1;
  for (let i = column.length - 1; i > 0; i--) {
    const current = column[i];
    const above = column[i - 1];
    if (above.isFaceUp && above.suit === current.suit && above.value === current.value + 1) {
      length++;
    } else {
      break;
    }
  }
  return length;
}

export const useSpiderStore = create<SpiderState>((set, get) => ({
  stock: [],
  tableau: Array(10).fill([]),
  completedSets: 0,
  suitCount: 1,
  isRelaxed: false,
  isWon: false,
  xpAwarded: false,
  seed: 0,
  history: [],

  initGame: (suitCount, isRelaxed, seed = randomSeed()) => {
    let deck: Card[] = [];
    if (suitCount === 1) {
      deck = createDeck(8, ['spades']);
    } else if (suitCount === 2) {
      deck = createDeck(4, ['spades', 'hearts']);
    } else {
      deck = createDeck(2);
    }
    
    deck = shuffleDeck(deck, mulberry32(seed));
    
    const tableau: Card[][] = Array(10).fill([]).map(() => []);
    
    let cardIndex = 0;
    // 10 columns: first 4 have 6 cards, next 6 have 5 cards
    for (let i = 0; i < 10; i++) {
      const numCards = i < 4 ? 6 : 5;
      for (let j = 0; j < numCards; j++) {
        const card = deck[cardIndex++];
        if (j === numCards - 1) card.isFaceUp = true;
        tableau[i].push(card);
      }
    }

    set({
      stock: deck.slice(cardIndex),
      tableau,
      completedSets: 0,
      suitCount,
      isRelaxed,
      isWon: false,
      xpAwarded: false,
      seed,
      history: [],
    });
  },

  dealCards: () => set((state) => {
    if (state.stock.length === 0) return state;
    
    // Check if any column is empty (unless relaxed)
    if (!state.isRelaxed && state.tableau.some(col => col.length === 0)) {
      // In standard Spider, you can't deal if there are empty columns
      return state;
    }

    const snapshot = cloneState(state);
    const newTableau = state.tableau.map(col => [...col]);
    const newStock = [...state.stock];
    
    // Deal 1 card to each column
    for (let i = 0; i < 10; i++) {
      if (newStock.length > 0) {
        newTableau[i].push(faceUp(newStock.pop()!));
      }
    }
    
    // Check for completed sequences right after dealing
    let completedSets = state.completedSets;
    for (let i = 0; i < 10; i++) {
      if (checkForCompletedSequence(newTableau[i])) {
        newTableau[i] = newTableau[i].slice(0, -13);
        completedSets++;
        revealTop(newTableau[i]);
      }
    }

    return {
      stock: newStock,
      tableau: newTableau,
      completedSets,
      history: [...state.history, snapshot],
    };
  }),

  autoMoveCard: (location) => {
    const state = get();
    if (location.type !== 'tableau') return;
    
    const col = state.tableau[location.index];
    const movingCards = col.slice(location.cardIndex);
    
    if (movingCards.length === 0) return;
    if (!isValidSpiderSequence(movingCards)) return;
    
    const firstMovingCard = movingCards[0];

    let bestTargetIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < 10; i++) {
      if (i === location.index) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      
      if (canMoveToTableau(targetCard, firstMovingCard)) {
        let score = 0;
        if (!targetCard) {
          score = 0; // Empty column is lowest priority
        } else {
          const seqLen = getContinuousSequenceLength(targetCol);
          const isSameSuit = targetCard.suit === firstMovingCard.suit;
          
          // Score formula:
          // Same suit gets a massive boost (e.g., +100)
          // Then add sequence length
          score = (isSameSuit ? 100 : 10) + seqLen;
        }

        if (score > bestScore) {
          bestScore = score;
          bestTargetIndex = i;
        }
      }
    }

    if (bestTargetIndex !== -1) {
      get().handleDrop(location, { type: 'tableau', index: bestTargetIndex });
    }
  },

  handleDrop: (from, to) => {
    set((state) => {
      if (from.type !== 'tableau' || to.type !== 'tableau') return state;
      if (from.index === to.index) return state;

      const newTableau = state.tableau.map(col => [...col]);
      const sourceCol = newTableau[from.index];
      const movingCards = sourceCol.slice(from.cardIndex);
      
      if (movingCards.length === 0) return state;
      if (!isValidSpiderSequence(movingCards)) return state;

      const targetCol = newTableau[to.index];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;

      if (canMoveToTableau(targetCard, movingCards[0])) {
        const snapshot = cloneState(state);
        
        // Move cards
        newTableau[to.index] = [...targetCol, ...movingCards];
        newTableau[from.index] = sourceCol.slice(0, from.cardIndex);
        
        // Flip top card of source column if needed
        revealTop(newTableau[from.index]);

        // Check for completed sequence in target column
        let completedSets = state.completedSets;
        if (checkForCompletedSequence(newTableau[to.index])) {
          newTableau[to.index] = newTableau[to.index].slice(0, -13);
          completedSets++;
          
          // Flip top card of target column after removing sequence
          revealTop(newTableau[to.index]);
        }

        return {
          tableau: newTableau,
          completedSets,
          history: [...state.history, snapshot],
        };
      }

      return state;
    });
    
    get().checkWin();
  },

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    
    const newHistory = [...state.history];
    const previousState = newHistory.pop()!;
    
    return {
      ...previousState,
      history: newHistory,
      isWon: false,
    };
  }),

  checkWin: () => {
    const state = get();
    if (state.xpAwarded) return;
    
    if (state.completedSets === 8) {
      set({ isWon: true, xpAwarded: true });
      useGameStore.getState().addXp('spider', 100 * state.suitCount);
    }
  }
}));
