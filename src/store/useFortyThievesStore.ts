import { create } from 'zustand';
import { Card, createDeck, shuffleDeck } from '../lib/cards';
import { mulberry32, randomSeed } from '../lib/rng';
import { canMoveToFoundation, canMoveToTableau, isValidFortyThievesSequence, getMaxMoveCount } from '../lib/solitaire/fortythieves';
import { useGameStore } from './useGameStore';

export type FortyThievesLocation = 
  | { type: 'tableau', index: number, cardIndex: number }
  | { type: 'foundation', index: number }
  | { type: 'waste' };

interface GameStateSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

interface FortyThievesState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  isJosephine: boolean;
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
  
  initGame: (isJosephine?: boolean, seed?: number) => void;
  drawCard: () => void;
  handleDrop: (from: FortyThievesLocation, to: { type: 'tableau' | 'foundation', index: number }) => void;
  autoMoveCard: (location: FortyThievesLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<FortyThievesState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  waste: state.waste ? state.waste.map(c => ({...c})) : [],
  foundations: state.foundations ? state.foundations.map(col => [...col]) : Array(8).fill([]),
  tableau: state.tableau ? state.tableau.map(col => [...col]) : Array(10).fill([]),
});

export const useFortyThievesStore = create<FortyThievesState>((set, get) => ({
  stock: [],
  waste: [],
  foundations: Array(8).fill([]),
  tableau: Array(10).fill([]),
  isJosephine: false,
  isWon: false,
  xpAwarded: false,
  seed: 0,
  history: [],

  initGame: (isJosephine = false, seed = randomSeed()) => {
    // 2 decks
    let deck = createDeck(2);
    deck = shuffleDeck(deck, mulberry32(seed));
    
    const tableau: Card[][] = Array(10).fill([]).map(() => []);
    
    // Deal 4 cards to each of the 10 tableau columns, all face up
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 10; j++) {
        const card = deck.pop()!;
        card.isFaceUp = true;
        tableau[j].push(card);
      }
    }

    set({
      stock: deck,
      waste: [],
      foundations: Array(8).fill([]).map(() => []),
      tableau,
      isJosephine,
      isWon: false,
      xpAwarded: false,
      seed,
      history: [],
    });
  },

  drawCard: () => set((state) => {
    if (state.stock.length === 0) return state; // No redeals in standard Forty Thieves
    
    const snapshot = cloneState(state);
    const newStock = [...state.stock];
    const newWaste = [...state.waste];
    
    const card = newStock.pop()!;
    card.isFaceUp = true;
    newWaste.push(card);

    return {
      stock: newStock,
      waste: newWaste,
      history: [...state.history, snapshot],
    };
  }),

  autoMoveCard: (location) => {
    const state = get();
    let movingCards: Card[] = [];
    
    if (location.type === 'waste') {
      if (state.waste.length === 0) return;
      movingCards = [state.waste[state.waste.length - 1]];
    } else if (location.type === 'tableau') {
      const col = state.tableau[location.index];
      movingCards = col.slice(location.cardIndex);
    } else if (location.type === 'foundation') {
      const col = state.foundations[location.index];
      if (col.length === 0) return;
      movingCards = [col[col.length - 1]];
    }

    if (movingCards.length === 0) return;
    const firstMovingCard = movingCards[0];

    // Try foundation first (only if moving a single card)
    if (movingCards.length === 1) {
      for (let i = 0; i < 8; i++) {
        const targetCol = state.foundations[i];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          get().handleDrop(location, { type: 'foundation', index: i });
          return;
        }
      }
    }

    // Try tableau
    let bestTargetIndex = -1;
    let emptyTargetIndex = -1;

    for (let i = 0; i < 10; i++) {
      if (location.type === 'tableau' && location.index === i) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      
      if (canMoveToTableau(targetCard, firstMovingCard)) {
        const emptyTableauCols = state.tableau.filter(c => c.length === 0).length;
        const isMovingToEmptyTableau = targetCol.length === 0;
        const maxMoveCount = state.isJosephine ? movingCards.length : getMaxMoveCount(emptyTableauCols, isMovingToEmptyTableau);
        
        if (isValidFortyThievesSequence(movingCards) && movingCards.length <= maxMoveCount) {
          if (!targetCard) {
            if (emptyTargetIndex === -1) emptyTargetIndex = i;
          } else {
            bestTargetIndex = i;
            break; // Found a valid non-empty column, prefer this
          }
        }
      }
    }

    const targetIndex = bestTargetIndex !== -1 ? bestTargetIndex : emptyTargetIndex;
    if (targetIndex !== -1) {
      get().handleDrop(location, { type: 'tableau', index: targetIndex });
    }
  },

  handleDrop: (from, to) => {
    set((state) => {
      let movingCards: Card[] = [];
      let newWaste = [...state.waste];
      let newTableau = state.tableau.map(col => [...col]);
      let newFoundations = state.foundations.map(col => [...col]);

      if (from.type === 'waste') {
        if (newWaste.length === 0) return state;
        movingCards = [newWaste[newWaste.length - 1]];
      } else if (from.type === 'tableau') {
        const col = newTableau[from.index];
        movingCards = col.slice(from.cardIndex);
      } else if (from.type === 'foundation') {
        const col = newFoundations[from.index];
        if (col.length === 0) return state;
        movingCards = [col[col.length - 1]];
      }

      if (movingCards.length === 0) return state;

      const firstMovingCard = movingCards[0];
      let isValid = false;

      if (to.type === 'tableau') {
        const targetCol = newTableau[to.index];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToTableau(targetCard, firstMovingCard)) {
          const emptyTableauCols = newTableau.filter(c => c.length === 0).length;
          const isMovingToEmptyTableau = targetCol.length === 0;
          const maxMoveCount = state.isJosephine ? movingCards.length : getMaxMoveCount(emptyTableauCols, isMovingToEmptyTableau);

          if (isValidFortyThievesSequence(movingCards) && movingCards.length <= maxMoveCount) {
            isValid = true;
            newTableau[to.index] = [...targetCol, ...movingCards];
          }
        }
      } else if (to.type === 'foundation') {
        if (movingCards.length > 1) return state; // Can only move 1 card to foundation
        
        const targetCol = newFoundations[to.index];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          isValid = true;
          newFoundations[to.index] = [...targetCol, ...movingCards];
        }
      }

      if (isValid) {
        const snapshot = cloneState(state);

        if (from.type === 'waste') {
          newWaste.pop();
        } else if (from.type === 'tableau') {
          newTableau[from.index] = newTableau[from.index].slice(0, from.cardIndex);
        } else if (from.type === 'foundation') {
          newFoundations[from.index].pop();
        }

        return {
          waste: newWaste,
          tableau: newTableau,
          foundations: newFoundations,
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
    
    const isWon = state.foundations.every(col => col.length === 13);
    if (isWon) {
      set({ isWon: true, xpAwarded: true });
      useGameStore.getState().addXp('fortythieves', 200); // Harder game, more XP
    }
  }
}));
