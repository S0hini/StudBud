import React, { useState } from 'react';
import { Brain, Trophy, Users, Coins } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function CreditsPage() {
  const { user, credits, setCredits } = useAuthStore();
  const [loading, setLoading] = useState(false);



  const activities = [
    {
      icon: Brain,
      title: 'Take a Quiz',
      description: 'Complete quizzes to earn credits and test your knowledge',
      credits: 10,
      action: 'Start Quiz'
    },
    {
      icon: Users,
      title: 'Challenge Friends',
      description: 'Challenge your friends to quizzes and win their wagered credits',
      credits: '2x Wager',
      action: 'Find Friends'
    },
    {
      icon: Trophy,
      title: 'Group Competition',
      description: 'Compete in group quizzes to win the prize pool',
      credits: 'Prize Pool',
      action: 'Join Competition'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-gradient rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Earn Credits</h1>
          <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-yellow-500/10">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-yellow-500">{credits}</span>
          </div>
        </div>
        
        <p className="text-gray-400">
          Earn credits by participating in various activities. Use your credits to challenge friends,
          join competitions, or unlock premium features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activities.map((activity, index) => (
          <div key={index} className="card-gradient rounded-xl p-6">
            <activity.icon className="w-10 h-10 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{activity.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{activity.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500 font-medium">{activity.credits}</span>
              </div>
              <button
                onClick={() => {
                  // Redirect to Quiz Page
                  window.location.href = '/quiz';
                }}


                disabled={loading}
                className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors text-sm font-medium"
              >
                {activity.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
