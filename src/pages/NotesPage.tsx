import React, { useState } from 'react';
import { Upload, FileText, Loader } from 'lucide-react';
import { model } from '../lib/gemini';

export function NotesPage() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const generateNotes = async () => {
    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prompt = `Generate detailed, structured notes from this YouTube video: ${videoUrl}. Format the notes with proper headings, bullet points, and key takeaways.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setNotes(response.text());
    } catch (err) {
      setError('Failed to generate notes. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-gradient rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">Generate Smart Notes</h1>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter YouTube video URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={generateNotes}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Generate Notes</span>
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

      {notes && (
        <div className="card-gradient rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Notes</h2>
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{notes}</pre>
          </div>
        </div>
      )}
    </div>
  );
}