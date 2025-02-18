import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  DocumentReference 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Define user data interface
interface UserData {
  displayName: string | null;
  email: string | null;
  credits: number;
  friends: string[];
  createdAt: any; // FirebaseFirestore.FieldValue
  lastLogin: any; // FirebaseFirestore.FieldValue
  totalQuizzesTaken: number;
  totalCreditsEarned: number;
}

// Initialize user in Firestore after sign in
export const initializeUserInFirestore = async (user: User): Promise<void> => {
  const userRef: DocumentReference = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const userData: UserData = {
      displayName: user.displayName,
      email: user.email,
      credits: 100, // Starting credits
      friends: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      totalQuizzesTaken: 0,
      totalCreditsEarned: 0
    };
    
    await setDoc(userRef, userData);
  } else {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
  }
};