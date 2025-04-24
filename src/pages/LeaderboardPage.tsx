import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Trophy, Users, Medal, ChevronUp, ChevronDown } from 'lucide-react';

interface User {
  id: string;
  displayName: string;
  email: string;
  credits: number;
}

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'global'>('friends');
  const [highlightedUser, setHighlightedUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;

      try {
        const usersRef = collection(db, 'users');
        
        // Fetch all users
        const allUsersSnapshot = await getDocs(usersRef);
        const allUsersData = allUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        
        // Sort by credits
        allUsersData.sort((a, b) => (b.credits || 0) - (a.credits || 0));
        setAllUsers(allUsersData);

        // Fetch current user's friends and include current user
        const currentUserQuery = query(usersRef, where('email', '==', user.email));
        const currentUserSnapshot = await getDocs(currentUserQuery);
        if (!currentUserSnapshot.empty) {
          const currentUserData = currentUserSnapshot.docs[0].data();
          const friendIds = currentUserData.friends || [];
          const currentUserId = currentUserSnapshot.docs[0].id;
          
          // Get friends data and include current user
          const friendsData = allUsersData.filter(user => 
            friendIds.includes(user.id) || user.id === currentUserId
          );
          friendsData.sort((a, b) => (b.credits || 0) - (a.credits || 0));
          setFriends(friendsData);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  const getTrophyColor = (position: number) => {
    switch (position) {
      case 0: // First place
        return "text-yellow-400"; // Gold
      case 1: // Second place
        return "text-gray-300"; // Silver
      case 2: // Third place
        return "text-amber-600"; // Bronze
      default:
        return "text-green-200/50"; // Default color using theme
    }
  };

  const getMedalIcon = (position: number) => {
    if (position <= 2) {
      return <Medal className={`w-5 h-5 ${getTrophyColor(position)}`} />;
    }
    return null;
  };

  const LeaderboardSection = ({ title, icon: Icon, users }: { title: string, icon: any, users: User[] }) => {
    const currentUserEmail = user?.email;
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    
    const toggleSort = () => {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const sortedUsers = [...users].sort((a, b) => {
      const creditsA = a.credits || 0;
      const creditsB = b.credits || 0;
      return sortDirection === 'desc' ? creditsB - creditsA : creditsA - creditsB;
    });

    return (
      <div className="bg-green-100/10 backdrop-blur-lg rounded-xl p-4 border border-green-200/30 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-green-200" />
            <h2 className="text-xl font-bold text-green-50">{title}</h2>
          </div>
          <button 
            onClick={toggleSort}
            className="flex items-center space-x-1 text-green-200 hover:text-green-100 transition-colors duration-200 bg-green-800/20 rounded-lg px-3 py-1"
          >
            <span className="text-sm">Sort</span>
            {sortDirection === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-green-200/30 scrollbar-track-transparent pr-1 flex-grow" style={{ maxHeight: "400px" }}>
          <div className="space-y-2">
            {sortedUsers.map((userData, index) => {
              const isCurrentUser = userData.email === currentUserEmail;
              const isExpanded = expandedUser === userData.id;
              
              return (
                <div
                  key={userData.id}
                  className={`p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isCurrentUser 
                      ? 'bg-green-200/20 border border-green-200/50 hover:bg-green-200/30' 
                      : 'bg-green-50/5 border border-green-200/20 hover:bg-green-50/10'
                  } ${highlightedUser === userData.id ? 'ring-2 ring-green-300/70' : ''}`}
                  onClick={() => {
                    setExpandedUser(isExpanded ? null : userData.id);
                    setHighlightedUser(userData.id);
                    setTimeout(() => setHighlightedUser(null), 1500);
                  }}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-800/30 flex items-center justify-center">
                      {getMedalIcon(index) || (
                        <span className="font-bold text-green-50">{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-3 flex-grow">
                      <h3 className={`font-semibold truncate ${
                        isCurrentUser ? 'text-green-200' : 'text-green-50'
                      }`}>
                        {userData.displayName}
                        {isCurrentUser && <span className="ml-2 text-xs bg-green-700/50 px-2 py-0.5 rounded-full">You</span>}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Trophy className={`w-4 h-4 ${getTrophyColor(index)}`} />
                      <span className={`font-bold ${
                        isCurrentUser ? 'text-green-200' : 'text-green-50'
                      }`}>
                        {userData.credits || 0}
                      </span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-green-200/20 text-green-50/70 text-sm">
                      <p className="mb-1">Email: {userData.email}</p>
                      <p>Rank: #{index + 1} on the leaderboard</p>
                    </div>
                  )}
                </div>
              );
            })}
            
            {sortedUsers.length === 0 && (
              <div className="text-center text-green-50/60 py-8 bg-green-800/10 rounded-lg border border-dashed border-green-200/20">
                {title === "Friends Leaderboard" 
                  ? "No friends added yet" 
                  : "No users found"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TabSelector = () => {
    return (
      <div className="flex space-x-1 bg-green-900/30 rounded-lg p-1 mb-4 md:hidden">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'friends' 
              ? 'bg-green-200/20 text-green-100' 
              : 'text-green-200/70 hover:text-green-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Friends</span>
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'global' 
              ? 'bg-green-200/20 text-green-100' 
              : 'text-green-200/70 hover:text-green-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Global</span>
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin w-12 h-12 border-3 border-green-200 border-t-transparent rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-200/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <TabSelector />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${activeTab === 'friends' || window.innerWidth >= 768 ? 'block' : 'hidden'}`}>
          <LeaderboardSection
            title="Friends Leaderboard"
            icon={Users}
            users={friends}
          />
        </div>
        <div className={`${activeTab === 'global' || window.innerWidth >= 768 ? 'block' : 'hidden'}`}>
          <LeaderboardSection
            title="Global Leaderboard"
            icon={Trophy}
            users={allUsers}
          />
        </div>
      </div>
    </div>
  );
}