import React, { useState, useEffect } from 'react';
import { Search, Loader, Video, BookOpen, Sparkles, ExternalLink, Play, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface LectureVideo {
  id?: string;
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  channelName?: string;
  publishedAt?: string;
  viewCount?: string;
  isAiCurated?: boolean;
}

// Decode HTML entities in YouTube titles
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

export function LecturesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [lectures, setLectures] = useState<LectureVideo[]>([]);
  const [error, setError] = useState('');
  const [activeModalVideo, setActiveModalVideo] = useState<LectureVideo | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Popular search suggestions
  const popularPresets = [
    { subject: "GATE CSE", topic: "limit continuity gate" },
    { subject: "GATE CSE", topic: "Graph Theory & Trees" },
    { subject: "Computer Science", topic: "Operating Systems Process Synchronization" },
    { subject: "Mathematics", topic: "Calculus Limits and Continuity" },
    { subject: "Engineering", topic: "Linear Algebra Eigenvalues" },
    { subject: "Programming", topic: "Data Structures & Algorithms" },
    { subject: "Physics", topic: "Quantum Mechanics Wave Function" },
    { subject: "Chemistry", topic: "Organic Chemistry Reaction Mechanisms" }
  ];

  const searchYouTubeApi = async (query: string): Promise<LectureVideo[]> => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) return [];

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(
      query
    )}&type=video&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube API returned ${res.status}`);
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return [];

    return data.items.map((item: any) => ({
      id: item.id?.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      description: decodeHtmlEntities(item.snippet.description),
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        `https://img.youtube.com/vi/${item.id?.videoId}/hqdefault.jpg`,
      channelName: decodeHtmlEntities(item.snippet.channelTitle),
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : undefined
    }));
  };

  const searchBackendApi = async (query: string, subj: string, top: string): Promise<LectureVideo[]> => {
    const res = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, subject: subj, topic: top })
    });

    if (!res.ok) {
      throw new Error(`Backend YouTube search failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results.map((r: any) => ({
        id: r.id,
        title: decodeHtmlEntities(r.title),
        description: decodeHtmlEntities(r.description),
        thumbnail: r.thumbnail || (r.id ? `https://img.youtube.com/vi/${r.id}/hqdefault.jpg` : undefined),
        channelName: decodeHtmlEntities(r.channelName),
        url: r.url,
        publishedAt: r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : undefined
      }));
    }
    return [];
  };

  const getAiRecommendations = async (subj: string, top: string): Promise<LectureVideo[]> => {
    try {
      const res = await fetch('/api/ai/recommend-lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subj, topic: top })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && data.recommendations.length > 0) {
          return data.recommendations.map((rec: any) => ({
            title: rec.title,
            channelName: rec.channelName,
            description: rec.description,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.searchQuery || `${top} lecture`)}`,
            isAiCurated: true
          }));
        }
      }
    } catch (aiErr) {
      console.warn("AI recommendation fallback failed:", aiErr);
    }

    // Default fallback
    return [
      {
        title: `${top} - Complete Video Lecture & Concept Breakdown`,
        channelName: `${subj || 'Academic'} Educator`,
        description: `Comprehensive video lecture covering core concepts, solved numericals, and syllabus requirements for ${top}.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${subj} ${top} lecture`)}`,
        isAiCurated: true
      },
      {
        title: `${top} - In-Depth Problem Solving & Examples`,
        channelName: "Top Academic Channel",
        description: `High-yield questions and step-by-step problem walkthroughs for ${top}.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${subj} ${top} examples tutorial`)}`,
        isAiCurated: true
      }
    ];
  };

  const findLectures = async (customSubject?: string, customTopic?: string) => {
    const activeSubj = (customSubject !== undefined ? customSubject : subject).trim();
    const activeTop = (customTopic !== undefined ? customTopic : topic).trim();

    if (!activeTop) {
      setError('Please enter a topic to search (e.g., "limit continuity gate")');
      return;
    }

    setLoading(true);
    setError('');
    setLectures([]);

    const fullQuery = `${activeSubj ? activeSubj + ' ' : ''}${activeTop} lecture`.trim();

    try {
      let results: LectureVideo[] = [];

      // 1. Try Backend YouTube Search
      try {
        results = await searchBackendApi(fullQuery, activeSubj, activeTop);
      } catch (backendErr) {
        console.warn("Backend YouTube search failed, trying client YouTube API...", backendErr);
      }

      // 2. If Backend search didn't yield results, try client-side YouTube Data API directly
      if (results.length === 0) {
        try {
          results = await searchYouTubeApi(fullQuery);
        } catch (clientErr) {
          console.warn("Client YouTube API failed, falling back to AI curation...", clientErr);
        }
      }

      // 3. If YouTube API quota reached or missing, fetch AI-curated lectures
      if (results.length === 0) {
        results = await getAiRecommendations(activeSubj, activeTop);
      }

      if (results.length === 0) {
        setError(`No lectures found for "${activeTop}". Try adjusting your keywords.`);
      } else {
        setLectures(results);
        if (!searchHistory.includes(activeTop)) {
          setSearchHistory(prev => [activeTop, ...prev.slice(0, 4)]);
        }
      }
    } catch (err: any) {
      console.error('Find lectures error:', err);
      setError('An error occurred while finding lectures. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: { subject: string; topic: string }) => {
    setSubject(preset.subject);
    setTopic(preset.topic);
    findLectures(preset.subject, preset.topic);
  };

  const handleGenerateNotes = (lecture: LectureVideo) => {
    navigate('/notes', { state: { videoUrl: lecture.url, videoTitle: lecture.title } });
  };

  const handlePracticeQuiz = (lecture: LectureVideo) => {
    navigate('/quiz', {
      state: {
        course: subject || 'General',
        topic: topic || lecture.title,
        fromLecture: true
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-[#B3D8A8]/30 mb-8 shadow-xl shadow-[#B3D8A8]/5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-[#B3D8A8]/20 rounded-xl border border-[#B3D8A8]/40">
                <Video className="w-6 h-6 text-[#B3D8A8]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-[#B3D8A8] bg-clip-text text-transparent">
                Find Relevant YouTube Lectures
              </h1>
            </div>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl">
              Search any academic subject and topic to get live, relevant YouTube lectures. Watch directly or instantly generate structured AI study notes with a single click.
            </p>
          </div>
        </div>

        {/* Search Inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            findLectures();
          }}
          className="mt-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Subject / Exam (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., GATE CSE, Mathematics, Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-[#B3D8A8]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B3D8A8] focus:ring-1 focus:ring-[#B3D8A8] transition-all text-sm"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Topic or Keywords <span className="text-[#B3D8A8]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder='e.g., "limit continuity gate", "operating systems deadlock"'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-black/60 border border-[#B3D8A8]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#B3D8A8] focus:ring-1 focus:ring-[#B3D8A8] transition-all text-sm"
                  required
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#B3D8A8] to-[#82A878] hover:from-[#9bc790] hover:to-[#719667] text-black font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#B3D8A8]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-black" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-black" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-5 pt-4 border-t border-[#B3D8A8]/20">
          <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#B3D8A8]" />
            <span>Popular Topics:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#B3D8A8]/20 border border-white/10 hover:border-[#B3D8A8]/40 text-gray-300 hover:text-white transition-all text-left"
              >
                <span className="text-[#B3D8A8] font-semibold">{preset.subject}:</span> {preset.topic}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Results Header */}
      {lectures.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#B3D8A8] flex items-center space-x-2">
            <span>Lectures for "{topic}"</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#B3D8A8]/20 text-[#B3D8A8] border border-[#B3D8A8]/30">
              {lectures.length} results
            </span>
          </h2>

          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${subject} ${topic} lecture`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-[#B3D8A8] flex items-center space-x-1 transition-colors"
          >
            <span>More on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#B3D8A8]/5 border border-[#B3D8A8]/20 rounded-2xl p-5 animate-pulse space-y-4"
            >
              <div className="h-44 bg-white/5 rounded-xl" />
              <div className="h-5 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
              <div className="h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Lecture Cards Grid */}
      {!loading && lectures.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {lectures.map((lecture, index) => {
            const hasVideoId = !!lecture.id || !!lecture.url.match(/v=([a-zA-Z0-9_-]{11})/);
            const videoId = lecture.id || (lecture.url.match(/v=([a-zA-Z0-9_-]{11})/) ? lecture.url.match(/v=([a-zA-Z0-9_-]{11})/)![1] : null);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-[#B3D8A8]/5 hover:bg-[#B3D8A8]/10 border border-[#B3D8A8]/20 hover:border-[#B3D8A8]/50 rounded-2xl p-5 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative rounded-xl overflow-hidden mb-4 bg-black/80 aspect-video flex items-center justify-center border border-white/10">
                    {lecture.thumbnail ? (
                      <img
                        src={lecture.thumbnail}
                        alt={lecture.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback if image fails to load
                          if (videoId) {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 text-center">
                        <Video className="w-10 h-10 text-[#B3D8A8] mb-2 opacity-80" />
                        <span className="text-xs text-gray-400">{lecture.channelName || 'YouTube Lecture'}</span>
                      </div>
                    )}

                    {/* Play Overlay Button */}
                    {hasVideoId && (
                      <button
                        onClick={() => setActiveModalVideo(lecture)}
                        className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all group/btn"
                        title="Watch Preview"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#B3D8A8] text-black flex items-center justify-center shadow-lg group-hover/btn:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-0.5 fill-black" />
                        </div>
                      </button>
                    )}

                    {lecture.isAiCurated && (
                      <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border border-purple-400/40">
                        AI Recommended
                      </div>
                    )}
                  </div>

                  {/* Channel & Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-medium text-[#B3D8A8] truncate max-w-[200px]">
                      {lecture.channelName || 'Academic Lecture'}
                    </span>
                    {lecture.publishedAt && <span>{lecture.publishedAt}</span>}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base sm:text-lg text-white group-hover:text-[#B3D8A8] transition-colors line-clamp-2 mb-2">
                    {lecture.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {lecture.description || 'Comprehensive lecture and walkthrough covering essential concepts.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Generate Smart Notes CTA */}
                    <button
                      onClick={() => handleGenerateNotes(lecture)}
                      className="py-2.5 px-3 bg-gradient-to-r from-[#B3D8A8] to-[#82A878] hover:from-[#9bc790] hover:to-[#719667] text-black font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                      title="Generate Notes with AI from this lecture"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Generate Notes</span>
                    </button>

                    {/* Quiz CTA */}
                    <button
                      onClick={() => handlePracticeQuiz(lecture)}
                      className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 border border-white/15 transition-all"
                      title="Practice Quiz on this topic"
                    >
                      <HelpCircle className="w-4 h-4 text-[#B3D8A8]" />
                      <span>Take Quiz</span>
                    </button>
                  </div>

                  {/* Watch on YouTube Link */}
                  <a
                    href={lecture.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center justify-center space-x-1 transition-all"
                  >
                    <span>Open on YouTube</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Empty State / Initial Prompt */}
      {!loading && lectures.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 px-4 bg-[#B3D8A8]/5 rounded-2xl border border-[#B3D8A8]/10"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#B3D8A8]/10 flex items-center justify-center border border-[#B3D8A8]/20">
            <Search className="w-8 h-8 text-[#B3D8A8]" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Search Any Topic or Syllabus</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Enter a topic like <span className="text-[#B3D8A8]">"limit continuity gate"</span>, <span className="text-[#B3D8A8]">"binary trees"</span>, or click any topic above to explore real lectures.
          </p>
        </motion.div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeModalVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveModalVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-[#B3D8A8]/30 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/40">
                <h3 className="font-semibold text-white truncate max-w-[80%]">
                  {activeModalVideo.title}
                </h3>
                <button
                  onClick={() => setActiveModalVideo(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video w-full bg-black">
                {activeModalVideo.id || activeModalVideo.url.match(/v=([a-zA-Z0-9_-]{11})/) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${
                      activeModalVideo.id || activeModalVideo.url.match(/v=([a-zA-Z0-9_-]{11})/)![1]
                    }?autoplay=1`}
                    title={activeModalVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <p className="text-gray-300 mb-4">Video preview unavailable in modal.</p>
                    <a
                      href={activeModalVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 bg-[#B3D8A8] text-black font-semibold rounded-xl text-sm"
                    >
                      Watch on YouTube
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/40 flex items-center justify-between">
                <span className="text-xs text-gray-400">{activeModalVideo.channelName}</span>
                <button
                  onClick={() => {
                    const vid = activeModalVideo;
                    setActiveModalVideo(null);
                    handleGenerateNotes(vid);
                  }}
                  className="py-2 px-4 bg-[#B3D8A8] hover:bg-[#9bc790] text-black font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Generate Notes from this Lecture</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}