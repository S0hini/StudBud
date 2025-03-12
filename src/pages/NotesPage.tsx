import  { useState, useEffect } from 'react';
import {  FileText, Loader } from 'lucide-react';
import { model } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

export function NotesPage() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
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

  const generateNotes = async () => {
    if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
      setError("Please enter a valid YouTube URL");
      return;
    }
  
    setLoading(true);
    setError("");
  
    try {
      const prompt = `Generate detailed, structured notes from this YouTube video: ${videoUrl}. Format the notes with proper headings, bullet points, and key takeaways.`;
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
      <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30 mb-8">
        <h1 className="text-2xl font-bold mb-4 text-[#B3D8A8]">Generate Smart Notes</h1>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter YouTube video URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:outline-none"
          />
          <button
            onClick={generateNotes}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 rounded-lg bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
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
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-[#B3D8A8]/30">
          <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Generated Notes</h2>
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{notes}</pre>
          </div>
        </div>
      )}

      {savedNotes.length > 0 && (
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-xl p-6 border border-[#B3D8A8]/30">
          <h2 className="text-xl font-semibold mb-4 text-[#B3D8A8]">Previously Generated Notes</h2>
          <div className="space-y-4">
            {savedNotes.map((note) => (
              <div key={note.id} className="p-4 rounded-lg bg-[#B3D8A8]/5 border border-[#B3D8A8]/30">
                <p className="text-sm text-[#B3D8A8] mb-2">
                  {note.timestamp.toDate().toLocaleString()}
                </p>
                <p className="text-sm text-[#B3D8A8] mb-2">{note.videoUrl}</p>
                <pre className="whitespace-pre-wrap font-sans text-sm">{note.notes}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}