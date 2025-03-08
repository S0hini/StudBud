import React from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation - Minimal Apple-like */}
      <nav className="px-8 py-4 backdrop-blur-lg bg-black/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-medium">StudBud</div>
        </div>
      </nav>

      {/* Hero Section - Apple-style with large typography */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-semibold mb-5 tracking-tight">
            Transform your learning experience.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Harness the power of AI to enhance your academic journey with personalized notes,
            curated video lectures, and interactive quizzes.
          </p>
        </div>
      </div>

      {/* Call to action - Apple-style */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 py-24 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-8">Ready to elevate your learning?</h2>
          <Link
            to="/login"
            className="inline-block px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </div>
    </div>
  );
}