import { create } from 'zustand';
import { Card, createDeck, shuffleDeck } from '../lib/cards';
import { mulberry32, randomSeed } from '../lib/rng';
import { canMoveToFoundation, canMoveToTableau, isValidMissMilliganSequence } from '../lib/solitaire/missmilligan';
import { useGameStore } from './useGameStore';

export type MissMilliganLocation = 
  | { type: 'tableau', index: number, cardIndex: number }
  | { type: 'foundation', index: number }
  | { type: 'pocket', cardIndex?: number };

interface GameStateSnapshot {
  stock: Card[];
  foundations: Card[][];
  tableau: Card[][];
  pocket: Card[];
}

interface MissMilliganState {
  stock: Card[];
  foundations: Card[][];
  tableau: Card[][];
  pocket: Card[];
  isTabbyCat: boolean;
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
  
  initGame: (isTabbyCat?: boolean, seed?: number) => void;
  dealCards: () => void;
  handleDrop: (from: MissMilliganLocation, to: { type: 'tableau' | 'foundation' | 'pocket', index?: number }) => void;
  autoMoveCard: (location: MissMilliganLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<MissMilliganState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  foundations: state.foundations ? state.foundations.map(col => [...col]) : Array(8).fill([]),
  tableau: state.tableau ? state.tableau.map(col => [...col]) : Array(8).fill([]),
  pocket: state.pocket ? state.pocket.map(c => ({...c})) : [],
});

export const useMissMilliganStore = create<MissMilliganState>((set, get) => ({
  stock: [],
  foundations: Array(8).fill([]),
  tableau: Array(8).fill([]),
  pocket: [],
  isTabbyCat: false,
  isWon: false,
  xpAwarded: false,
  seed: 0,
  history: [],

  initGame: (isTabbyCat = false, seed = randomSeed()) => {
    // 2 decks
    let deck = createDeck(2);
    deck = shuffleDeck(deck, mulberry32(seed));
    
    const tableau: Card[][] = Array(8).fill([]).map(() => []);
    
    // Deal 1 card to each of the 8 tableau columns
    for (let j = 0; j < 8; j++) {
      const card = deck.pop()!;
      card.isFaceUp = true;
      tableau[j].push(card);
    }

    set({
      stock: deck,
      foundations: Array(8).fill([]).map(() => []),
      tableau,
      pocket: [],
      isTabbyCat,
      isWon: false,
      xpAwarded: false,
      seed,
      history: [],
    });
  },

  dealCards: () => set((state) => {
    if (state.stock.length === 0) return state;
    
    const snapshot = cloneState(state);
    const newStock = [...state.stock];
    const newTableau = state.tableau.map(col => [...col]);
    
    // Deal 1 card to each of the 8 columns, or as many as we have left
    for (let i = 0; i < 8; i++) {
      if (newStock.length > 0) {
        const card = newStock.pop()!;
        card.isFaceUp = true;
        newTableau[i].push(card);
      }
    }

    return {
      stock: newStock,
      tableau: newTableau,
      history: [...state.history, snapshot],
    };
  }),

  autoMoveCard: (location) => {
    const state = get();
    let movingCards: Card[] = [];
    
    if (location.type === 'pocket') {
      if (state.pocket.length === 0) return;
      // For auto-move, we try to move the last card to foundation first
      movingCards = [state.pocket[state.pocket.length - 1]];
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

    // If location was pocket and we didn't move to foundation, try moving the WHOLE pocket to tableau
    if (location.type === 'pocket') {
      movingCards = state.pocket;
      const pocketFirstCard = movingCards[0];
      for (let i = 0; i < 8; i++) {
        const targetCol = state.tableau[i];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        if (canMoveToTableau(targetCard, pocketFirstCard, state.isTabbyCat)) {
          get().handleDrop({ type: 'pocket', cardIndex: 0 }, { type: 'tableau', index: i });
          return;
        }
      }
      return; // Done trying for pocket
    }

    // Try tableau
    let bestTargetIndex = -1;
    let emptyTargetIndex = -1;

    for (let i = 0; i < 8; i++) {
      if (location.type === 'tableau' && location.index === i) continue;
      
      const targetCol = state.tableau[i];
      const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
      
      if (canMoveToTableau(targetCard, firstMovingCard, state.isTabbyCat)) {
        if (!targetCard) {
          if (emptyTargetIndex === -1) emptyTargetIndex = i;
        } else {
          bestTargetIndex = i;
          break; // Found a valid non-empty column, prefer this
        }
      }
    }

    const targetIndex = bestTargetIndex !== -1 ? bestTargetIndex : emptyTargetIndex;
    if (targetIndex !== -1) {
      get().handleDrop(location, { type: 'tableau', index: targetIndex });
      return;
    }

    // Try pocket if stock is empty and pocket is empty
    if (state.stock.length === 0 && state.pocket.length === 0 && isValidMissMilliganSequence(movingCards)) {
      get().handleDrop(location, { type: 'pocket' });
    }
  },

  handleDrop: (from, to) => {
    set((state) => {
      let movingCards: Card[] = [];
      let newTableau = state.tableau.map(col => [...col]);
      let newFoundations = state.foundations.map(col => [...col]);
      let newPocket = [...state.pocket];

      // Extract moving cards
      if (from.type === 'pocket') {
        if (newPocket.length === 0) return state;
        const cardIndex = from.cardIndex ?? 0;
        movingCards = newPocket.slice(cardIndex);
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
        const targetCol = newTableau[to.index!];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToTableau(targetCard, firstMovingCard, state.isTabbyCat) && isValidMissMilliganSequence(movingCards)) {
          isValid = true;
          newTableau[to.index!] = [...targetCol, ...movingCards];
        }
      } else if (to.type === 'foundation') {
        if (movingCards.length > 1) return state; // Can only move 1 card to foundation
        
        const targetCol = newFoundations[to.index!];
        const targetCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        
        if (canMoveToFoundation(targetCard, firstMovingCard)) {
          isValid = true;
          newFoundations[to.index!] = [...targetCol, ...movingCards];
        }
      } else if (to.type === 'pocket') {
        if (state.stock.length > 0 || newPocket.length > 0) return state;
        if (isValidMissMilliganSequence(movingCards)) {
          isValid = true;
          newPocket = [...movingCards];
        }
      }

      if (isValid) {
        const snapshot = cloneState(state);

        if (from.type === 'pocket') {
          const cardIndex = from.cardIndex ?? 0;
          newPocket = newPocket.slice(0, cardIndex);
        } else if (from.type === 'tableau') {
          newTableau[from.index] = newTableau[from.index].slice(0, from.cardIndex);
        } else if (from.type === 'foundation') {
          newFoundations[from.index].pop();
        }

        return {
          tableau: newTableau,
          foundations: newFoundations,
          pocket: newPocket,
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
      useGameStore.getState().addXp('missmilligan', 250); // Hard game, high XP
    }
  }
}));
