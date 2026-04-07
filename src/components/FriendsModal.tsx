import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, Activity as ActivityIcon, Search, Check, Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const { user, profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'activity'>('friends');
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Listen to friends
    const friendsRef = collection(db, 'users', user.uid, 'friends');
    const unsubscribeFriends = onSnapshot(friendsRef, async (snapshot) => {
      const friendsData = snapshot.docs.map(doc => doc.data());
      
      // Fetch friend profiles
      const friendProfiles = await Promise.all(
        friendsData.map(async (f) => {
          const profileDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', f.friendUid)));
          if (!profileDoc.empty) {
            return { ...f, profile: profileDoc.docs[0].data() };
          }
          return f;
        })
      );
      setFriends(friendProfiles);
    });

    // Listen to activities (for simplicity, we'll just fetch recent global activities, but ideally filter by friends)
    // Since we don't have a complex backend, we can fetch recent activities and filter client-side or just show a global feed for now.
    // Let's fetch recent activities
    const activitiesRef = collection(db, 'activities');
    const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeActivities = onSnapshot(q, async (snapshot) => {
      const acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch profiles for activities
      const actsWithProfiles = await Promise.all(
        acts.map(async (act: any) => {
          const profileDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', act.userId)));
          if (!profileDoc.empty) {
            return { ...act, profile: profileDoc.docs[0].data() };
          }
          return act;
        })
      );
      setActivities(actsWithProfiles);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeActivities();
    };
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode || searchCode.length !== 6) return;
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const q = query(collection(db, 'users'), where('friendCode', '==', searchCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const foundUser = querySnapshot.docs[0].data();
        if (foundUser.uid !== user?.uid) {
          setSearchResult(foundUser);
        }
      }
    } catch (error) {
      console.error("Error searching for friend:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !searchResult) return;
    
    try {
      // Add to current user's friends
      await setDoc(doc(db, 'users', user.uid, 'friends', searchResult.uid), {
        friendUid: searchResult.uid,
        status: 'accepted',
        timestamp: new Date()
      });
      
      // Add to friend's friends
      await setDoc(doc(db, 'users', searchResult.uid, 'friends', user.uid), {
        friendUid: user.uid,
        status: 'accepted',
        timestamp: new Date()
      });
      
      setSearchResult(null);
      setSearchCode('');
      setActiveTab('friends');
    } catch (error) {
      console.error("Error adding friend:", error);
    }
  };

  const renderActivityDetails = (activity: any) => {
    switch (activity.type) {
      case 'level_up':
        return `reached level ${JSON.parse(activity.details).level}!`;
      case 'challenge':
        return `completed a daily challenge!`;
      case 'best_time':
        const details = JSON.parse(activity.details);
        return `finished a ${details.difficulty} ${activity.game} deck in ${details.time} seconds!`;
      case 'achievement':
        return `unlocked the ${JSON.parse(activity.details).achievementName} badge!`;
      default:
        return 'did something cool!';
    }
  };

  // Filter activities to only show friends and self
  const friendUids = friends.map(f => f.friendUid);
  if (user) friendUids.push(user.uid);
  const filteredActivities = activities.filter(a => friendUids.includes(a.userId));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Social
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'friends' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <Users className="w-4 h-4" /> Friends
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'add' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <UserPlus className="w-4 h-4" /> Add Friend
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'activity' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <ActivityIcon className="w-4 h-4" /> Activity
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>You haven't added any friends yet.</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.friendUid} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-4">
                      {friend.profile?.photoURL ? (
                        <img src={friend.profile.photoURL} alt="Profile" className="w-12 h-12 rounded-full border border-slate-600" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                          {friend.profile?.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-white font-medium">{friend.profile?.displayName || 'Unknown User'}</h4>
                        <p className="text-sm text-slate-400">Level {friend.profile?.level || 1}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-8">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 text-center">
                <p className="text-slate-300 mb-2">Your Friend Code</p>
                <div className="text-3xl font-mono font-bold text-indigo-400 tracking-widest">
                  {profile?.friendCode}
                </div>
                <p className="text-sm text-slate-500 mt-2">Share this code with others so they can add you.</p>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">Search by Friend Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono uppercase focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={searchCode.length !== 6 || isSearching}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </form>

              {searchResult && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4">
                    {searchResult.photoURL ? (
                      <img src={searchResult.photoURL} alt="Profile" className="w-12 h-12 rounded-full border border-slate-600" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {searchResult.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-medium">{searchResult.displayName}</h4>
                      <p className="text-sm text-slate-400">Level {searchResult.level}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddFriend}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Add
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ActivityIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No recent activity from your friends.</p>
                </div>
              ) : (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="mt-1">
                      {activity.profile?.photoURL ? (
                        <img src={activity.profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-slate-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                          {activity.profile?.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-300">
                        <span className="font-semibold text-white">{activity.profile?.displayName || 'Unknown User'}</span>{' '}
                        {renderActivityDetails(activity)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
