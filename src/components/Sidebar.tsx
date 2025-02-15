import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Video, 
  Brain, 
  Users, 
  Trophy, 
  Coins,
  Menu
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
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 text-gray-400 hover:text-white transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className={cn(
        "w-64 h-screen bg-black/50 backdrop-blur-md border-r border-gray-800 fixed left-0 top-0 pt-16 transition-transform duration-300 ease-in-out z-40",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <nav className="mt-8">
          {menuItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors",
                location.pathname === path && "text-white bg-white/5"
              )}
              onClick={() => setIsOpen(false)}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}