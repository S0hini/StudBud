import { create } from 'zustand';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  AuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthState {
  user: User | null;
  credits: number;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setCredits: (credits: number) => void;
  awardCredits: (amount: number, isQuizCompletion?: boolean) => Promise<void>;
}

const handleAuthSuccess = async (user: User, set: any) => {
  let photoURL = user.photoURL;
  if (photoURL) {
    photoURL = `https://images.weserv.nl/?url=${encodeURIComponent(photoURL)}`;
  } else {
    photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`;
  }

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  const userData = {
    displayName: user.displayName || user.email?.split('@')[0] || 'Student',
    email: user.email || `${user.uid}@github.user`,
    photoURL: photoURL,
    credits: userDoc.exists() ? (userDoc.data().credits ?? 100) : 100,
    totalQuizzesTaken: userDoc.exists() ? (userDoc.data().totalQuizzesTaken ?? 0) : 0,
    totalCreditsEarned: userDoc.exists() ? (userDoc.data().totalCreditsEarned ?? 0) : 0,
    friends: userDoc.exists() ? (userDoc.data().friends ?? []) : [],
    friendRequests: userDoc.exists() ? (userDoc.data().friendRequests ?? { sent: [], received: [] }) : { sent: [], received: [] },
    lastLogin: new Date(),
    createdAt: userDoc.exists() ? userDoc.data().createdAt : new Date(),
    bio: userDoc.exists() ? (userDoc.data().bio ?? '') : '',
  };

  await setDoc(userRef, userData, { merge: true });
  set({ user: { ...user, photoURL, displayName: userData.displayName } });
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  credits: 0,
  loading: true,
  setUser: (user) => {
    set({ user, loading: false });
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          set({ credits: docSnap.data().credits || 0 });
        }
      });
      return () => unsubscribe();
    }
  },
  setCredits: (credits) => set({ credits }),
  awardCredits: async (amount: number, isQuizCompletion = false) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || amount <= 0) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updates: any = {
        credits: increment(amount),
        totalCreditsEarned: increment(amount)
      };
      if (isQuizCompletion) {
        updates.totalQuizzesTaken = increment(1);
      }
      await updateDoc(userRef, updates);
    } catch (err) {
      console.error('Error awarding credits:', err);
    }
  },

  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user, set);
    } catch (error) {
      console.error('Error during Google sign in:', error);
      throw error;
    }
  },

  signInWithGithub: async () => {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('read:user');
      provider.addScope('user:email');

      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user, set);
    } catch (error) {
      console.error('Error during GitHub sign in:', error);
      throw error;
    }
  },

  signIn: async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await handleAuthSuccess(result.user, set);
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null });
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  },
}));

// Set up auth state listener
onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});