import { create } from 'zustand';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthState {
  user: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),

  signIn: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Debug logs
      console.log("Google Sign In Result:", {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      });

      // Create or update user document with Google profile data
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL || '',
        credits: userDoc.exists() ? userDoc.data().credits : 0,
        totalQuizzesTaken: userDoc.exists() ? userDoc.data().totalQuizzesTaken : 0,
        totalCreditsEarned: userDoc.exists() ? userDoc.data().totalCreditsEarned : 0,
        friends: userDoc.exists() ? userDoc.data().friends : [],
        friendRequests: userDoc.exists() ? userDoc.data().friendRequests : { sent: [], received: [] },
        lastLogin: new Date(),
      };

      if (!userDoc.exists()) {
        userData.createdAt = new Date();
      }

      // Debug log before saving
      console.log("About to save user data:", userData);

      await setDoc(userRef, userData, { merge: true });

      // Verify the save
      const verifyDoc = await getDoc(userRef);
      console.log("Verified saved data:", verifyDoc.data());

      set({ user });
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
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