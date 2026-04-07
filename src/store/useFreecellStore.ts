import { create } from 'zustand';
import { Card, createDeck, shuffleDeck } from '../lib/cards';
import { canMoveToFoundation, canMoveToTableau, isValidSequence, getMaxMoveCount } from '../lib/solitaire/freecell';
import { useGameStore } from './useGameStore';

export type FreecellLocation = 
  | { type: 'freecell', index: number }
  | { type: 'tableau', index: number, cardIndex: number }
  | { type: 'foundation', index: number };

interface GameStateSnapshot {
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
}

interface FreecellState {
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
  isWon: boolean;
  history: GameStateSnapshot[];
  
  initGame: () => void;
  handleDrop: (from: FreecellLocation, to: { type: 'tableau' | 'foundation' | 'freecell', index: number }) => void;
  autoMoveCard: (location: FreecellLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<FreecellState>): GameStateSnapshot => ({
  freeCells: state.freeCells ? [...state.freeCells] : [null, null, null, null],
  foundations: state.foundations ? state.foundations.map(col => [...col]) : [[], [], [], []],
  tableau: state.tableau ? state.tableau.map(col => [...col]) : [[], [], [], [], [], [], [], []],
});

export const useFreecellStore = create<FreecellState>((set, get) => ({
  freeCells: [null, null, null, null],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], [], []],
  isWon: false,
  history: [],

  initGame: () => {
    const deck = shuffleDeck(createDeck()).map(c => ({ ...c, isFaceUp: true }));
    const tableau: Card[][] = [[], [], [], [], [], [], [], []];
    
    let cardIndex = 0;
    for (let i = 0; i < 8; i++) {
      const numCards = i < 4 ? 7 : 6;
      for (let j = 0; j < numCards; j++) {
        tableau[i].push(deck[cardIndex++]);
      }
    }

    set({
      freeCells: [null, null, null, null],
      foundations: [[], [], [], []],
      tableau,
      isWon: false,
      history: [],
    });
  },

  autoMoveCard: (location) => {
    const state = get();
    let movingCards: Card[] = [];
    
    if (location.type === 'freecell') {
      const card = state.freeCells[location.index];
      if (!card) return;
      movingCards = [card];
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
      for (let i = 0; i < 4; i++) {
        const targetCol = state.foundations[i];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          get().handleDrop(location, { type: 'foundation', index: i });
          return;
        }
      }
    }

    // Try tableau
    for (let i = 0; i < 8; i++) {
      if (location.type === 'tableau' && location.index === i) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      
      if (canMoveToTableau(targetCard, firstMovingCard)) {
        // Calculate if we have enough empty cells to move this stack
        const emptyFreeCells = state.freeCells.filter(c => c === null).length;
        const emptyTableauCols = state.tableau.filter(c => c.length === 0).length;
        const isMovingToEmptyTableau = targetCol.length === 0;
        const maxMoveCount = getMaxMoveCount(emptyFreeCells, emptyTableauCols, isMovingToEmptyTableau);
        
        if (isValidSequence(movingCards) && movingCards.length <= maxMoveCount) {
          get().handleDrop(location, { type: 'tableau', index: i });
          return;
        }
      }
    }

    // Try freecell (only if moving a single card)
    if (movingCards.length === 1 && location.type !== 'freecell') {
      for (let i = 0; i < 4; i++) {
        if (state.freeCells[i] === null) {
          get().handleDrop(location, { type: 'freecell', index: i });
          return;
        }
      }
    }
  },

  handleDrop: (from, to) => {
    set((state) => {
      let movingCards: Card[] = [];
      let newFreeCells = [...state.freeCells];
      let newTableau = state.tableau.map(col => [...col]);
      let newFoundations = state.foundations.map(col => [...col]);

      if (from.type === 'freecell') {
        const card = newFreeCells[from.index];
        if (!card) return state;
        movingCards = [card];
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
          const emptyFreeCells = newFreeCells.filter(c => c === null).length;
          const emptyTableauCols = newTableau.filter(c => c.length === 0).length;
          const isMovingToEmptyTableau = targetCol.length === 0;
          const maxMoveCount = getMaxMoveCount(emptyFreeCells, emptyTableauCols, isMovingToEmptyTableau);

          if (isValidSequence(movingCards) && movingCards.length <= maxMoveCount) {
            isValid = true;
            newTableau[to.index] = [...targetCol, ...movingCards];
          }
        }
      } else if (to.type === 'foundation') {
        if (movingCards.length > 1) return state;
        
        const targetCol = newFoundations[to.index];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          isValid = true;
          newFoundations[to.index] = [...targetCol, ...movingCards];
        }
      } else if (to.type === 'freecell') {
        if (movingCards.length > 1) return state;
        if (newFreeCells[to.index] !== null) return state;
        
        isValid = true;
        newFreeCells[to.index] = movingCards[0];
      }

      if (isValid) {
        const snapshot = cloneState(state);

        if (from.type === 'freecell') {
          newFreeCells[from.index] = null;
        } else if (from.type === 'tableau') {
          newTableau[from.index] = newTableau[from.index].slice(0, from.cardIndex);
        } else if (from.type === 'foundation') {
          newFoundations[from.index].pop();
        }

        return {
          freeCells: newFreeCells,
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
    if (state.isWon) return;
    
    const isWon = state.foundations.every(col => col.length === 13);
    if (isWon) {
      set({ isWon: true });
      useGameStore.getState().addXp('freecell', 100);
    }
  }
}));
