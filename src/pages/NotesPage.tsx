import { useState, useEffect } from 'react';
import { FileText, Loader, Youtube } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { useAuthStore } from '../lib/store';

export function NotesPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoData, setVideoData] = useState<{title: string, description: string} | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  
  interface Note {
    id: string;
    videoUrl: string;
    notes: string;
    timestamp: { toDate: () => Date };
  }
  
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);

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
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
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
      
      if (videoData) {
        const simulatedTranscript = 
          `Since we don't have a backend server set up for transcript fetching, ` +
          `we're generating notes based on the video metadata.\n\n` +
          `Video Title: ${videoData.title}\n\n` +
          `Video Description:\n${videoData.description}\n\n` ;
        
        setTranscript(simulatedTranscript);
        return simulatedTranscript;
      } else {
        throw new Error("No video data available");
      }
    } catch (err) {
      console.error("Error fetching transcript:", err);
      setError("Failed to fetch video transcript. Using available video metadata for note generation.");
      
      const fallbackTranscript = 
        "Transcript could not be fetched.\n\n" +
        "For this demonstration, we'll generate notes based on the limited information available about this video.";
      
      setTranscript(fallbackTranscript);
      return fallbackTranscript;
    } finally {
      setTranscribing(false);
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
      
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      let prompt = `Generate detailed, structured notes from this YouTube video: ${videoUrl}\n\n`;
      
      if (videoData) {
        prompt += `Video Title: ${videoData.title}\n\n`;
        prompt += `Video Description: ${videoData.description}\n\n`;
      }
      
      if (transcriptText) {
        prompt += `Transcript:\n${transcriptText.substring(0, 30000)}\n\n`;
      }
      
      prompt += `
        Create comprehensive, well-organized notes with:
        1. Main topics and subtopics with clear headings
        2. Key points and important details under each topic
        3. Important definitions, concepts, and examples
        4. A summary of the main takeaways
        
        Format the notes in Markdown with proper headings, bullet points, and emphasis.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedNotes = response.text();
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
  
    } catch (err) {
      setError("Failed to generate notes. Please try again.");
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
              <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Video Transcript</h2>
              <div className="max-h-60 overflow-y-auto bg-[#B3D8A8]/5 rounded-lg p-4 border border-[#B3D8A8]/20">
                <pre className="whitespace-pre-wrap font-sans text-sm">{transcript}</pre>
              </div>
            </div>
          )}

          {notes && (
            <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-[#B3D8A8]/30 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Generated Notes</h2>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{notes}</pre>
              </div>
            </div>
          )}

          {savedNotes.length > 0 && (
            <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Previously Generated Notes</h2>
              <div className="space-y-4">
                {savedNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 hover:bg-[#B3D8A8]/10 transition-colors">
                    <p className="text-sm text-[#B3D8A8] mb-2">
                      {note.timestamp.toDate().toLocaleString()}
                    </p>
                    <p className="text-sm text-[#B3D8A8] mb-2">{note.videoUrl}</p>
                    <div className="max-h-40 overflow-y-auto bg-[#B3D8A8]/5 rounded-lg p-3 border border-[#B3D8A8]/20">
                      <pre className="whitespace-pre-wrap font-sans text-sm">{note.notes}</pre>
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