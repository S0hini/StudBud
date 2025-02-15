import React, { useState } from 'react';
import { Search, Loader, Video, Upload } from 'lucide-react';
import { model } from '../lib/gemini';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Extract text from image using Gemini API
      const result = await model.generateContent([
        {
          role: 'user',
          parts: [{ text: `Extract and summarize the text content from this image: ${downloadURL}` }],
        },
      ]);
      const response = await result.response;
      setQuery(response.text());
    } catch (err) {
      setError('Failed to process the file. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const findLectures = async () => {
    if (!query.trim()) {
      setError('Please enter a search query or upload a document');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prompt = `Find 5 relevant educational YouTube videos about: ${query}. For each video, provide the title, URL, and a brief description. Format the response as JSON array with properties: title, url, description.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const videos = JSON.parse(response.text());
      setSuggestions(videos);
    } catch (err) {
      setError('Failed to find lectures. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-gradient rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">Find Relevant Lectures</h1>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter your topic or paste your notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
            />
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer px-6 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Upload File</span>
              </label>
            </div>
          </div>
          <button
            onClick={findLectures}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
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
            <div key={index} className="card-gradient rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <Video className="w-8 h-8 text-purple-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{video.description}</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-400 text-sm"
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