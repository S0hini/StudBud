// lib/groq.ts
const getApiKey = () => import.meta.env.VITE_PUBLIC_GROQ_API_KEY || '';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "openai/gpt-oss-120b"; // Stable default Groq model

// Start a chat (returns initial history structure)
const startChat = async () => {
  return {
    history: [],
  };
};

// Generate content using the Groq API
const generateContent = async (prompt: string, history: any[] = []) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Groq API Key is not configured. Please set VITE_PUBLIC_GROQ_API_KEY in your .env file.');
    }

    const messages = [
      ...history,
      { role: "user", content: prompt }
    ];

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

export { startChat, generateContent };