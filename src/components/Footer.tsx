import React from 'react';
import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-black border-t border-[#B3D8A8]/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#B3D8A8]">AI Academic Assistant</h3>
            <p className="text-[#B3D8A8]">Empowering education through AI technology</p>
            <div className="flex space-x-4">
              <a href="#" className="text-[#B3D8A8] hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#B3D8A8] hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#B3D8A8] hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-[#B3D8A8]">Features</h4>
            <ul className="space-y-2 text-[#B3D8A8]">
              <li><a href="#" className="hover:text-white transition-colors">Get Notes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Find Lectures</a></li>
              <li><a href="#" className="hover:text-white transition-colors">AI Tutor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Quiz Creation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-[#B3D8A8]">Community</h4>
            <ul className="space-y-2 text-[#B3D8A8]">
              <li><a href="#" className="hover:text-white transition-colors">Find Friends</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Leaderboard</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Earn Credits</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-[#B3D8A8]">Support</h4>
            <ul className="space-y-2 text-[#B3D8A8]">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[#B3D8A8]/30 text-center text-[#B3D8A8]">
          <p>&copy; {new Date().getFullYear()} AI Academic Assistant. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Example using fetch to call the YouTube Data API v3
const fetchActivities = async () => {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  const oauthToken = import.meta.env.VITE_YOUTUBE_OAUTH_TOKEN;

  const response = await fetch(`https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&key=${apiKey}`, {
    headers: {
      'Authorization': `Bearer ${oauthToken}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error fetching activities:", errorData);
    return;
  }

  const data = await response.json();
  console.log("Activities:", data);
};

fetchActivities();