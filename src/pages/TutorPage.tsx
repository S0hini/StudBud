import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuthStore } from '../lib/store';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateContent } from '../lib/gemini';
import { formatMathExpressions } from '../lib/mathFormatter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: any;
  id?: string;
}

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
        where('userId', '==', user.uid)
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

        // In-memory sort by timestamp to avoid requiring a composite index in Firestore
        newMessages.sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return timeA - timeB;
        });

        if (newMessages.length > 0) {
          setMessages(newMessages);
        }
      }, (error) => {
        console.warn("Firestore snapshot listener warning:", error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.warn("Error setting up listener:", error);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleQuizRedirect = () => {
    const words = lastTopic.trim().split(/\s+/);
    navigate('/quiz', { 
      state: { 
        course: words.length > 1 ? words[0] : "General",
        topic: words.length > 1 ? words.slice(1).join(" ") : words[0],
        fromTutor: true
      } 
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setIsThinking(true);
    setShowQuizPrompt(false);
    setLastTopic(userMessage);

    // Optimistically update local message state
    const userMsgObj: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsgObj]);

    // Save to Firestore in background if logged in
    if (user) {
      addDoc(collection(db, 'tutorChats'), {
        userId: user.uid,
        content: userMessage,
        role: 'user',
        timestamp: serverTimestamp()
      }).catch((e) => console.warn('Firestore write user message warning:', e));
    }

    try {
      // Prepare chat history for AI
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const templatePrompt = `Please explain the topic: "${userMessage}" in ENGLISH.
Use bold text with markdown formatting (e.g., **word**) for important terms.
For any mathematical formulas, equations, or limits, always format with LaTeX delimiters:
- Inline math: $a^{\\infty}$, $\\lim_{x \\to a} f(x)$, $0^0$, $\\infty^0$
- Display math: $$ \\lim_{x\\to a} f(x)^{g(x)} = \\exp\\left( \\lim_{x\\to a} g(x) \\ln f(x) \\right) $$

Provide a comprehensive explanation in the following format:
📌 **BRIEF OVERVIEW:**
[Provide a 2-3 sentence introduction to the topic, using **bold** for key terms]
🎯 **KEY CONCEPTS:**
• **[Key term 1]**: [Definition]
• **[Key term 2]**: [Definition]
• **[Key term 3]**: [Definition]
📝 **DETAILED EXPLANATION:**
• **[Main concept 1]**
  - [Detailed explanation with **bold** key terms and clear LaTeX math if applicable]
  - [Supporting details]
• **[Main concept 2]**
  - [Detailed explanation with **bold** key terms]
  - [Supporting details]
💡 **EXAMPLES:**
• **Example 1**: [Practical application or worked equation]
• **Example 2**: [Practical application]
✨ **SUMMARY:**
[Brief summary highlighting **key terms** and main points]`;

      const aiMessage = await generateContent(templatePrompt, chatHistory);

      const assistantMsgObj: Message = {
        role: 'assistant',
        content: aiMessage,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMsgObj]);

      if (user) {
        addDoc(collection(db, 'tutorChats'), {
          userId: user.uid,
          content: aiMessage,
          role: 'assistant',
          timestamp: serverTimestamp()
        }).catch((e) => console.warn('Firestore write assistant message warning:', e));
      }

      setShowQuizPrompt(true);
    } catch (err: any) {
      console.error('Tutor error:', err);
      const errorMsgObj: Message = {
        role: 'assistant',
        content: "I encountered an error trying to process that question. Please make sure your network and AI API keys are configured properly, or try asking in different words.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsgObj]);
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
          <div className="h-[520px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-[#B3D8A8]/20 scrollbar-track-transparent pr-1">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      message.role === 'assistant'
                        ? 'bg-[#B3D8A8]/5 border border-[#B3D8A8]/30 text-gray-100'
                        : 'bg-gradient-to-r from-[#B3D8A8] to-[#82A878] text-black font-medium'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 mt-1 text-[#B3D8A8] flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-5 h-5 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 overflow-x-auto text-sm leading-relaxed">
                        {message.role === 'assistant' ? (
                          <div className="markdown-body prose prose-invert prose-headings:text-[#B3D8A8] prose-a:text-[#B3D8A8] max-w-none prose-sm">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
                            >
                              {formatMathExpressions(message.content)}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
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