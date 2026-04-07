import React, { useState, useEffect } from 'react';
import { X, Upload, Wand2, Share2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { cardBack, customCardBacks, setCardBack, addCustomCardBack } = useGameStore();
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [sharingUrl, setSharingUrl] = useState<string | null>(null);
  const [sharedCardBacks, setSharedCardBacks] = useState<any[]>([]);

  useEffect(() => {
    if (user && isOpen) {
      const fetchFriends = async () => {
        const friendsRef = collection(db, 'users', user.uid, 'friends');
        const snapshot = await getDocs(friendsRef);
        const friendsData = snapshot.docs.map(doc => doc.data());
        
        const friendProfiles = await Promise.all(
          friendsData.map(async (f) => {
            const profileDoc = await getDocs(collection(db, 'users'));
            const profile = profileDoc.docs.find(d => d.data().uid === f.friendUid)?.data();
            return { ...f, profile };
          })
        );
        setFriends(friendProfiles);
      };
      
      const fetchSharedCardBacks = async () => {
        const cardBacksRef = collection(db, 'users', user.uid, 'cardBacks');
        const snapshot = await getDocs(cardBacksRef);
        setSharedCardBacks(snapshot.docs.map(doc => doc.data()));
      };

      fetchFriends();
      fetchSharedCardBacks();
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fullPrompt = `${prompt}, playing card back design, symmetrical, vector art, minimalist borders, high contrast, aspect ratio 5:7`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "512px"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          addCustomCardBack(imageUrl);
          setCardBack(imageUrl);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to generate image", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
      setPrompt('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const url = event.target.result as string;
          addCustomCardBack(url);
          setCardBack(url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async (friendUid: string) => {
    if (!user || !sharingUrl) return;
    try {
      const cardBackId = Date.now().toString();
      await setDoc(doc(db, 'users', friendUid, 'cardBacks', cardBackId), {
        imageUrl: sharingUrl,
        name: 'Shared Card Back',
        sharedWith: [user.uid]
      });
      alert('Card back shared successfully!');
      setSharingUrl(null);
    } catch (error) {
      console.error("Error sharing card back:", error);
      alert('Failed to share card back.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Customize Card Back</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          <section>
            <h3 className="text-lg font-medium text-white mb-4">AI Generator</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. cyberpunk neon cityscape"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2"
              >
                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Wand2 className="w-5 h-5" />}
                Generate
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-white mb-4">Upload Image</h3>
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-800/50 transition-colors">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Upload className="w-6 h-6" />
                <span>Click to upload image</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </section>

          <section>
            <h3 className="text-lg font-medium text-white mb-4">Your Card Backs</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              <button 
                onClick={() => setCardBack('default')}
                className={`w-full aspect-[5/7] rounded-xl border-2 ${cardBack === 'default' ? 'border-indigo-500' : 'border-transparent'} bg-gradient-to-br from-indigo-500 to-purple-700 overflow-hidden relative`}
              >
                <div className="absolute inset-2 border-2 border-white/20 rounded-lg opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] bg-repeat" />
              </button>
              
              {customCardBacks.map((url, i) => (
                <div key={i} className="relative group">
                  <button 
                    onClick={() => setCardBack(url)}
                    className={`w-full aspect-[5/7] rounded-xl border-2 ${cardBack === url ? 'border-indigo-500' : 'border-transparent'} overflow-hidden relative`}
                  >
                    <img src={url} alt="Custom card back" className="w-full h-full object-cover" />
                  </button>
                  {user && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSharingUrl(url); }}
                      className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-indigo-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Share with friend"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              
              {sharedCardBacks.map((cb, i) => (
                <div key={`shared-${i}`} className="relative group">
                  <button 
                    onClick={() => setCardBack(cb.imageUrl)}
                    className={`w-full aspect-[5/7] rounded-xl border-2 ${cardBack === cb.imageUrl ? 'border-indigo-500' : 'border-transparent'} overflow-hidden relative`}
                  >
                    <img src={cb.imageUrl} alt="Shared card back" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-1 truncate px-1">
                      From Friend
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {sharingUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Share Card Back</h3>
            {friends.length === 0 ? (
              <p className="text-slate-400 mb-4">You don't have any friends to share with yet.</p>
            ) : (
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {friends.map(friend => (
                  <button
                    key={friend.friendUid}
                    onClick={() => handleShare(friend.friendUid)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    {friend.profile?.photoURL ? (
                      <img src={friend.profile.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {friend.profile?.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-white font-medium">{friend.profile?.displayName || 'Unknown User'}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setSharingUrl(null)}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
