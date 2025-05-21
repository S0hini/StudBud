import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateContent } from '../lib/gemini'; // Import Groq API wrapper

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: any;
  id?: string;
}

const formatMessage = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

export function TutorPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [lastTopic, setLastTopic] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'tutorChats'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'asc')
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

  const handleQuizRedirect = () => {
    const words = lastTopic.trim().split(/\s+/);
    navigate('/quiz', { 
      state: { 
        course: words.length > 1 ? words[0] : "",
        topic: words.length > 1 ? words.slice(1).join(" ") : words[0],
        fromTutor: true
      } 
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setIsThinking(true);
    setShowQuizPrompt(false);
    setLastTopic(userMessage);

    try {
      await addDoc(collection(db, 'tutorChats'), {
        userId: user.uid,
        content: userMessage,
        role: 'user',
        timestamp: serverTimestamp()
      });

      try {
        // Prepare chat history for Groq
        const chatHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        const templatePrompt = `Please explain the topic: "${userMessage}"
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
Remember to use **bold** formatting (with double asterisks) for important terms and concepts throughout the explanation.`;

        // Call Groq API
        const aiMessage = await generateContent(templatePrompt, chatHistory);

        await addDoc(collection(db, 'tutorChats'), {
          userId: user.uid,
          content: aiMessage,
          role: 'assistant',
          timestamp: serverTimestamp()
        });

        setShowQuizPrompt(true);
      } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
      }
    } catch (err) {
      console.error('Overall Error:', err);
      await addDoc(collection(db, 'tutorChats'), {
        userId: user.uid,
        content: "Sorry, I encountered an error. Please try again.",
        role: 'assistant',
        timestamp: serverTimestamp()
      });
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Card */}
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-2xl p-6 border border-[#B3D8A8]/30 shadow-lg shadow-[#B3D8A8]/10 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Bot className="w-6 h-6 text-[#B3D8A8]" />
            <h2 className="text-xl font-bold text-[#B3D8A8]">AI Study Assistant</h2>
          </div>
          <p className="text-gray-400">
            Ask me anything about your studies. I'm here to help!
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-[#B3D8A8]/10 backdrop-blur-lg rounded-2xl p-6 border border-[#B3D8A8]/30 shadow-lg shadow-[#B3D8A8]/10">
          <div className="h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-[#B3D8A8]/20 scrollbar-track-transparent">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'assistant'
                        ? 'bg-[#B3D8A8]/5 border border-[#B3D8A8]/30'
                        : 'bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 mt-1 text-[#B3D8A8]" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-5 h-5 mt-1" />
                      )}
                      <p 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: message.role === 'assistant' 
                            ? formatMessage(message.content) 
                            : message.content 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-[#B3D8A8]" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-[#B3D8A8] animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-[#B3D8A8] animate-bounce delay-100" />
                        <div className="w-2 h-2 rounded-full bg-[#B3D8A8] animate-bounce delay-200" />
                      </div>
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
                className="flex-1 px-4 py-2 rounded-xl bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 focus:border-[#82A878] focus:ring-2 focus:ring-[#B3D8A8]/40 focus:outline-none transition-all duration-300"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="p-2 rounded-xl bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black hover:opacity-90 transition-all duration-300 disabled:opacity-50"
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

      {/* Updated Quiz Prompt */}
      <AnimatePresence>
        {showQuizPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div className="space-y-4 bg-[#B3D8A8]/10 backdrop-blur-lg p-6 rounded-2xl border border-[#B3D8A8]/30 shadow-lg shadow-[#B3D8A8]/10">
              <p className="text-lg font-semibold text-white">
                Test your knowledge?
              </p>
              <p className="text-sm text-gray-300">
                Would you like to take a quiz about <span className="text-[#B3D8A8]">{lastTopic}</span>?
              </p>
              <div className="flex space-x-3">
                <motion.button
                  onClick={() => setShowQuizPrompt(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-600 text-white font-medium hover:bg-gray-700 transition-colors duration-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  No, thanks
                </motion.button>
                <motion.button
                  onClick={handleQuizRedirect}
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium hover:opacity-90 transition-all duration-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Take Quiz
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add this CSS to your global styles
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
`;