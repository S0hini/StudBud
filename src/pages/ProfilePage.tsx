import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { User, Trophy, Clock, Book, Users, Coins } from 'lucide-react';

interface UserProfile {
  displayName: string;
  email: string;
  credits: number;
  totalQuizzesTaken: number;
  totalCreditsEarned: number;
  createdAt: any;
  lastLogin: any;
}

export function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
          setDisplayName(userDoc.data().displayName);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName
      });
      setProfile(prev => prev ? { ...prev, displayName } : null);
      setEditMode(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) return null;

  const stats = [
    { icon: Trophy, label: 'Quizzes Taken', value: profile.totalQuizzesTaken },
    { icon: Coins, label: 'Total Credits Earned', value: profile.totalCreditsEarned },
    { icon: Users, label: 'Current Credits', value: profile.credits },
    { icon: Clock, label: 'Member Since', value: new Date(profile.createdAt?.toDate()).toLocaleDateString() }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-gradient rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <User className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              {editMode ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="px-3 py-1 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={updateProfile}
                    className="px-4 py-1 rounded-lg bg-purple-500 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-1 rounded-lg bg-gray-800 text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-1 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                  >
                    <Book className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-gray-400">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="p-4 rounded-lg bg-black/30 border border-gray-800">
              <div className="flex items-center space-x-3">
                <stat.icon className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}