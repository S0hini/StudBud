import React, { useState } from 'react';
import { Search, Loader, Video } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface VideoSuggestion {
  title: string;
  url: string;
  description: string;
}

export function LecturesPage() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>([]);
  const [error, setError] = useState('');

  const findLectures = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Initialize the Gemini API with your API key
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '');
      
      // For Gemini 1.5 Pro or other latest models
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `Find 5 relevant educational YouTube videos about: ${query}. For each video, provide the title, URL, and a brief description. Format the response as JSON array with properties: title, url, description.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response.text();
      
      try {
        const videos = JSON.parse(response);
        setSuggestions(videos);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the text response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const videos = JSON.parse(jsonMatch[0]);
          setSuggestions(videos);
        } else {
          throw new Error("Failed to parse response as JSON");
        }
      }
    } catch (err) {
      setError('Failed to find lectures. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 mb-8">
        <h1 className="text-2xl font-bold mb-4 text-[#B3D8A8]">Find Relevant Lectures</h1>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter your topic"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:outline-none"
            />
          </div>
          <button
            onClick={findLectures}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Find Lectures</span>
              </>
            )}
          </button>
          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500">
              {error}
            </div>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((video, index) => (
            <div key={index} className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30">
              <div className="flex items-start space-x-4">
                <Video className="w-8 h-8 text-[#B3D8A8] flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2 text-[#B3D8A8]">{video.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{video.description}</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B3D8A8] hover:text-[#82A878] text-sm"
                  >
                    Watch Video →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}