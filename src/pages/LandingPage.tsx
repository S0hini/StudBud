import React from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation - Minimal with sage theme */}
      <nav className="px-8 py-4 backdrop-blur-lg bg-[#B3D8A8]/5 border-b border-[#B3D8A8]/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-medium text-[#B3D8A8]">StudBud</div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-semibold mb-5 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#B3D8A8] to-[#82A878]">
            Transform your learning experience.
          </h1>
          <p className="text-xl md:text-2xl text-[#B3D8A8]/70 max-w-3xl mx-auto leading-relaxed">
            Harness the power of AI to enhance your academic journey with personalized notes,
            curated video lectures, and interactive quizzes.
          </p>
        </div>
      </div>

      {/* Call to action - Changed from purple to sage theme */}
      <div className="bg-gradient-to-br from-[#B3D8A8]/20 to-[#82A878]/20 py-24 px-6 mt-16 border-y border-[#B3D8A8]/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-[#B3D8A8]">
            Ready to elevate your learning?
          </h2>
          <Link
            to="/login"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-all duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </div>
    </div>
  );
}