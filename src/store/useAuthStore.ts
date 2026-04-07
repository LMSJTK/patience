import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useGameStore } from './useGameStore';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  friendCode: string;
  level: number;
  xp: number;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
}));

const generateFriendCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

let unsubscribeStats: (() => void) | null = null;

export const initAuth = () => {
  onAuthStateChanged(auth, async (user) => {
    useAuthStore.getState().setUser(user);
    
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous Player',
          photoURL: user.photoURL || undefined,
          friendCode: generateFriendCode(),
          level: 1,
          xp: 0,
        };
        await setDoc(userRef, newProfile);
        useAuthStore.getState().setProfile(newProfile);
      } else {
        useAuthStore.getState().setProfile(userSnap.data() as UserProfile);
      }

      // Load stats from Firebase
      const statsRef = doc(db, 'users', user.uid, 'data', 'stats');
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        useGameStore.getState().setStats(statsSnap.data() as any);
      } else {
        // Save initial local stats to Firebase
        await setDoc(statsRef, useGameStore.getState().stats);
      }

      // Subscribe to local stats changes and sync to Firebase
      if (unsubscribeStats) unsubscribeStats();
      unsubscribeStats = useGameStore.subscribe((state, prevState) => {
        if (state.stats !== prevState.stats) {
          setDoc(statsRef, state.stats, { merge: true });
        }
      });

      // Listen to profile changes
      onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          useAuthStore.getState().setProfile(doc.data() as UserProfile);
        }
      });
    } else {
      useAuthStore.getState().setProfile(null);
      if (unsubscribeStats) {
        unsubscribeStats();
        unsubscribeStats = null;
      }
    }
    
    useAuthStore.getState().setAuthReady(true);
  });
};
