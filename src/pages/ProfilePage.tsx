import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { User, Trophy, Clock, Book, Users, Coins, X, Check, Pencil } from 'lucide-react';

interface UserProfile {
  displayName: string;
  email: string;
  credits: number;
  totalQuizzesTaken: number;
  totalCreditsEarned: number;
  createdAt: any;
  lastLogin: any;
  photoURL: string;
  bio?: string;
}

export function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [imageError, setImageError] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        console.log("No user found");
        return;
      }

      console.log("Fetching profile for user:", user.uid);

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Fetched user data:', userData);
          console.log('Photo URL from Firestore:', userData.photoURL);
          setProfile(userData as UserProfile);
          setDisplayName(userData.displayName);
          setImageError(false);
          setBio(userData.bio || '');
        } else {
          console.log("No user document found");
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      console.log('Profile updated:', profile);
      console.log('Photo URL:', profile.photoURL);
    }
  }, [profile]);

  console.log('Current profile:', profile);
  console.log('Google user:', user);

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

  const handleSaveBio = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bio
      });
      setProfile(prev => prev ? { ...prev, bio } : null);
      setIsEditingBio(false);
    } catch (err) {
      console.error('Error updating bio:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin w-8 h-8 border-2 border-[#B3D8A8] border-t-transparent rounded-full"></div>
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg p-8 rounded-2xl border border-[#B3D8A8]/30 shadow-lg shadow-[#B3D8A8]/10">
          <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden">
                {!imageError && profile.photoURL ? (
                  <img 
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Image load error:', e);
                      setImageError(true);
                    }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-[#B3D8A8]/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#82A878]">
                      {profile.displayName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                {editMode ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-3 py-1 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:ring-2 focus:ring-[#B3D8A8]/40 focus:outline-none transition-all duration-300"
                    />
                    <button
                      onClick={updateProfile}
                      className="px-4 py-1 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black text-sm font-medium hover:opacity-90 transition-all duration-300"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-1 rounded-lg bg-[#B3D8A8]/5 text-white text-sm hover:bg-[#B3D8A8]/10 transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-bold text-[#B3D8A8]">{profile.displayName}</h2>
                    <button
                      onClick={() => setEditMode(true)}
                      className="p-1 rounded-lg bg-[#B3D8A8]/10 text-[#B3D8A8] hover:bg-[#B3D8A8]/20 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-gray-400">{profile.email}</p>
                <p className="text-sm text-gray-400 mt-1">Profile picture synced with Google account</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-[#FFA725] hover:text-[#FFA725]/80 transition-colors flex items-center space-x-2 ml-auto"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="text-sm">Edit Bio</span>
                </button>
              )}
            </div>
            
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  className="w-full px-4 py-3 rounded-xl bg-[#B3D8A8]/5 backdrop-blur-sm border border-[#B3D8A8]/30 focus:border-[#82A878] focus:ring-2 focus:ring-[#B3D8A8]/40 focus:outline-none transition-all duration-300 resize-none min-h-[120px]"
                  rows={4}
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {500 - bio.length} characters remaining
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setBio(profile.bio || '');
                        setIsEditingBio(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#B3D8A8]/5 text-white hover:bg-[#B3D8A8]/10 transition-all duration-300 flex items-center space-x-2"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveBio}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-all duration-300 flex items-center space-x-2"
                      disabled={loading}
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFF5E4]/5 backdrop-blur-sm rounded-xl p-4 border border-[#B3D8A8]/30">
                <p className="text-[#FFA725] mb-2 font-medium">About Me</p>
                <p className="text-gray-300">
                  {profile.bio || "No bio added yet. Click 'Edit Bio' to add one!"}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="p-4 rounded-xl bg-[#B3D8A8]/5 backdrop-blur-sm border border-[#B3D8A8]/30 hover:shadow-[#B3D8A8]/10 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <stat.icon className="w-5 h-5 text-[#FFA725]" />
                  <div>
                    <p className="text-sm text-[#B3D8A8]">{stat.label}</p>
                    <p className="font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}