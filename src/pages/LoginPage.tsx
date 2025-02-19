import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, initializeUserInFirestore } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../lib/store';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="relative">
        <div className="absolute inset-0 gradient-blur"></div>
        
        <div className="relative z-10 card-gradient p-8 rounded-xl border border-gray-800 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Welcome Back</h2>
          
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500 text-red-500">
              {error}
            </div>
          )}
          
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            <span>Continue with Google</span>
          </button>
          
          <p className="mt-6 text-center text-gray-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-purple-500 hover:text-purple-400">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-purple-500 hover:text-purple-400">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}