import { create } from 'zustand';
import { Card, createDeck, shuffleDeck } from '../lib/cards';
import { canMoveToFoundation, canMoveToTableau } from '../lib/solitaire/klondike';
import { useGameStore } from './useGameStore';

export type CardLocation = 
  | { type: 'waste' }
  | { type: 'tableau', index: number, cardIndex: number }
  | { type: 'foundation', index: number };

interface GameStateSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

interface KlondikeState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  drawCount: 1 | 3;
  selectedLocation: CardLocation | null;
  isWon: boolean;
  history: GameStateSnapshot[];
  
  initGame: (drawCount: 1 | 3) => void;
  drawCard: () => void;
  selectCard: (location: CardLocation) => void;
  handleDrop: (from: CardLocation, to: { type: 'tableau' | 'foundation', index: number }) => void;
  autoMoveCard: (location: CardLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<KlondikeState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  waste: state.waste ? state.waste.map(c => ({...c})) : [],
  foundations: state.foundations ? state.foundations.map(col => col.map(c => ({...c}))) : [[], [], [], []],
  tableau: state.tableau ? state.tableau.map(col => col.map(c => ({...c}))) : [[], [], [], [], [], [], []],
});

export const useKlondikeStore = create<KlondikeState>((set, get) => ({
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  drawCount: 1,
  selectedLocation: null,
  isWon: false,
  history: [],

  initGame: (drawCount) => {
    const deck = shuffleDeck(createDeck());
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    
    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[cardIndex++];
        if (i === j) card.isFaceUp = true;
        tableau[j].push(card);
      }
    }

    set({
      stock: deck.slice(cardIndex),
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      drawCount,
      selectedLocation: null,
      isWon: false,
      history: [],
    });
  },

  drawCard: () => set((state) => {
    const snapshot = cloneState(state);

    if (state.stock.length === 0) {
      if (state.waste.length === 0) return state;
      const newStock = [...state.waste].reverse().map(c => ({ ...c, isFaceUp: false }));
      return { stock: newStock, waste: [], selectedLocation: null, history: [...state.history, snapshot] };
    }

    const drawAmount = Math.min(state.drawCount, state.stock.length);
    const drawnCards = state.stock.slice(-drawAmount).reverse().map(c => ({ ...c, isFaceUp: true }));
    
    return {
      stock: state.stock.slice(0, -drawAmount),
      waste: [...state.waste, ...drawnCards],
      selectedLocation: null,
      history: [...state.history, snapshot],
    };
  }),

  selectCard: (location) => {
    // We will replace selectCard usage with autoMoveCard for single clicks
    // but keep it for compatibility if needed.
    get().autoMoveCard(location);
  },

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
    for (let i = 0; i < 7; i++) {
      // Don't move to same column
      if (location.type === 'tableau' && location.index === i) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      if (canMoveToTableau(targetCard, firstMovingCard)) {
        // If moving a King from an empty column to another empty column, skip
        if (firstMovingCard.rank === 'K' && !targetCard && location.type === 'tableau' && location.cardIndex === 0) {
          continue;
        }
        get().handleDrop(location, { type: 'tableau', index: i });
        return;
      }
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
          isValid = true;
          newTableau[to.index] = [...targetCol, ...movingCards];
        }
      } else if (to.type === 'foundation') {
        if (movingCards.length > 1) return state;
        
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
          const col = newTableau[from.index];
          if (col.length > 0 && !col[col.length - 1].isFaceUp) {
            col[col.length - 1].isFaceUp = true;
          }
        } else if (from.type === 'foundation') {
          newFoundations[from.index].pop();
        }

        return {
          waste: newWaste,
          tableau: newTableau,
          foundations: newFoundations,
          selectedLocation: null,
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
      selectedLocation: null,
      isWon: false,
    };
  }),

  checkWin: () => {
    const state = get();
    if (state.isWon) return;
    
    const isWon = state.foundations.every(col => col.length === 13);
    if (isWon) {
      set({ isWon: true });
      useGameStore.getState().addXp('klondike', 100);
    }
  }
}));
