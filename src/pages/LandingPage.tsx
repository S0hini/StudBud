import React from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white -ml-4">
      {/* Hero Section */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-8xl font-semibold mb-5 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#B3D8A8] to-[#82A878]">
            Transform your learning experience.
          </h1>
          <p className="text-xl md:text-2xl text-[#B3D8A8]/70 max-w-3xl mx-auto leading-relaxed">
            Harness the power of AI to enhance your academic journey with personalized notes,
            curated video lectures, and interactive quizzes.
          </p>
        </div>
      </div>

      {/* Call to action - Changed from purple to sage theme */}
      <div className="bg-black py-24 px-6 mt-16">
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