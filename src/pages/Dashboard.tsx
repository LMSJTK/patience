import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore, GameType } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { signInWithGoogle, logOut } from '../lib/firebase';
import { Trophy, Star, Play, Settings, Image as ImageIcon, Medal, Users, LogIn, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import SettingsModal from '../components/SettingsModal';
import FriendsModal from '../components/FriendsModal';

const GAMES: { id: GameType; name: string; description: string }[] = [
  { id: 'klondike', name: 'Klondike', description: 'The classic solitaire experience.' },
  { id: 'freecell', name: 'FreeCell', description: 'Perfect information, high win rate.' },
  { id: 'spider', name: 'Spider', description: 'Build sequences in the tableau.' },
  { id: 'pyramid', name: 'Pyramid', description: 'Match pairs that add up to 13.' },
  { id: 'fortythieves', name: 'Forty Thieves', description: 'Napoleon at St Helena.' },
  { id: 'missmilligan', name: 'Miss Milligan', description: 'A unique two-deck challenge.' },
];

export default function Dashboard() {
  const { stats } = useGameStore();
  const { user, profile, isAuthReady } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);

  const dailyChallenges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    
    const challenges = [];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    const xpRewards = [50, 100, 250];
    
    for (let i = 0; i < 3; i++) {
      const gameIndex = Math.abs((hash + i) % GAMES.length);
      const diffIndex = i;
      challenges.push({
        id: `daily-${today}-${i}`,
        game: GAMES[gameIndex],
        difficulty: difficulties[diffIndex],
        xp: xpRewards[diffIndex],
        title: `Solve ${GAMES[gameIndex].name}`,
        description: `Complete a ${difficulties[diffIndex].toLowerCase()} deal of ${GAMES[gameIndex].name}.`
      });
    }
    return challenges;
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Patience Suite</h1>
            <p className="text-slate-400 mt-2">Master the art of solitaire</p>
          </div>
          <div className="flex gap-4 items-center">
            {isAuthReady && user ? (
              <div className="flex items-center gap-4 mr-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{profile?.displayName}</div>
                  <div className="text-xs text-slate-400">Code: {profile?.friendCode}</div>
                </div>
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {profile?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <button 
                  onClick={() => setIsFriendsOpen(true)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
                  title="Friends & Activity"
                >
                  <Users className="w-5 h-5 text-slate-300" />
                </button>
                <button 
                  onClick={logOut}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5 text-slate-300" />
                </button>
              </div>
            ) : isAuthReady ? (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors mr-4"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            ) : null}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
              title="Card Backs"
            >
              <ImageIcon className="w-5 h-5 text-slate-300" />
            </button>
            <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            Daily Challenges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dailyChallenges.map((challenge) => (
              <div key={challenge.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={cn(
                    "px-3 py-1 text-sm font-medium rounded-full",
                    challenge.difficulty === 'Easy' ? "bg-emerald-500/20 text-emerald-300" :
                    challenge.difficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-red-500/20 text-red-300"
                  )}>
                    {challenge.difficulty}
                  </span>
                  <span className="text-slate-400 text-sm">+{challenge.xp} XP</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{challenge.title}</h3>
                <p className="text-slate-400 text-sm mb-6 flex-1">{challenge.description}</p>
                <Link 
                  to={`/play/${challenge.game.id}`}
                  className="w-full mt-auto py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group-hover:bg-indigo-500"
                >
                  <Play className="w-4 h-4" /> Play Challenge
                </Link>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-400" />
              Game Modes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {GAMES.map((game) => {
                const gameStats = stats[game.id];
                const progress = (gameStats.xp / (gameStats.level * 100)) * 100;

                return (
                  <Link 
                    key={game.id} 
                    to={`/play/${game.id}`}
                    className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10 group block"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors">{game.name}</h3>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-300">Level {gameStats.level}</div>
                        <div className="text-xs text-slate-500">{gameStats.xp} / {gameStats.level * 100} XP</div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm mb-6 h-10">{game.description}</p>
                    
                    <div className="space-y-2">
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Medal className="w-6 h-6 text-amber-400" />
              Best Times
            </h2>
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-6">
              {GAMES.slice(0, 4).map((game) => (
                <div key={game.id} className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{game.name}</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">Easy</span>
                    <span className="font-mono text-white">{formatTime(stats[game.id].highScores.easy)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">Medium</span>
                    <span className="font-mono text-white">{formatTime(stats[game.id].highScores.medium)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">Hard</span>
                    <span className="font-mono text-white">{formatTime(stats[game.id].highScores.hard)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isFriendsOpen && <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />}
    </div>
  );
}
