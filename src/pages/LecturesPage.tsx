import React, { useState, useEffect } from 'react';
import { Search, Loader, Video, BookOpen, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoSuggestion {
  title: string;
  url: string;
  description: string;
}

export function LecturesPage() {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>([]);
  const [error, setError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  // Check form validity whenever inputs change
  useEffect(() => {
    setIsFormValid(!!subject.trim() && !!topic.trim());
  }, [subject, topic]);

  const findLectures = async () => {
    if (!isFormValid) {
      setError('Please enter both subject and topic');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      // Initialize the Gemini API with your API key
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '');
      
      // For Gemini 1.5 Pro or other latest models
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `Find 5 relevant educational YouTube videos about ${topic} in the subject of ${subject}. 
      For each video, provide the title, URL, and a brief description. 
      Focus specifically on educational content that would help someone understand ${topic} within the context of ${subject}.
      Format the response as JSON array with properties: title, url, description.`;
      
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

  // Popular subject suggestions
  const popularSubjects = ["Mathematics", "Physics", "Computer Science", "History", "Biology", "Chemistry"];

  // Reset the form
  const resetForm = () => {
    setSubject('');
    setTopic('');
    setSuggestions([]);
    setError('');
    setActiveTab(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <motion.div 
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 mb-8 shadow-lg"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-2 mb-6"
        >
          <BookOpen className="w-6 h-6 text-[#B3D8A8]" />
          <h1 className="text-2xl font-bold text-[#B3D8A8]">Find Relevant Lectures</h1>
        </motion.div>
        
        <div className="space-y-4">
          {/* Subject selection */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[#B3D8A8]">Subject</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {popularSubjects.map((subj, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSubject(subj)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    subject === subj 
                      ? 'bg-[#B3D8A8] text-black' 
                      : 'bg-[#B3D8A8]/20 text-[#B3D8A8] hover:bg-[#B3D8A8]/30'
                  }`}
                >
                  {subj}
                </motion.button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Enter subject (e.g., Physics, Programming, Literature)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:outline-none transition-all focus:ring-2 focus:ring-[#B3D8A8]/20"
            />
          </div>
          
          {/* Topic input */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[#B3D8A8]">Topic</label>
            <input
              type="text"
              placeholder="Enter specific topic (e.g., Quantum Mechanics, React Hooks)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:outline-none transition-all focus:ring-2 focus:ring-[#B3D8A8]/20"
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={findLectures}
              disabled={loading || !isFormValid}
              className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
                isFormValid 
                  ? 'bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black hover:opacity-90'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
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
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetForm}
              className="px-6 py-3 rounded-lg bg-[#B3D8A8]/10 text-[#B3D8A8] hover:bg-[#B3D8A8]/20 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Reset</span>
            </motion.button>
          </div>
          
          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results section */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#B3D8A8]" />
              <h2 className="text-xl font-semibold text-[#B3D8A8]">
                Videos for <span className="opacity-80">{topic}</span> in <span className="opacity-80">{subject}</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {suggestions.map((video, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: index * 0.1 }
                  }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className={`bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl border border-[#B3D8A8]/30 overflow-hidden shadow-md ${
                    activeTab === index ? 'ring-2 ring-[#B3D8A8]' : ''
                  }`}
                >
                  <div 
                    onClick={() => setActiveTab(activeTab === index ? null : index)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="bg-[#B3D8A8]/20 p-2 rounded-lg">
                        <Video className="w-6 h-6 text-[#B3D8A8]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#B3D8A8]">{video.title}</h3>
                        <AnimatePresence>
                          {activeTab === index && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <p className="text-gray-400 text-sm my-3">{video.description}</p>
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-[#B3D8A8] hover:text-[#82A878] text-sm group"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>Watch Video</span>
                                <span className="transition-transform group-hover:translate-x-1">→</span>
                              </a>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}