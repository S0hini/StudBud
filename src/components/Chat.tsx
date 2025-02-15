import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: any;
}

interface ChatProps {
  friendId: string;
  friendName: string;
}

export function Chat({ friendId, friendName }: ChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const chatId = [user.uid, friendId].sort().join('_');
    const q = query(
      collection(db, 'chats'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [user, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    setLoading(true);
    const chatId = [user.uid, friendId].sort().join('_');

    try {
      await addDoc(collection(db, 'chats'), {
        chatId,
        content: input.trim(),
        senderId: user.uid,
        senderName: user.displayName,
        timestamp: serverTimestamp()
      });
      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[400px] flex flex-col">
      <div className="p-3 border-b border-gray-800">
        <h3 className="font-semibold">{friendName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                message.senderId === user?.uid
                  ? 'bg-purple-500/10 text-purple-50'
                  : 'bg-black/30 border border-gray-800'
              }`}
            >
              <p className="text-sm text-gray-400 mb-1">{message.senderName}</p>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
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
  );
}