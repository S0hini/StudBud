import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  isAdmin: boolean;
  credits: number;
  setUser: (user: User | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setCredits: (credits: number) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAdmin: false,
  credits: 0,
  setUser: (user) => set({ user }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setCredits: (credits) => set({ credits })
}));