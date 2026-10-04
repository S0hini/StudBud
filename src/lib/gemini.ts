// Multi-provider AI Study Assistant helper (Backend -> Groq -> Gemini)
import { GoogleGenerativeAI } from '@google/generative-ai';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b",
  "gemini-pro"
];

const startChat = async () => {
  return {
    history: [],
  };
};

const generateContent = async (prompt: string, history: any[] = []): Promise<string> => {
  const geminiApiKey = (import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '').trim();
  const groqApiKey = (import.meta.env.VITE_PUBLIC_GROQ_API_KEY || '').trim();

  // 1. Try Backend Server Tutor Endpoint
  try {
    const response = await fetch('/api/ai/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': geminiApiKey,
        'x-groq-key': groqApiKey
      },
      body: JSON.stringify({
        message: prompt,
        history
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.content) {
        return data.content;
      }
    }
  } catch (backendErr) {
    console.warn("[AI Tutor] Backend unavailable, trying client-side AI providers...", backendErr);
  }

  // 2. Try Client-side Groq if key exists
  if (groqApiKey) {
    const messages = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: "user", content: prompt }
    ];

    for (const groqModel of GROQ_MODELS) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: groqModel,
            messages,
            max_tokens: 2048,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        } else {
          const errText = await response.text();
          console.warn(`[AI Tutor] Groq model ${groqModel} returned status ${response.status}:`, errText);
        }
      } catch (groqErr) {
        console.warn(`[AI Tutor] Client Groq call with ${groqModel} failed:`, groqErr);
      }
    }
  }

  // 3. Try Client-side Gemini if key exists
  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          if (text) return text;
        } catch (mErr) {
          console.warn(`[AI Tutor] Gemini model ${modelName} failed:`, mErr);
        }
      }
    } catch (geminiErr) {
      console.warn("[AI Tutor] Client Gemini call failed:", geminiErr);
    }
  }

  throw new Error(
    "AI Study Assistant could not generate a response. Please check that either VITE_PUBLIC_GROQ_API_KEY or VITE_PUBLIC_GEMINI_API_KEY is configured in your .env file."
  );
};

export { startChat, generateContent };