// lib/groq.ts
const apiKey = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;

if (!apiKey) {
  throw new Error('VITE_PUBLIC_GROQ_API_KEY is not defined in environment variables');
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama3-70b-8192"; // Change to your preferred Groq model

// Start a chat (returns initial history structure)
const startChat = async () => {
  return {
    history: [],
  };
};

// Generate content using the Groq API
const generateContent = async (prompt: string, history: any[] = []) => {
  try {
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
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

export { startChat, generateContent };