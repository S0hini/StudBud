import React from 'react';
import { useAuthStore } from '../lib/store';
import { Coins, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  credits: number;
}

export function Navbar() {
  const { credits, user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const getProfileImage = () => {
    if (user?.photoURL) {
      // Get higher resolution image
      return user.photoURL.replace('/s96/', '/s400/');
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || '')}&background=random&size=400`;
  };

  return (
    <div className="h-16 bg-black/50 backdrop-blur-md border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-gradient">AI Academic Assistant</Link>
        </div>
        
        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex items-center space-x-6`}>
          {user ? (
            <>
              <div className="flex items-center space-x-1.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20 group hover:border-yellow-500/40 transition-colors">
                <Coins className="w-4 h-4 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
                <div className="flex flex-col">
                  <div className="flex items-baseline space-x-1">
                    <span className="font-bold text-base text-yellow-500 group-hover:text-yellow-400 transition-colors">
                      {credits}
                    </span>
                    <span className="text-[10px] text-yellow-500/70">credits</span>
                  </div>
                  <span className="text-[8px] text-yellow-500/50">Available Balance</span>
                </div>
              </div>
              
              <Link 
                to="/profile" 
                className="flex items-center space-x-4 text-gray-400 hover:text-white transition-colors group"
              >
                <div className="relative">
                  <img
                    src={getProfileImage()}
                    alt={user.displayName || 'Profile'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30 transition-all group-hover:border-purple-500/70"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '')}&background=random&size=400`;
                    }}
                  />
                  <div className="absolute inset-0 rounded-full ring-2 ring-purple-500/0 group-hover:ring-purple-500/50 transition-all"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{user.displayName}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </Link>
            </>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}