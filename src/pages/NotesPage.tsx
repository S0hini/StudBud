import { useState, useEffect } from 'react';
import { FileText, Loader, Youtube } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

export function NotesPage() {
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState('');
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
    fetchNotes();
  }, []);

  useEffect(() => {
    // Extract video ID when URL changes
    if (videoUrl) {
      const id = extractVideoId(videoUrl);
      setVideoId(id || '');
    } else {
      setVideoId('');
    }
  }, [videoUrl]);

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const fetchNotes = async () => {
    try {
      const notesQuery = query(collection(db, "notes"), orderBy("timestamp", "desc"));
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
      // YouTube Data API v3 requires an API key
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      
      if (!apiKey) {
        throw new Error("YouTube API key is missing");
      }

      // First, get video captions information
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      );
      
      if (!captionsResponse.ok) {
        throw new Error("Failed to fetch captions information");
      }
      
      const captionsData = await captionsResponse.json();
      
      // Get the first caption track ID
      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error("No captions found for this video");
      }
      
      const captionId = captionsData.items[0].id;
      
      // Now fetch the actual transcript
      // Note: This requires OAuth 2.0 authentication for the captions.download endpoint
      // For demo purposes, we're showing the structure but this won't work with just an API key
      const transcriptResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${apiKey}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_YOUTUBE_OAUTH_TOKEN}`
          }
        }
      );
      
      if (!transcriptResponse.ok) {
        throw new Error("Failed to fetch transcript");
      }
      
      const transcriptData = await transcriptResponse.text();
      setTranscript(transcriptData);
      
      return transcriptData;
    } catch (err) {
      console.error("Error fetching transcript:", err);
      setError("Failed to fetch video transcript. Please try another video.");
      return null;
    } finally {
      setTranscribing(false);
    }
  };

  const generateNotes = async () => {
    if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
      setError("Please enter a valid YouTube URL");
      return;
    }
  
    setLoading(true);
    setError("");
  
    try {
      // Try to fetch transcript first
      let transcriptText = transcript;
      
      if (!transcriptText) {
        setTranscribing(true);
        transcriptText = await fetchTranscript() || "";
        setTranscribing(false);
      }
      
      // Initialize the Gemini API with your API key
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      let prompt;
      
      if (transcriptText) {
        prompt = `Generate detailed, structured notes from this YouTube video transcript: 
        
        Video URL: ${videoUrl}
        
        Transcript:
        ${transcriptText.substring(0, 30000)} // Limiting the transcript length
        
        Create comprehensive, well-organized notes with:
        1. Main topics and subtopics with clear headings
        2. Key points and important details under each topic
        3. Important definitions, concepts, and examples
        4. A summary of the main takeaways
        
        Format the notes in Markdown with proper headings, bullet points, and emphasis.`;
      } else {
        prompt = `Generate detailed, structured notes from this YouTube video: ${videoUrl}. 
        Format the notes with proper Markdown headings, bullet points, and key takeaways.
        Include main topics, subtopics, important definitions, and examples.`;
      }
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedNotes = response.text();
      setNotes(generatedNotes);
  
      // Save to Firestore
      await addDoc(collection(db, "notes"), {
        videoUrl: videoUrl,
        notes: generatedNotes,
        timestamp: new Date(),
      });

      // Refresh the notes list
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
              <div className="flex space-x-2">
                <button
                  onClick={fetchTranscript}
                  disabled={transcribing}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#B3D8A8]/20 text-[#B3D8A8] hover:bg-[#B3D8A8]/30 transition-colors flex items-center justify-center space-x-2"
                >
                  {transcribing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Fetching Transcript...</span>
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
                      <Loader className="w-4 h-4 animate-spin" />
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
    </div>
  );
}