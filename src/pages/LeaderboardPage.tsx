import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Trophy, Users } from 'lucide-react';

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

        // Fetch current user's friends
        const currentUserQuery = query(usersRef, where('email', '==', user.email));
        const currentUserSnapshot = await getDocs(currentUserQuery);
        if (!currentUserSnapshot.empty) {
          const friendIds = currentUserSnapshot.docs[0].data().friends || [];
          const friendsData = allUsersData.filter(user => friendIds.includes(user.id));
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

  const LeaderboardSection = ({ title, icon: Icon, users }: { title: string, icon: any, users: User[] }) => (
    <div className="card-gradient rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="w-6 h-6 text-purple-500" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      
      <div className="space-y-4">
        {users.map((userData, index) => (
          <div
            key={userData.id}
            className="flex items-center p-4 rounded-lg bg-black/30 border border-gray-800"
          >
            <div className="flex-shrink-0 w-8 text-center font-bold">
              {index + 1}
            </div>
            <div className="ml-4 flex-grow">
              <h3 className="font-semibold">{userData.displayName}</h3>
              <p className="text-gray-400 text-sm">{userData.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-bold">{userData.credits || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LeaderboardSection
          title="Friends Leaderboard"
          icon={Users}
          users={friends}
        />
        <LeaderboardSection
          title="Global Leaderboard"
          icon={Trophy}
          users={allUsers}
        />
      </div>
    </div>
  );
}