import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAsQGCW95L50zMzqC8OkaGJw2r-3JO1gaY",
  authDomain: "study-af334.firebaseapp.com",
  projectId: "study-af334",
  storageBucket: "study-af334.firebasestorage.app",
  messagingSenderId: "1020259530322",
  appId: "1:1020259530322:web:85f070a32569746560d18b",
  measurementId: "G-70KWXFSNJJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize user in Firestore after sign in
export const initializeUserInFirestore = async (user: any) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      credits: 100, // Starting credits
      friends: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      totalQuizzesTaken: 0,
      totalCreditsEarned: 0
    });
  } else {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
  }
};