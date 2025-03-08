import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_PUBLIC_GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const getQuizQuestions = async (
  course: string,
  topic: string,
  level: string
): Promise<{ questions: { question: string; options: string[]; answer: string }[] }> => {
  try {
    const prompt = `
      Generate 10 multiple-choice questions (MCQs) on "${topic}" related to "${course}" 
      for the "${level}" level. Each question should have exactly 4 options, one correct answer, 
      and a clear answer key. Format the output as follows:

      [
        {
          "question": "What is the primary key in RDBMS?",
          "options": ["Unique identifier", "Foreign key", "Primary storage", "Database schema"],
          "answer": "Unique identifier"
        },
        ...
      ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const quizData = JSON.parse(responseText);

    return { questions: quizData };
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return { questions: [] };
  }
};
