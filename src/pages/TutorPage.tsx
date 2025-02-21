import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Initialize Gemini with safety checks and logging
const apiKey = import.meta.env.VITE_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing Gemini API key');
  throw new Error('VITE_PUBLIC_GEMINI_API_KEY is not defined');
}

console.log('Initializing Gemini...'); // Debug log
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ 
  model: "gemini-pro",
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.7,
  },
});

console.log('API Key exists:', !!apiKey); // Will log true/false, not the actual key

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: any;
}

// Add this helper function to convert asterisks to bold text
const formatMessage = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

export function TutorPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    try {
      // Updated query to match the index
      const q = query(
        collection(db, 'tutorChats'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'asc'),
        orderBy('__name__', 'asc')  // Add this line
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newMessages.push({
            id: doc.id,
            content: data.content,
            role: data.role,
            timestamp: data.timestamp
          });
        });
        setMessages(newMessages);
      }, (error) => {
        console.error("Error in snapshot listener:", error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up listener:", error);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setIsThinking(true);

    try {
      console.log('Starting message send...');

      // Save user message to Firestore
      await addDoc(collection(db, 'tutorChats'), {
        userId: user.uid,
        content: userMessage,
        role: 'user',
        timestamp: serverTimestamp()
      });

      // Create a structured prompt for topic explanation with bold formatting
      const structuredPrompt = `
Please explain the topic: "${userMessage}"
Use bold text with markdown formatting (e.g., **word**) for important terms.

Provide a comprehensive explanation in the following format:

📌 **BRIEF OVERVIEW:**
[Provide a 2-3 sentence introduction to the topic, using **bold** for key terms]

🎯 **KEY CONCEPTS:**
• **[Key term 1]**: [Definition]
• **[Key term 2]**: [Definition]
• **[Key term 3]**: [Definition]

📝 **DETAILED EXPLANATION:**
• **[Main concept 1]**
  - [Detailed explanation with **bold** key terms]
  - [Supporting details]
• **[Main concept 2]**
  - [Detailed explanation with **bold** key terms]
  - [Supporting details]

💡 **EXAMPLES:**
• **Example 1**: [Practical application]
• **Example 2**: [Practical application]

✨ **SUMMARY:**
[Brief summary highlighting **key terms** and main points]

Remember to use **bold** formatting (with double asterisks) for important terms and concepts throughout the explanation.
`;

      try {
        console.log('Calling Gemini API...');
        const result = await model.generateContent(structuredPrompt);
        const response = await result.response;
        const aiMessage = response.text();
        console.log('AI Message received');

        // Save AI response
        await addDoc(collection(db, 'tutorChats'), {
          userId: user.uid,
          content: aiMessage,
          role: 'assistant',
          timestamp: serverTimestamp()
        });
        console.log('AI response saved to Firestore');
      } catch (geminiError) {
        console.error('Gemini API Error:', geminiError);
        throw geminiError;
      }
    } catch (err) {
      console.error('Overall Error:', err);
      // Add error message to chat
      await addDoc(collection(db, 'tutorChats'), {
        userId: user.uid,
        content: "Sorry, I encountered an error while explaining this topic. Please try again.",
        role: 'assistant',
        timestamp: serverTimestamp()
      });
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-gradient rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold mb-4">AI Tutor</h1>
        <p className="text-gray-400">
          Ask any questions and get instant help from your AI tutor.
        </p>
      </div>

      <div className="card-gradient rounded-xl p-6">
        <div className="h-[500px] flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-purple-500" />
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-purple-500/10 text-purple-50'
                      : 'bg-black/30 border border-gray-800'
                  }`}
                >
                  <p 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessage(message.content) 
                    }}
                  />
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'User'} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isThinking && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-purple-500" />
                </div>
                <div className="rounded-lg p-3 bg-black/30 border border-gray-800">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask your question..."
              className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-gray-800 focus:border-purple-500 focus:outline-none"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}