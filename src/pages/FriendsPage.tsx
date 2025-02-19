import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  orderBy, 
  getDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Search, UserPlus, UserMinus, Send, MessageCircle } from 'lucide-react';
import { Chat } from '../components/Chat';

interface User {
  id: string;
  displayName: string;
  email: string;
  credits: number;
  photoURL: string; // Add this line
  friends: string[];
  friendRequests: {
    sent: string[];
    received: string[];
  };
}

export function FriendsPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;

      try {
        const usersRef = collection(db, 'users');
        
        // First, initialize friend requests for all users
        const initSnapshot = await getDocs(usersRef);
        const batch = writeBatch(db);
        let needsInitialization = false;
        
        initSnapshot.docs.forEach((doc) => {
          const userData = doc.data();
          if (!userData.friendRequests) {
            needsInitialization = true;
            const userRef = doc.ref;
            batch.update(userRef, {
              friends: userData.friends || [],
              friendRequests: {
                sent: [],
                received: []
              }
            });
          }
        });

        if (needsInitialization) {
          await batch.commit();
          console.log('Successfully initialized friend requests for all users');
        }

        // Then fetch users as before
        const q = query(
          usersRef,
          orderBy('email')
        );
        
        const snapshot = await getDocs(q);
        const userData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            photoURL: doc.data().photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.data().displayName)}&background=random` // Fallback avatar
          } as User))
          .filter(u => u.email !== user.email);
        
        setUsers(userData);

        // Fetch current user's data
        const currentUserQuery = query(usersRef, where('email', '==', user.email));
        const currentUserSnapshot = await getDocs(currentUserQuery);
        if (!currentUserSnapshot.empty) {
          setCurrentUserData({
            id: currentUserSnapshot.docs[0].id,
            ...currentUserSnapshot.docs[0].data()
          } as User);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  const toggleFriend = async (friendId: string) => {
    if (!currentUserData) return;

    const isFriend = currentUserData.friends?.includes(friendId);
    const hasSentRequest = currentUserData.friendRequests?.sent?.includes(friendId);
    const hasReceivedRequest = currentUserData.friendRequests?.received?.includes(friendId);
    const userRef = doc(db, 'users', currentUserData.id);
    const friendRef = doc(db, 'users', friendId);

    try {
      if (isFriend) {
        // Remove friend
        await updateDoc(userRef, {
          friends: arrayRemove(friendId)
        });
        await updateDoc(friendRef, {
          friends: arrayRemove(currentUserData.id)
        });
      } else if (hasReceivedRequest) {
        // Accept friend request
        await updateDoc(userRef, {
          'friendRequests.received': arrayRemove(friendId),
          friends: arrayUnion(friendId)
        });
        await updateDoc(friendRef, {
          'friendRequests.sent': arrayRemove(currentUserData.id),
          friends: arrayUnion(currentUserData.id)
        });
      } else if (hasSentRequest) {
        // Cancel friend request
        await updateDoc(userRef, {
          'friendRequests.sent': arrayRemove(friendId)
        });
        await updateDoc(friendRef, {
          'friendRequests.received': arrayRemove(currentUserData.id)
        });
      } else {
        // Send friend request
        await updateDoc(userRef, {
          'friendRequests.sent': arrayUnion(friendId)
        });
        await updateDoc(friendRef, {
          'friendRequests.received': arrayUnion(currentUserData.id)
        });
      }

      // Refresh current user data
      const updatedUserDoc = await getDoc(userRef);
      if (updatedUserDoc.exists()) {
        setCurrentUserData({
          id: updatedUserDoc.id,
          ...updatedUserDoc.data()
        } as User);
      }
    } catch (err) {
      console.error('Error updating friend status:', err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="card-gradient rounded-xl p-6 mb-8">
            <h1 className="text-2xl font-bold mb-4">Find Friends</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userData) => (
                <div key={userData.id} className="card-gradient rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={userData.photoURL}
                        alt={userData.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=random`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{userData.displayName}</h3>
                          {currentUserData?.friends?.includes(userData.id) && (
                            <span className="text-purple-500 text-xs bg-purple-500/10 px-2 py-0.5 rounded">
                              Friend
                            </span>
                          )}
                          {currentUserData?.friendRequests?.sent?.includes(userData.id) && (
                            <span className="text-yellow-500 text-xs bg-yellow-500/10 px-2 py-0.5 rounded">
                              Pending
                            </span>
                          )}
                          {currentUserData?.friendRequests?.received?.includes(userData.id) && (
                            <span className="text-green-500 text-xs bg-green-500/10 px-2 py-0.5 rounded">
                              Incoming
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{userData.email}</p>
                        <p className="text-yellow-500 text-sm mt-1">
                          {userData.credits} credits
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {currentUserData?.friendRequests?.received?.includes(userData.id) ? (
                        // Show Accept and Decline buttons for incoming requests
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleFriend(userData.id)}
                            className="px-3 py-1 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => toggleFriend(userData.id)}
                            className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        // Show Add/Remove friend or Cancel Request button
                        <button
                          onClick={() => toggleFriend(userData.id)}
                          className="p-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                        >
                          {currentUserData?.friends?.includes(userData.id) ? (
                            <UserMinus className="w-5 h-5" />
                          ) : currentUserData?.friendRequests?.sent?.includes(userData.id) ? (
                            <span className="text-sm px-2">Cancel Request</span>
                          ) : (
                            <UserPlus className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      
                      {currentUserData?.friends?.includes(userData.id) && (
                        <>
                          <button
                            onClick={() => {/* Challenge friend logic */}}
                            className="p-2 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSelectedFriend({ id: userData.id, name: userData.displayName })}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat section */}
        <div>
          {selectedFriend ? (
            currentUserData?.friends?.includes(selectedFriend.id) ? (
              <div className="card-gradient rounded-xl overflow-hidden">
                <Chat friendId={selectedFriend.id} friendName={selectedFriend.name} />
              </div>
            ) : (
              <div className="card-gradient rounded-xl p-6 h-[400px] flex items-center justify-center">
                <p className="text-gray-400">You can only chat with accepted friends</p>
              </div>
            )
          ) : (
            <div className="card-gradient rounded-xl p-6 h-[400px] flex items-center justify-center">
              <p className="text-gray-400">Select a friend to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}