import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GameType, useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { checkAndAwardAchievements } from '../lib/achievements';
import { formatTime, useSessionStore } from '../store/useSessionStore';
import KlondikeBoard from '../components/game/KlondikeBoard';
import FreecellBoard from '../components/game/FreecellBoard';
import SpiderBoard from '../components/game/SpiderBoard';
import PyramidBoard from '../components/game/PyramidBoard';
import FortyThievesBoard from '../components/game/FortyThievesBoard';
import MissMilliganBoard from '../components/game/MissMilliganBoard';

import { useKlondikeStore } from '../store/useKlondikeStore';
import { useFreecellStore } from '../store/useFreecellStore';
import { useSpiderStore } from '../store/useSpiderStore';
import { usePyramidStore } from '../store/usePyramidStore';
import { useFortyThievesStore } from '../store/useFortyThievesStore';
import { useMissMilliganStore } from '../store/useMissMilliganStore';

export default function GamePlay() {
  const { gameId } = useParams<{ gameId: GameType }>();
  const { user, profile } = useAuthStore();
  const updateStats = useGameStore(state => state.updateStats);
  const stats = useGameStore(state => state.stats);
  
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [gameState, setGameState] = useState({ isWon: false, moves: 0, seed: 0 });

  useEffect(() => {
    const stores = {
      klondike: useKlondikeStore,
      freecell: useFreecellStore,
      spider: useSpiderStore,
      pyramid: usePyramidStore,
      fortythieves: useFortyThievesStore,
      missmilligan: useMissMilliganStore,
    };
    
    // Reaching a real endgame by playing takes hundreds of moves, so the
    // browser scripts in scripts/ set one up directly. Development only:
    // import.meta.env.DEV is a compile-time constant, so this whole block is
    // dropped from the production bundle.
    if (import.meta.env.DEV) {
      (window as unknown as { __patience?: unknown }).__patience = stores;
    }

    const store = stores[gameId as GameType];
    if (!store) return;

    // Initial state
    setGameState({
      isWon: store.getState().isWon,
      moves: store.getState().moves,
      seed: store.getState().seed,
    });

    // Subscribe to changes
    const unsubscribe = store.subscribe((state: any) => {
      setGameState({
        isWon: state.isWon,
        moves: state.moves,
        seed: state.seed,
      });
    });

    return unsubscribe;
  }, [gameId]);

  useEffect(() => {
    if (gameState.moves > 0 && !gameState.isWon && !isPlaying) {
      setIsPlaying(true);
    } else if (gameState.moves === 0) {
      setIsPlaying(false);
      setTime(0);
      useSessionStore.getState().startNewGame();
    }
  }, [gameState.moves, gameState.isWon]);

  useEffect(() => {
    if (isPlaying && !gameState.isWon) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, gameState.isWon]);

  // The clock is the page's, but the win panel is inside the board, so it is
  // published where both can reach it.
  useEffect(() => {
    useSessionStore.getState().setSeconds(time);
  }, [time]);

  useEffect(() => {
    if (gameState.isWon) {
      handleWin(time);
    }
  }, [gameState.isWon]);

  const handleWin = async (finalTime: number) => {
    if (!gameId) return;
    
    // Determine difficulty (simplified for now, could be passed from stores)
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (gameId === 'spider') {
      const suitCount = useSpiderStore.getState().suitCount;
      difficulty = suitCount === 1 ? 'easy' : suitCount === 2 ? 'medium' : 'hard';
    } else if (gameId === 'klondike') {
      const drawCount = useKlondikeStore.getState().drawCount;
      difficulty = drawCount === 1 ? 'easy' : 'hard';
    }

    // Update local stats
    const currentBest = stats[gameId].highScores[difficulty];
    // A game the clock never started on is shown but not recorded: writing a
    // zero here would leave a best time nothing could ever beat.
    const isNewBest = finalTime > 0 && (!currentBest || finalTime < currentBest);

    // The panel wants the record as it stood before this game, so capture it
    // here rather than letting it read the value this win is about to replace.
    useSessionStore.getState().recordWin({
      seconds: finalTime,
      moves: gameState.moves,
      // A high score of zero is how this store spells "never won this one",
      // which is what the isNewBest test above reads it as too.
      previousBest: currentBest || null,
    });

    if (isNewBest) {
      updateStats(gameId, {
        highScores: {
          ...stats[gameId].highScores,
          [difficulty]: finalTime
        }
      });
    }

    // Update Firebase if logged in
    if (user && profile) {
      try {
        // Update best time
        if (isNewBest) {
          const bestTimeRef = doc(db, 'users', user.uid, 'bestTimes', `${gameId}_${difficulty}`);
          await setDoc(bestTimeRef, {
            time: finalTime,
            timestamp: new Date()
          });

          // Post activity
          await addDoc(collection(db, 'activities'), {
            userId: user.uid,
            type: 'best_time',
            game: gameId,
            details: JSON.stringify({ time: finalTime, difficulty }),
            timestamp: new Date()
          });
        }
        
        // Check achievements
        await checkAndAwardAchievements(user.uid, stats, { gameId, time: finalTime });
      } catch (error) {
        console.error("Error saving win to Firebase:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-green-900 text-white flex flex-col">
      <header className="p-4 bg-green-950 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-green-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold capitalize">{gameId}</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* The number this deal was shuffled from. Same number, same cards. */}
          <span className="text-green-300/70 font-mono text-sm hidden sm:inline" title="Deal number">
            #{gameState.seed}
          </span>
          <span className="text-green-200">Moves: {gameState.moves}</span>
          <span className="text-green-200 font-mono text-lg">Time: {formatTime(time)}</span>
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden p-8 overflow-y-auto">
        {gameId === 'klondike' ? (
          <KlondikeBoard />
        ) : gameId === 'freecell' ? (
          <FreecellBoard />
        ) : gameId === 'spider' ? (
          <SpiderBoard />
        ) : gameId === 'pyramid' ? (
          <PyramidBoard />
        ) : gameId === 'fortythieves' ? (
          <FortyThievesBoard />
        ) : gameId === 'missmilligan' ? (
          <MissMilliganBoard />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-green-300/50 text-2xl font-medium">Game logic for {gameId} coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}
