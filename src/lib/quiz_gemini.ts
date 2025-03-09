import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_QUIZ_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_QUIZ_GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using the latest available model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export const getQuizQuestions = async (
  course: string,
  topic: string,
  level: string
): Promise<{ questions: { question: string; options: string[]; answer: string; explanation: string }[] }> => {
  try {
    const prompt = `
      Generate 10 multiple-choice questions (MCQs) on "${topic}" related to "${course}" 
      for the "${level}" level. Each question should have exactly 4 options, one correct answer, 
      and a brief explanation of why that answer is correct. Format the output as a valid JSON array like this:

      [
        {
          "question": "What is the primary key in RDBMS?",
          "options": ["Unique identifier", "Foreign key", "Primary storage", "Database schema"],
          "answer": "Unique identifier",
          "explanation": "A primary key is a unique identifier that distinguishes each record in a database table. Unlike foreign keys that reference other tables, primary storage that refers to physical storage, or database schemas that define the structure, primary keys uniquely identify each row."
        },
        ...
      ]

      Ensure the explanation is educational and helps the student understand why the answer is correct.
      Ensure the response contains only valid JSON without any extra text or explanations outside the JSON structure.
    `;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    console.log("Raw API response:", responseText); // For debugging
    
    // Try to extract just the JSON part if there's any extra text
    let jsonContent = responseText;
    try {
      // Find the first [ and last ] to extract just the JSON array
      const startIndex = responseText.indexOf('[');
      const endIndex = responseText.lastIndexOf(']') + 1;
      
      if (startIndex >= 0 && endIndex > startIndex) {
        jsonContent = responseText.substring(startIndex, endIndex);
      }
      
      const quizData = JSON.parse(jsonContent);
      
      // Validate that the structure is correct
      if (!Array.isArray(quizData)) {
        throw new Error("Response is not an array");
      }
      
      // Validate each question has the required fields
      const validatedData = quizData.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || !q.answer) {
          console.error(`Invalid question at index ${index}:`, q);
          throw new Error(`Question at index ${index} has invalid format`);
        }
        
        // Ensure there's an explanation, or create a default one
        if (!q.explanation) {
          q.explanation = `The correct answer is "${q.answer}". This is an important concept in ${topic} for ${level} level ${course}.`;
        }
        
        return q;
      });
      
      return { questions: validatedData };
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.error("Raw response:", responseText);
      throw new Error("Failed to parse response from Gemini API");
    }
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return { questions: [] };
  }
};