import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { FileText, Loader, Youtube } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { useAuthStore } from '../lib/store';
import { generateContent as generateWithGroq } from '../lib/gemini';
import { formatMathExpressions } from '../lib/mathFormatter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

export function NotesPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [translatingTranscript, setTranslatingTranscript] = useState(false);
  const [videoUrl, setVideoUrl] = useState(() => {
    return searchParams.get('url') || searchParams.get('videoUrl') || (location.state as any)?.videoUrl || '';
  });
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoData, setVideoData] = useState<{ title: string, description: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [viewRaw, setViewRaw] = useState(false);

  interface Note {
    id: string;
    videoUrl: string;
    videoTitle?: string;
    notes: string;
    timestamp: any;
  }

  const [savedNotes, setSavedNotes] = useState<Note[]>([]);

  useEffect(() => {
    const paramUrl = searchParams.get('url') || searchParams.get('videoUrl') || (location.state as any)?.videoUrl;
    if (paramUrl && paramUrl !== videoUrl) {
      setVideoUrl(paramUrl);
    }
  }, [searchParams, location.state]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  useEffect(() => {
    if (videoUrl) {
      const id = extractVideoId(videoUrl);
      setVideoId(id || '');

      if (id) {
        fetchVideoData(id);
      }
    } else {
      setVideoId('');
      setVideoData(null);
    }
  }, [videoUrl]);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regExp);
    return match ? match[1] : null;
  };

  const fetchVideoData = async (id: string) => {
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.warn("YouTube API key is missing");
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video data");
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videoDetails = data.items[0].snippet;
        setVideoData({
          title: videoDetails.title,
          description: videoDetails.description
        });
      }
    } catch (err) {
      console.error("Error fetching video data:", err);
    }
  };

  const fetchNotes = async () => {
    if (!user) {
      console.log("No user logged in, skipping note fetch");
      return;
    }

    try {
      const notesQuery = query(
        collection(db, "notes"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(notesQuery);
      const notesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];

      setSavedNotes(notesData);
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError("Failed to fetch saved notes");
    }
  };

  const fetchTranscript = async () => {
    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setTranscribing(true);
    setError("");

    try {
      if (!videoData) {
        await fetchVideoData(videoId);
      }

      // Try fetching real transcript from backend
      try {
        const response = await fetch('/api/youtube/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, videoUrl })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transcript) {
            setTranscript(data.transcript);
            return data.transcript;
          }
        }
      } catch (backendErr) {
        console.warn("Backend transcript fetch failed, falling back to metadata:", backendErr);
      }

      // Fallback to video metadata if transcript is unavailable
      if (videoData) {
        const fallback =
          `Video Title: ${videoData.title}\n\n` +
          `Video Description:\n${videoData.description}\n\n`;

        setTranscript(fallback);
        return fallback;
      } else {
        throw new Error("No video transcript or metadata available");
      }
    } catch (err: any) {
      console.error("Error fetching transcript:", err);
      setError("Failed to fetch video transcript. Using available video metadata for note generation.");

      const fallbackTranscript =
        "Transcript could not be fetched.\n\n" +
        "Notes will be generated based on available video details.";

      setTranscript(fallbackTranscript);
      return fallbackTranscript;
    } finally {
      setTranscribing(false);
    }
  };

  const translateTranscriptToEnglish = async () => {
    if (!transcript) return;
    setTranslatingTranscript(true);
    setError("");

    try {
      let translated = "";

      // 1. Try backend dedicated translate route
      try {
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-gemini-key': import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '',
            'x-groq-key': import.meta.env.VITE_PUBLIC_GROQ_API_KEY || ''
          },
          body: JSON.stringify({ text: transcript, targetLanguage: 'English' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.translation) translated = data.translation;
        }
      } catch (beErr) {
        console.warn("Backend translation failed, trying client AI...", beErr);
      }

      // 2. Client-side fallback translation
      if (!translated) {
        const prompt = `Translate the following lecture transcript into clear, accurate English. Respond ONLY with the direct English translation, no other conversational text:\n\n${transcript.substring(0, 15000)}`;
        translated = await generateWithGroq(prompt);
      }

      if (translated) {
        setTranscript(translated);
      }
    } catch (tErr: any) {
      console.error("Translation error:", tErr);
      setError(tErr?.message || "Failed to translate transcript.");
    } finally {
      setTranslatingTranscript(false);
    }
  };

  const generateNotes = async () => {
    if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    if (!user) {
      setError("Please log in to generate and save notes");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let transcriptText = transcript;

      if (!transcriptText) {
        setTranscribing(true);
        transcriptText = await fetchTranscript() || "";
        setTranscribing(false);
      }

      if (!videoData && videoId) {
        await fetchVideoData(videoId);
      }

      const geminiApiKey = (import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '').trim();
      const groqApiKey = (import.meta.env.VITE_PUBLIC_GROQ_API_KEY || '').trim();

      // Optimize transcript length to fit cleanly within model TPM and context limits
      const boundedTranscript = transcriptText ? transcriptText.substring(0, 15000) : "";

      let prompt = `You are an expert academic tutor. Generate comprehensive, well-structured academic notes in ENGLISH based on the following YouTube lecture:\n\n`;
      prompt += `YouTube URL: ${videoUrl}\n\n`;
      if (videoData) {
        prompt += `Video Title: ${videoData.title}\n\n`;
        prompt += `Video Description: ${videoData.description}\n\n`;
      }

      if (boundedTranscript) {
        prompt += `Transcript:\n${boundedTranscript}\n\n`;
      }

      prompt += `
CRITICAL REQUIREMENT:
Regardless of what language the video, title, description, or transcript is in (e.g. Arabic, Hindi, Spanish, etc.), write all notes strictly in clean, professional ENGLISH.

Structure the notes as follows:
# [Clear English Title for the Lecture]

## 📌 Executive Overview
* Concise 2-3 paragraph summary in English explaining the core concepts and takeaways.

## 🎯 Key Concepts & Definitions
* **[Key Term/Concept 1]**: Clear English explanation and definition.
* **[Key Term/Concept 2]**: Clear English explanation and definition.
* **[Key Term/Concept 3]**: Clear English explanation and definition.

## 📝 Detailed Lecture Breakdown
### 1. [Main Topic 1]
* Detailed points with **bold** key terms.
* Important formulas, theories, or mechanisms.
### 2. [Main Topic 2]
* In-depth details and context.

## 💡 Practical Examples & Applications
* Real-world applications or sample worked examples.

## ✨ Summary Takeaways
* Key points to remember for exams.

MATHEMATICAL NOTATION FORMATTING:
- For any mathematical expressions, powers, limits, equations, or formulas, always wrap them in standard LaTeX dollar delimiters:
  - Inline formulas: $a^{\\infty}$, $\\lim_{x \\to a} f(x)$, $0^0$, $\\infty^0$
  - Multi-line / display equations: $$ \\lim_{x\\to a} f(x)^{g(x)} = \\exp\\left( \\lim_{x\\to a} g(x) \\ln f(x) \\right) $$
- Never output raw unformatted brackets or parentheses for formulas.

Ensure all text is in fluent English with proper Markdown and LaTeX formatting.`;

      let generatedNotes = "";

      // 1. Try Backend Server Note Generation first
      try {
        const response = await fetch('/api/ai/generate-notes', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-gemini-key': geminiApiKey,
            'x-groq-key': groqApiKey
          },
          body: JSON.stringify({
            videoUrl,
            videoTitle: videoData?.title,
            videoDescription: videoData?.description,
            transcript: boundedTranscript
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.notes) {
            generatedNotes = data.notes;
          }
        }
      } catch (backendErr) {
        console.warn("Backend note generation unreachable, trying client providers...", backendErr);
      }

      // 2. Try Client Groq if backend didn't return notes
      if (!generatedNotes && groqApiKey) {
        try {
          const groqResult = await generateWithGroq(prompt);
          if (groqResult) {
            generatedNotes = groqResult;
          }
        } catch (groqErr) {
          console.warn("Client Groq note generation failed, trying Gemini...", groqErr);
        }
      }

      // 3. Try Client Gemini if Groq didn't return notes
      if (!generatedNotes && geminiApiKey) {
        try {
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro"];

          for (const modelName of candidateModels) {
            try {
              const model = genAI.getGenerativeModel({ model: modelName });
              const result = await model.generateContent(prompt);
              const response = await result.response;
              const text = response.text();
              if (text) {
                generatedNotes = text;
                break;
              }
            } catch (mErr) {
              console.warn(`Model ${modelName} failed, trying next...`, mErr);
            }
          }
        } catch (geminiInitErr) {
          console.warn("Gemini client error:", geminiInitErr);
        }
      }

      if (!generatedNotes) {
        throw new Error("Could not generate notes with configured AI keys. Please check VITE_PUBLIC_GROQ_API_KEY in your .env file.");
      }

      setNotes(generatedNotes);

      await addDoc(collection(db, "notes"), {
        videoUrl: videoUrl,
        videoTitle: videoData?.title || "Unknown Title",
        notes: generatedNotes,
        timestamp: new Date(),
        userId: user.uid,
        userEmail: user.email
      });

      await fetchNotes();

    } catch (err: any) {
      setError(err?.message || "Failed to generate notes. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {!user ? (
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 mb-8 shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Please log in to generate notes</h2>
          <p className="text-[#B3D8A8]/70">You need to be logged in to generate and save notes.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 mb-8 shadow-lg">
            <div className="flex items-center space-x-2 mb-4">
              <Youtube className="w-6 h-6 text-[#B3D8A8]" />
              <h1 className="text-2xl font-bold text-[#B3D8A8]">Generate Smart Notes</h1>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#B3D8A8]">YouTube URL</label>
                <input
                  type="text"
                  placeholder="Enter YouTube video URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:outline-none transition-all focus:ring-2 focus:ring-[#B3D8A8]/20"
                />
              </div>

              {videoId && (
                <div className="bg-[#B3D8A8]/5 p-4 rounded-lg border border-[#B3D8A8]/20">
                  <div className="aspect-video w-full mb-3">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title="YouTube video preview"
                    ></iframe>
                  </div>

                  {videoData && (
                    <div className="mb-4 p-4 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/20">
                      <h3 className="font-medium text-[#B3D8A8] mb-1">{videoData.title}</h3>
                      <p className="text-sm text-[#B3D8A8]/70 line-clamp-3">{videoData.description}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={fetchTranscript}
                      disabled={transcribing}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#B3D8A8]/20 text-[#B3D8A8] hover:bg-[#B3D8A8]/30 transition-colors flex items-center justify-center space-x-2"
                    >
                      {transcribing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-solid rounded-full animate-spin-smooth border-[#B3D8A8]"></div>
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Fetch Transcript</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={generateNotes}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-solid rounded-full animate-spin-smooth border-black"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Generate Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!videoId && (
                <button
                  onClick={generateNotes}
                  disabled={loading || !videoUrl}
                  className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
                    videoUrl
                      ? 'bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black hover:opacity-90'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-t-transparent border-solid rounded-full animate-spin-smooth border-black"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Generate Notes</span>
                    </>
                  )}
                </button>
              )}

              {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500 text-red-500">
                  {error}
                </div>
              )}
            </div>
          </div>

          {transcript && (
            <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-[#B3D8A8]/30 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#B3D8A8]">Video Transcript</h2>
                <button
                  onClick={translateTranscriptToEnglish}
                  disabled={translatingTranscript}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-semibold hover:opacity-90 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {translatingTranscript ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent border-solid rounded-full animate-spin border-black"></div>
                      <span>Translating...</span>
                    </>
                  ) : (
                    <span>🌐 Translate to English</span>
                  )}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto bg-[#B3D8A8]/5 rounded-lg p-4 border border-[#B3D8A8]/20">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200">{transcript}</pre>
              </div>
            </div>
          )}

          {notes && (
            <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-[#B3D8A8]/30 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#B3D8A8]">Generated Notes</h2>
                <button
                  onClick={() => setViewRaw(!viewRaw)}
                  className="text-xs px-2 py-1 rounded bg-[#B3D8A8]/20 text-[#B3D8A8] hover:bg-[#B3D8A8]/30"
                >
                  {viewRaw ? "View Formatted" : "View Raw"}
                </button>
              </div>

              <div className="bg-[#B3D8A8]/5 rounded-lg border border-[#B3D8A8]/20">
                {viewRaw ? (
                  <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                    <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto">{notes}</pre>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar markdown-body prose prose-invert prose-headings:text-[#B3D8A8] prose-a:text-[#B3D8A8] max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                      {formatMathExpressions(notes)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {savedNotes.length > 0 && (
            <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Previously Generated Notes</h2>
              <div className="space-y-4">
                {savedNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 hover:bg-[#B3D8A8]/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[#B3D8A8]">
                        {note.videoTitle || "Notes"}
                      </h3>
                      <p className="text-xs text-[#B3D8A8]/70">
                        {note.timestamp?.toDate ? note.timestamp.toDate().toLocaleString() : new Date(note.timestamp || Date.now()).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xs text-[#B3D8A8]/70 mb-2 truncate">{note.videoUrl}</p>

                    <div className="bg-[#B3D8A8]/5 rounded-lg border border-[#B3D8A8]/20">
                      <div className="h-[200px] overflow-y-auto p-3 custom-scrollbar">
                        <div className="markdown-body prose prose-invert prose-headings:text-[#B3D8A8] prose-a:text-[#B3D8A8] max-w-none prose-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                          >
                            {formatMathExpressions(note.notes)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}