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
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get Google-specific provider data
      const googleUser = user.providerData.find(
        (provider) => provider.providerId === 'google.com'
      );

      // Get photo URL and create a proxy URL to bypass ad blockers
      let photoURL = googleUser?.photoURL || user.photoURL;
      if (photoURL) {
        // Use a proxy service to bypass ad blockers
        photoURL = `https://images.weserv.nl/?url=${encodeURIComponent(photoURL)}`;
      }

      console.log('Proxied Photo URL:', photoURL);

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: photoURL,
        credits: userDoc.exists() ? userDoc.data().credits : 0,
        totalQuizzesTaken: userDoc.exists() ? userDoc.data().totalQuizzesTaken : 0,
        totalCreditsEarned: userDoc.exists() ? userDoc.data().totalCreditsEarned : 0,
        friends: userDoc.exists() ? userDoc.data().friends : [],
        friendRequests: userDoc.exists() ? userDoc.data().friendRequests : { sent: [], received: [] },
        lastLogin: new Date(),
        createdAt: userDoc.exists() ? userDoc.data().createdAt : new Date(),
      };

      await setDoc(userRef, userData, { merge: true });
      set({ user: { ...user, photoURL } });
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