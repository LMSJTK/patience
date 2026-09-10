import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useDailyStore } from '../store/useDailyStore';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Victory', description: 'Win your first game of any type.', icon: '🏆' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Win a game in under 2 minutes.', icon: '⚡' },
  { id: 'klondike_master', name: 'Klondike Master', description: 'Reach level 5 in Klondike.', icon: '♠️' },
  { id: 'spider_master', name: 'Spider Master', description: 'Reach level 5 in Spider.', icon: '🕷️' },
  { id: 'daily_streak', name: 'Daily Streak', description: 'Complete a daily challenge three days running.', icon: '🔥' },
];

export const checkAndAwardAchievements = async (
  userId: string, 
  stats: any, 
  recentWin?: { gameId: string, time: number }
) => {
  if (!userId) return;

  const userRef = doc(db, 'users', userId);
  
  for (const achievement of ACHIEVEMENTS) {
    const achievementRef = doc(db, 'users', userId, 'achievements', achievement.id);
    const docSnap = await getDoc(achievementRef);
    
    if (!docSnap.exists()) {
      let earned = false;
      
      switch (achievement.id) {
        case 'first_win':
          if (recentWin) earned = true;
          break;
        case 'speed_demon':
          if (recentWin && recentWin.time < 120) earned = true;
          break;
        case 'klondike_master':
          if (stats['klondike']?.level >= 5) earned = true;
          break;
        case 'spider_master':
          if (stats['spider']?.level >= 5) earned = true;
          break;
        case 'daily_streak':
          // Three days running, which is what the description has always
          // promised and there was previously no counter to check.
          if (useDailyStore.getState().streak() >= 3) earned = true;
          break;
      }
      
      if (earned) {
        await setDoc(achievementRef, {
          achievementId: achievement.id,
          timestamp: new Date()
        });
        
        // Post activity
        await addDoc(collection(db, 'activities'), {
          userId,
          type: 'achievement',
          details: JSON.stringify({ achievementId: achievement.id, achievementName: achievement.name }),
          timestamp: new Date()
        });
      }
    }
  }
};
