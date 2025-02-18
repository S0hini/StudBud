// lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// For Vite, we use import.meta.env instead of process.env
const apiKey = import.meta.env.VITE_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('VITE_PUBLIC_GEMINI_API_KEY is not defined in environment variables');
}

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(apiKey);

// Initialize the model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Create a chat instance
const startChat = async () => {
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 2048,
    },
  });
  return chat;
};

// Generate content using the model
const generateContent = async (prompt:"You are a chatbot who fetches info from youtube link and shows it") => {
  try {
    const result = await model.generateContent(prompt);
    return result;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

export { model, startChat, generateContent };