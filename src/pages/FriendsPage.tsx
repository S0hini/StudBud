import React, { useState, useEffect, useRef } from 'react';
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
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { Search, UserPlus, UserMinus, Send, MessageCircle, X, Users, ChevronLeft, Swords } from 'lucide-react';
import { Chat } from '../components/Chat';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  displayName: string;
  email: string;
  credits: number;
  photoURL: string;
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
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; photoURL?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'friends' | 'chat'>('friends');
  const [filter, setFilter] = useState<'all' | 'friends' | 'pending' | 'received'>('all');
  const [pendingChallenges, setPendingChallenges] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;

      try {
        const usersRef = collection(db, 'users');
        
        // Initialize friend requests for all users
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

        // Fetch users
        const q = query(
          usersRef,
          orderBy('email')
        );
        
        const snapshot = await getDocs(q);
        const userData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            photoURL: doc.data().photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.data().displayName)}&background=random`
          } as User))
          .filter(u => u.email !== user.email);
        
        setUsers(userData);

        // Fetch current user's data
        const currentUserQuery = query(usersRef, where('email', '==', user.email));
        const currentUserSnapshot = await getDocs(currentUserQuery);
        if (!currentUserSnapshot.empty) {
          setCurrentUserData({
            id: currentUserSnapshot.docs[0].id,
            ...currentUserSnapshot.docs[0].data(),
            photoURL: currentUserSnapshot.docs[0].data().photoURL || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserSnapshot.docs[0].data().displayName)}&background=random`
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

  useEffect(() => {
    const fetchBattles = async () => {
      if (!currentUserData) return;
      
      try {
        const battlesRef = collection(db, 'battles');
        const q = query(
          battlesRef,
          where('challenger.id', '==', currentUserData.id),
          where('status', '==', 'pending')
        );
        
        const snapshot = await getDocs(q);
        const pendingIds = snapshot.docs.map(doc => doc.data().opponent.id);
        setPendingChallenges(pendingIds);
      } catch (error) {
        console.error('Error fetching pending battles:', error);
      }
    };
    
    if (currentUserData) {
      fetchBattles();
    }
  }, [currentUserData]);

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
        
        // If currently chatting with this friend, close the chat
        if (selectedFriend?.id === friendId) {
          setSelectedFriend(null);
          setViewMode('friends');
        }
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
          ...updatedUserDoc.data(),
          photoURL: updatedUserDoc.data().photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUserDoc.data().displayName)}&background=random`
        } as User);
      }
    } catch (err) {
      console.error('Error updating friend status:', err);
    }
  };

  const challengeFriend = async (friendId: string, friendName: string) => {
    if (!currentUserData) return;
    
    try {
      // Create a new battle in Firestore
      const battleData = {
        createdAt: new Date(),
        status: 'pending',
        challenger: {
          id: currentUserData.id,
          name: currentUserData.displayName,
          photoURL: currentUserData.photoURL,
        },
        opponent: {
          id: friendId,
          name: friendName,
          photoURL: users.find(u => u.id === friendId)?.photoURL,
        },
        scores: {
          [currentUserData.id]: 0,
          [friendId]: 0
        }
      };
      
      // Add to the battles collection
      const battleRef = await addDoc(collection(db, 'battles'), battleData);
      
      // Notify the friend about the challenge via their notifications collection
      await addDoc(collection(db, 'users', friendId, 'notifications'), {
        type: 'challenge',
        senderId: currentUserData.id,
        senderName: currentUserData.displayName,
        battleId: battleRef.id,
        read: false,
        createdAt: new Date()
      });
      
      // Add to pending challenges state
      setPendingChallenges(prev => [...prev, friendId]);
      
      // Navigate to the quiz battle page
      navigate(`/quiz-battle/${battleRef.id}`);
    } catch (err) {
      console.error('Error challenging friend:', err);
    }
  };

  const openChat = (userData: User) => {
    setSelectedFriend({ 
      id: userData.id, 
      name: userData.displayName,
      photoURL: userData.photoURL
    });
    setViewMode('chat');
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filter) {
      case 'friends':
        return currentUserData?.friends?.includes(user.id);
      case 'pending':
        return currentUserData?.friendRequests?.sent?.includes(user.id);
      case 'received':
        return currentUserData?.friendRequests?.received?.includes(user.id);
      default:
        return true;
    }
  });

  const getFilterCount = (filterType: 'all' | 'friends' | 'pending' | 'received') => {
    if (!currentUserData) return 0;
    
    switch (filterType) {
      case 'friends':
        return currentUserData.friends?.length || 0;
      case 'pending':
        return currentUserData.friendRequests?.sent?.length || 0;
      case 'received':
        return currentUserData.friendRequests?.received?.length || 0;
      case 'all':
        return users.length;
      default:
        return 0;
    }
  };

  const FilterButton = ({ 
    type, 
    label 
  }: { 
    type: 'all' | 'friends' | 'pending' | 'received', 
    label: string 
  }) => {
    const count = getFilterCount(type);
    const isActive = filter === type;
    
    return (
      <button
        onClick={() => setFilter(type)}
        className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1.5 transition-colors ${
          isActive 
            ? 'bg-purple-500/20 text-purple-400 font-medium' 
            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
        }`}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-purple-500/30' : 'bg-gray-700'
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 h-full">
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Friends List */}
        <div className={`flex flex-col ${viewMode === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="card-gradient rounded-xl p-4 mb-4">
            <h1 className="text-xl md:text-2xl font-bold mb-3">Find Friends</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <FilterButton type="all" label="All" />
              <FilterButton type="friends" label="Friends" />
              <FilterButton type="pending" label="Sent" />
              <FilterButton type="received" label="Received" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent pr-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
              {filteredUsers.length > 0 ? (
                <div className="space-y-3">
                  {filteredUsers.map((userData) => {
                    const isFriend = currentUserData?.friends?.includes(userData.id);
                    const hasSentRequest = currentUserData?.friendRequests?.sent?.includes(userData.id);
                    const hasReceivedRequest = currentUserData?.friendRequests?.received?.includes(userData.id);
                    
                    return (
                      <div 
                        key={userData.id} 
                        className={`card-gradient rounded-xl p-4 transition-shadow hover:shadow-lg ${
                          selectedFriend?.id === userData.id ? 'ring-2 ring-purple-500/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <img
                              src={userData.photoURL}
                              alt={userData.displayName}
                              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-purple-500/30 flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=random`;
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold truncate">{userData.displayName}</h3>
                                {isFriend && (
                                  <span className="text-purple-500 text-xs bg-purple-500/10 px-2 py-0.5 rounded">
                                    Friend
                                  </span>
                                )}
                                {hasSentRequest && (
                                  <span className="text-yellow-500 text-xs bg-yellow-500/10 px-2 py-0.5 rounded">
                                    Pending
                                  </span>
                                )}
                                {hasReceivedRequest && (
                                  <span className="text-green-500 text-xs bg-green-500/10 px-2 py-0.5 rounded">
                                    Incoming
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs sm:text-sm truncate">{userData.email}</p>
                              <p className="text-yellow-500 text-xs sm:text-sm mt-1">
                                {userData.credits} credits
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-1 md:space-x-2 ml-2 flex-shrink-0">
                            {hasReceivedRequest ? (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => toggleFriend(userData.id)}
                                  className="px-2 py-1 text-xs md:text-sm rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => toggleFriend(userData.id)}
                                  className="px-2 py-1 text-xs md:text-sm rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => toggleFriend(userData.id)}
                                className="p-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                                title={isFriend ? "Remove Friend" : hasSentRequest ? "Cancel Request" : "Add Friend"}
                              >
                                {isFriend ? (
                                  <UserMinus className="w-4 h-4 md:w-5 md:h-5" />
                                ) : hasSentRequest ? (
                                  <span className="text-xs px-1">Cancel</span>
                                ) : (
                                  <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                                )}
                              </button>
                            )}
                            
                            {isFriend && (
                              <>
                                <button
                                  onClick={() => challengeFriend(userData.id, userData.displayName)}
                                  disabled={pendingChallenges.includes(userData.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    pendingChallenges.includes(userData.id)
                                      ? "bg-gray-700/30 text-gray-500 cursor-not-allowed" 
                                      : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                                  }`}
                                  title={pendingChallenges.includes(userData.id) ? "Challenge Pending" : "Challenge to Quiz Battle"}
                                >
                                  <Swords className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <button
                                  onClick={() => openChat(userData)}
                                  className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                  title="Message"
                                >
                                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-gradient rounded-xl p-8 flex flex-col items-center justify-center">
                  <Users className="w-12 h-12 text-gray-500 mb-4" />
                  {searchQuery ? (
                    <p className="text-gray-400 text-center">No users found for "{searchQuery}"</p>
                  ) : (
                    <p className="text-gray-400 text-center">
                      {filter === 'friends' ? "You haven't added any friends yet" :
                      filter === 'pending' ? "No pending requests" :
                      filter === 'received' ? "No incoming requests" :
                      "No users found"}
                    </p>
                  )}
                  {searchQuery && (
                    <button 
                      onClick={clearSearch}
                      className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat section */}
        <div className={`flex flex-col ${viewMode === 'friends' ? 'hidden lg:flex' : 'flex'}`}>
          {selectedFriend ? (
            currentUserData?.friends?.includes(selectedFriend.id) ? (
              <div className="card-gradient rounded-xl overflow-hidden flex flex-col h-full">
                <div className="flex items-center justify-between bg-black/30 p-3 border-b border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    {viewMode === 'chat' && (
                      <button 
                        onClick={() => setViewMode('friends')}
                        className="p-1.5 rounded-lg hover:bg-gray-800/50 lg:hidden"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    <img
                      src={selectedFriend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.name)}&background=random`}
                      alt={selectedFriend.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <h3 className="font-medium">{selectedFriend.name}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedFriend(null);
                      setViewMode('friends');
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-800/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-grow overflow-hidden">
                  <Chat friendId={selectedFriend.id} friendName={selectedFriend.name} />
                </div>
              </div>
            ) : (
              <div className="card-gradient rounded-xl p-6 h-full flex flex-col items-center justify-center">
                <p className="text-gray-400">You can only chat with accepted friends</p>
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    setViewMode('friends');
                  }}
                  className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors lg:hidden"
                >
                  Back to Friends
                </button>
              </div>
            )
          ) : (
            <div className="card-gradient rounded-xl p-6 h-full flex flex-col items-center justify-center">
              <MessageCircle className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-center">Select a friend to start chatting</p>
              <button
                onClick={() => setViewMode('friends')}
                className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors lg:hidden"
              >
                Back to Friends
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}