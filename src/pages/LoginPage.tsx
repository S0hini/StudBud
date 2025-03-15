import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      navigate('/notes'); // Redirect to the dashboard or any other page after successful login
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="relative">
        <div className="absolute inset-0 gradient-blur"></div>
        
        <div className="relative z-10 p-8 rounded-xl bg-gradient-to-b from-black/80 to-black/50 backdrop-blur-lg border border-[#B3D8A8]/30 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#B3D8A8]">Welcome Back</h2>
          
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500 text-red-500">
              {error}
            </div>
          )}
          
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            <span>Continue with Google</span>
          </button>
          
          <p className="mt-6 text-center text-[#B3D8A8]/70">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#B3D8A8] hover:text-white transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#B3D8A8] hover:text-white transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}