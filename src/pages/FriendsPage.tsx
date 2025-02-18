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
            ...doc.data()
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

  // Compute friend requests using the users list
  const friendRequestUsers = {
    received: currentUserData?.friendRequests?.received 
      ? users.filter(u => currentUserData.friendRequests.received.includes(u.id))
      : [],
    sent: currentUserData?.friendRequests?.sent
      ? users.filter(u => currentUserData.friendRequests.sent.includes(u.id))
      : []
  };

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

          {/* Friend Requests section */}
          {(friendRequestUsers.received.length > 0 || friendRequestUsers.sent.length > 0) && (
            <div className="card-gradient rounded-xl p-6 mb-8">
              {friendRequestUsers.received.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-4">Incoming Friend Requests</h2>
                  {friendRequestUsers.received.map((requester) => (
                    <div key={requester.id} className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{requester.displayName}</h3>
                        <p className="text-gray-400 text-sm">{requester.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleFriend(requester.id)}
                          className="px-3 py-1 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => toggleFriend(requester.id)}
                          className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {friendRequestUsers.sent.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-4 mt-6">Pending Requests</h2>
                  {friendRequestUsers.sent.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{recipient.displayName}</h3>
                        <p className="text-gray-400 text-sm">{recipient.email}</p>
                      </div>
                      <button
                        onClick={() => toggleFriend(recipient.id)}
                        className="px-3 py-1 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userData) => (
                <div key={userData.id} className="card-gradient rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{userData.displayName}</h3>
                      <p className="text-gray-400 text-sm">{userData.email}</p>
                      <p className="text-yellow-500 text-sm mt-1">
                        {userData.credits} credits
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleFriend(userData.id)}
                        className="p-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                      >
                        {currentUserData?.friends?.includes(userData.id) ? (
                          <UserMinus className="w-5 h-5" />
                        ) : currentUserData?.friendRequests?.sent?.includes(userData.id) ? (
                          <span className="text-sm px-2">Cancel Request</span>
                        ) : currentUserData?.friendRequests?.received?.includes(userData.id) ? (
                          <span className="text-sm px-2">Accept Request</span>
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                      </button>
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