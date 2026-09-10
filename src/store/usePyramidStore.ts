import { create } from 'zustand';
import { Card, createDeck, faceUp, shuffleDeck } from '../lib/cards';
import { mulberry32, randomSeed } from '../lib/rng';
import { isCardExposed } from '../lib/solitaire/pyramid';
import { useGameStore } from './useGameStore';

export type PyramidLocation = 
  | { type: 'pyramid', index: number }
  | { type: 'waste' };

interface GameStateSnapshot {
  stock: Card[];
  waste: Card[];
  pyramid: (Card | null)[];
}

interface PyramidState {
  stock: Card[];
  waste: Card[];
  pyramid: (Card | null)[];
  selectedCard: { card: Card, location: PyramidLocation } | null;
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
  
  initGame: (seed?: number) => void;
  drawCard: () => void;
  handleCardClick: (card: Card, location: PyramidLocation) => void;
  undo: () => void;
  checkWin: () => void;
}

const cloneState = (state: Partial<PyramidState>): GameStateSnapshot => ({
  stock: state.stock ? state.stock.map(c => ({...c})) : [],
  waste: state.waste ? state.waste.map(c => ({...c})) : [],
  pyramid: state.pyramid ? state.pyramid.map(c => c ? ({...c}) : null) : Array(28).fill(null),
});

export const usePyramidStore = create<PyramidState>((set, get) => ({
  stock: [],
  waste: [],
  pyramid: Array(28).fill(null),
  selectedCard: null,
  isWon: false,
  xpAwarded: false,
  seed: 0,
  history: [],

  initGame: (seed = randomSeed()) => {
    let deck = createDeck(1);
    deck = shuffleDeck(deck, mulberry32(seed));
    
    const pyramid: (Card | null)[] = [];
    for (let i = 0; i < 28; i++) {
      const card = deck.pop()!;
      card.isFaceUp = true;
      pyramid.push(card);
    }
    
    set({
      stock: deck,
      waste: [],
      pyramid,
      selectedCard: null,
      isWon: false,
      xpAwarded: false,
      seed,
      history: [],
    });
  },

  drawCard: () => {
    const state = get();
    const snapshot = cloneState(state);
    
    if (state.stock.length === 0) {
      if (state.waste.length === 0) return; // Nothing to draw
      
      // Recycle waste to stock (unlimited passes for relaxed play)
      const newStock = [...state.waste].reverse().map(c => ({ ...c, isFaceUp: false }));
      set({
        stock: newStock,
        waste: [],
        selectedCard: null,
        history: [...state.history, snapshot]
      });
    } else {
      const newStock = [...state.stock];
      const newWaste = [...state.waste];
      newWaste.push(faceUp(newStock.pop()!));
      
      // If the selected card was in the waste, deselect it since it's covered now
      let newSelected = state.selectedCard;
      if (newSelected?.location.type === 'waste') {
        newSelected = null;
      }
      
      set({
        stock: newStock,
        waste: newWaste,
        selectedCard: newSelected,
        history: [...state.history, snapshot]
      });
    }
  },

  handleCardClick: (card, location) => {
    const state = get();
    
    // If King, remove immediately (value 13)
    if (card.value === 13) {
      const snapshot = cloneState(state);
      const newPyramid = [...state.pyramid];
      const newWaste = [...state.waste];
      
      if (location.type === 'pyramid') {
        newPyramid[location.index] = null;
      } else if (location.type === 'waste') {
        newWaste.pop();
      }
      
      // If the selected card was the one we just removed, deselect it
      let newSelected = state.selectedCard;
      if (newSelected?.card.id === card.id) {
        newSelected = null;
      }

      set({
        pyramid: newPyramid,
        waste: newWaste,
        selectedCard: newSelected,
        history: [...state.history, snapshot]
      });
      get().checkWin();
      return;
    }

    // If no card selected, select this one
    if (!state.selectedCard) {
      set({ selectedCard: { card, location } });
      return;
    }

    // If same card clicked, deselect
    if (state.selectedCard.card.id === card.id) {
      set({ selectedCard: null });
      return;
    }

    // If sum is 13, remove both
    if (state.selectedCard.card.value + card.value === 13) {
      const snapshot = cloneState(state);
      const newPyramid = [...state.pyramid];
      const newWaste = [...state.waste];
      
      const locs = [state.selectedCard.location, location];
      for (const loc of locs) {
        if (loc.type === 'pyramid') {
          newPyramid[loc.index] = null;
        } else if (loc.type === 'waste') {
          newWaste.pop();
        }
      }
      
      set({
        pyramid: newPyramid,
        waste: newWaste,
        selectedCard: null,
        history: [...state.history, snapshot]
      });
      get().checkWin();
      return;
    }

    // Otherwise, select the new card
    set({ selectedCard: { card, location } });
  },

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    
    const newHistory = [...state.history];
    const previousState = newHistory.pop()!;
    
    return {
      ...previousState,
      selectedCard: null,
      history: newHistory,
      isWon: false,
    };
  }),

  checkWin: () => {
    const state = get();
    if (state.xpAwarded) return;
    
    // Win condition: pyramid is completely empty
    if (state.pyramid.every(c => c === null)) {
      set({ isWon: true, xpAwarded: true });
      useGameStore.getState().addXp('pyramid', 100);
    }
  }
}));
