import React from 'react';
import { useAuthStore } from '../lib/store';
import { Coins, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { credits, user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

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
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">{credits}</span>
              </div>
              
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">{user.displayName}</span>
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