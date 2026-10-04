import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { Github, Loader } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithGithub } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoadingProvider('google');
      await signInWithGoogle();
      navigate('/notes');
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setError(null);
      setLoadingProvider('github');
      await signInWithGithub();
      navigate('/notes');
    } catch (err: any) {
      console.error('GitHub login error:', err);
      setError(err?.message || 'Failed to sign in with GitHub. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 gradient-blur"></div>
        
        <div className="relative z-10 p-8 rounded-2xl bg-gradient-to-b from-black/80 to-black/50 backdrop-blur-lg border border-[#B3D8A8]/30 w-full shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#B3D8A8] to-[#82A878] mb-2">
              StudBud
            </h1>
            <h2 className="text-xl font-medium text-gray-200">Welcome Back</h2>
            <p className="text-sm text-[#B3D8A8]/70 mt-1">Sign in to continue your learning journey</p>
          </div>
          
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-3.5">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={!!loadingProvider}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-semibold hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50"
            >
              {loadingProvider === 'google' ? (
                <Loader className="w-5 h-5 animate-spin text-black" />
              ) : (
                <img 
                  src="https://www.google.com/favicon.ico" 
                  alt="Google" 
                  className="w-5 h-5"
                />
              )}
              <span>Continue with Google</span>
            </button>

            {/* GitHub Sign In Button */}
            <button
              onClick={handleGithubSignIn}
              disabled={!!loadingProvider}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-white font-medium hover:bg-zinc-800 active:scale-[0.99] transition-all flex items-center justify-center space-x-3 shadow-md disabled:opacity-50"
            >
              {loadingProvider === 'github' ? (
                <Loader className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Github className="w-5 h-5 text-white" />
              )}
              <span>Continue with GitHub</span>
            </button>
          </div>
          
          <p className="mt-8 text-center text-xs text-[#B3D8A8]/60 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#B3D8A8] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#B3D8A8] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}