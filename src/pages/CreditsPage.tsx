import React, { useState, useEffect } from 'react';
import { Zap, Medal, UserPlus, Coins } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function CreditsPage() {
  const { user, credits, setCredits } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [count, setCount] = useState(0);
  
  // Animation triggers
  useEffect(() => {
    setIsVisible(true);
    
    // Animate count up
    const timer = setTimeout(() => {
      const increment = Math.ceil(credits / 50);
      if (count < credits) {
        setCount(prev => Math.min(prev + increment, credits));
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [count, credits]);
  
  const activities = [
    {
      icon: Zap,
      title: 'Take a Quiz',
      description: 'Complete quizzes to earn credits and test your knowledge',
      credits: 10,
      action: 'Start Quiz',
      color: 'purple'
    },
    {
      icon: UserPlus,
      title: 'Challenge Friends',
      description: 'Challenge your friends to quizzes and win their wagered credits',
      credits: '2x Wager',
      action: 'Find Friends',
      color: 'blue'
    },
    {
      icon: Medal,
      title: 'Group Competition',
      description: 'Compete in group quizzes to win the prize pool',
      credits: 'Prize Pool',
      action: 'Join Competition',
      color: 'pink'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12 overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full opacity-30" 
             style={{
               background: 'radial-gradient(circle at 30% 20%, rgba(120, 20, 255, 0.3), transparent 40%), radial-gradient(circle at 70% 60%, rgba(255, 20, 180, 0.3), transparent 40%)',
               animation: 'pulse 15s infinite alternate ease-in-out'
             }}>
        </div>
      </div>
      
      {/* Animated floating shapes */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {[...Array(6)].map((_, i) => {
          const duration = Math.random() * 20 + 10;
          const delay = i * 0.5;
          return (
            <div
              key={i}
              className="absolute rounded-full opacity-20"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 200 + 100}px`,
                height: `${Math.random() * 200 + 100}px`,
                background:
                  i % 2 === 0
                    ? 'radial-gradient(circle, rgba(120, 20, 255, 0.3), transparent)'
                    : 'radial-gradient(circle, rgba(255, 20, 180, 0.3), transparent)',
                animationName: 'float',
                animationDuration: `${duration}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
                animationDirection: 'alternate',
                animationDelay: `${delay}s`
              }}
            />
          );
        })}
      </div>

      {/* Credit Balance - Apple-style component with animation */}
      <div 
        className={`max-w-5xl mx-auto mb-16 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight mb-2">Credits</h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Earn credits by participating in various activities. Use your credits to challenge friends,
              join competitions, or unlock premium features.
            </p>
          </div>
          <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center relative">
              <Coins className="w-6 h-6 text-yellow-400 mr-3" strokeWidth={1.5} style={{animation: 'spin 4s infinite ease-in-out'}} />
              <span className="text-3xl font-medium text-white">{count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Cards - Apple-style grid with animations */}
      <div className="max-w-5xl mx-auto">
        <h2 className={`text-2xl font-semibold mb-8 transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          Earn More
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <div 
              key={index} 
              className={`bg-white/5 backdrop-blur-md rounded-3xl p-8 relative overflow-hidden transition-all duration-1000 transform cursor-pointer ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              style={{ transitionDelay: `${500 + index * 200}ms` }}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Animated gradient background */}
              <div 
                className="absolute inset-0 opacity-0 transition-opacity duration-500" 
                style={{
                  opacity: hoveredCard === index ? 0.2 : 0,
                  background: `radial-gradient(circle at center, ${activity.color === 'purple' ? 'rgba(120, 20, 255, 0.5)' : activity.color === 'blue' ? 'rgba(20, 100, 255, 0.5)' : 'rgba(255, 20, 180, 0.5)'}, transparent 70%)`,
                }}
              />
              
              <div className="relative z-10">
                <activity.icon 
                  className={`w-10 h-10 text-${activity.color}-400 mb-6`} 
                  strokeWidth={1.5} 
                  style={{
                    transform: hoveredCard === index ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.5s ease-out'
                  }}
                />
                <h3 className="text-xl font-semibold mb-3">{activity.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{activity.description}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center bg-yellow-400/10 px-3 py-1 rounded-full">
                    <Coins className="w-4 h-4 text-yellow-400 mr-2" strokeWidth={1.5} />
                    <span className="text-yellow-400 font-medium">{activity.credits}</span>
                  </div>
                  <button
                    onClick={() => {
                      // Redirect to Quiz Page
                      window.location.href = '/quiz';
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors transform hover:scale-105 active:scale-95 transition-all duration-300"
                  >
                    {activity.action}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Global animation styles */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
        
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 30px); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}