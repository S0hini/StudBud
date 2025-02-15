import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Video, Brain, Trophy } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-20"></div>
        <div className="absolute inset-0 gradient-blur"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">Transform</span> Your Learning Experience
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Harness the power of AI to enhance your academic journey with personalized notes, 
            curated video lectures, and interactive quizzes.
          </p>
          <Link 
            to="/login"
            className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="text-gradient">Features</span> that Empower You
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BookOpen,
                title: 'Smart Notes',
                description: 'Generate comprehensive notes from any video lecture instantly.'
              },
              {
                icon: Video,
                title: 'Video Lectures',
                description: 'Find relevant educational videos based on your study material.'
              },
              {
                icon: Brain,
                title: 'AI Tutor',
                description: 'Get personalized help and explanations whenever you need.'
              },
              {
                icon: Trophy,
                title: 'Learn & Earn',
                description: 'Earn credits by taking quizzes and challenging friends.'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="card-gradient p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <feature.icon className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}