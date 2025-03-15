import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Video,
  Brain,
  Users,
  Trophy,
  Coins,
  Menu,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../lib/store';

const menuItems = [
  { path: '/notes', icon: BookOpen, label: 'Get Notes' },
  { path: '/lectures', icon: Video, label: 'Find a Lecture' },
  { path: '/tutor', icon: Brain, label: 'AI Tutor' },
  { path: '/friends', icon: Users, label: 'Find Friends' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/credits', icon: Coins, label: 'Earn Credits' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, credits, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('sidebar');
      if (windowWidth < 768 && sidebar && !sidebar.contains(event.target) && 
          !event.target.closest('[data-sidebar-toggle]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [windowWidth]);

  const getProfileImage = () => {
    if (user?.photoURL) {
      return user.photoURL.replace('/s96/', '/s400/');
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || '')}&background=random&size=400`;
  };

  if (!user) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/50 backdrop-blur-md border-b border-[#B3D8A8]/30">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#B3D8A8] to-[#82A878]">
            AI Academic Assistant
          </Link>
          <Link 
            to="/login" 
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        data-sidebar-toggle
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/70 text-[#B3D8A8] border border-[#B3D8A8]/30 hover:border-[#B3D8A8]/70 transition-all"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {windowWidth < 768 && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="sidebar"
        className={cn(
          "h-screen bg-gradient-to-b from-black/80 to-black/50 backdrop-blur-lg border-r border-[#B3D8A8]/20 fixed left-0 top-0 w-72 transition-all duration-300 ease-in-out z-40 overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          windowWidth >= 768 ? "w-20 hover:w-72 group" : "w-72"
        )}
      >
        {/* Logo & Branding */}
        <div className="h-24 flex items-center justify-center border-b border-[#B3D8A8]/20">
          <Link to="/" className="relative flex flex-col items-center">
            <span className={cn(
              "text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#B3D8A8] to-[#82A878] transition-all whitespace-nowrap",
              windowWidth >= 768 ? "group-hover:text-2xl opacity-0 group-hover:opacity-100 absolute" : "text-2xl"
            )}>
              AI Academic Assistant
            </span>
            <span className={cn(
              "text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#B3D8A8] to-[#82A878] transition-all",
              windowWidth >= 768 ? "group-hover:opacity-0" : "hidden"
            )}>
              AI
            </span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="px-4 py-6 border-b border-[#B3D8A8]/20">
          <Link 
            to="/profile"
            className="flex items-center space-x-3 group/profile"
          >
            <div className="relative flex-shrink-0">
              <img
                src={getProfileImage()}
                alt={user.displayName || 'Profile'}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#6A9C89]/30 transition-all group-hover/profile:border-[#6A9C89]/70"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '')}&background=random&size=400`;
                }}
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-[#6A9C89]/0 group-hover/profile:ring-[#6A9C89]/50 transition-all"></div>
            </div>
            <div className={cn(
              "flex flex-col overflow-hidden transition-all",
              windowWidth >= 768 ? "w-0 group-hover:w-40" : "w-40"
            )}>
              <span className="font-medium text-white truncate">{user.displayName}</span>
              <span className="text-xs text-[#B3D8A8]/70 truncate">{user.email}</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-[#B3D8A8]/50 transition-all ml-auto",
              windowWidth >= 768 ? "opacity-0 group-hover:opacity-100" : ""
            )} />
          </Link>

          {/* Credits Display */}
          <div className={cn(
            "mt-4 flex items-center space-x-2 bg-gradient-to-r from-[#B3D8A8]/10 to-[#82A878]/10 px-3 py-2 rounded-lg border border-[#B3D8A8]/20 group/credits hover:border-[#B3D8A8]/40 transition-all",
            windowWidth >= 768 ? "justify-center group-hover:justify-start" : ""
          )}>
            <Coins className="w-5 h-5 text-[#B3D8A8] group-hover/credits:text-[#82A878] transition-colors" />
            <div className={cn(
              "flex flex-col transition-all overflow-hidden",
              windowWidth >= 768 ? "w-0 group-hover:w-40" : "w-40"
            )}>
              <div className="flex items-baseline space-x-1">
                <span className="font-bold text-base text-[#B3D8A8] group-hover/credits:text-[#82A878] transition-colors">
                  {credits}
                </span>
                <span className="text-[10px] text-[#B3D8A8]/70">credits</span>
              </div>
              <span className="text-[8px] text-[#B3D8A8]/50">Available Balance</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-2 py-4">
          {menuItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center px-4 py-3 hover:bg-white/5 transition-all",
                location.pathname === path 
                  ? "text-white border-l-4 border-[#B3D8A8]" 
                  : "text-gray-400 hover:text-white border-l-4 border-transparent",
                windowWidth >= 768 ? "justify-center group-hover:justify-start" : ""
              )}
              onClick={() => windowWidth < 768 && setIsOpen(false)}
            >
              <Icon className="w-6 h-6 min-w-6" />
              <span className={cn(
                "ml-3 transition-all overflow-hidden",
                windowWidth >= 768 ? "w-0 group-hover:w-40" : "w-40"
              )}>
                {label}
              </span>
            </Link>
          ))}

          {/* Logout Option */}
          <button
            className={cn(
              "w-full flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all mt-6",
              windowWidth >= 768 ? "justify-center group-hover:justify-start" : ""
            )}
            onClick={() => {
              signOut();
              navigate('/login'); // Redirect to the login page after sign out
            }}
          >
            <LogOut className="w-6 h-6 min-w-6" />
            <span className={cn(
              "ml-3 transition-all overflow-hidden",
              windowWidth >= 768 ? "w-0 group-hover:w-40" : "w-40"
            )}>
              Sign Out
            </span>
          </button>
        </nav>
      </div>

      {/* Main Content Padding Based on Sidebar Width */}
      <div className={cn(
        "transition-all duration-300",
        windowWidth >= 768 ? "ml-20" : isOpen ? "ml-72" : "ml-0"
      )}>
        {/* Your main content goes here */}
      </div>
    </>
  );
}