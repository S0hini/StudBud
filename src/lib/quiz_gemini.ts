const apiKey = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;

if (!apiKey) {
  throw new Error("VITE_PUBLIC_GROQ_API_KEY is not defined in environment variables");
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama3-70b-8192"; // Or your preferred Groq model

export const getQuizQuestions = async (
  course: string,
  topic: string,
  level: string
): Promise<{ questions: { question: string; options: string[]; answer: string; explanation: string }[] }> => {
  try {
    const prompt = `
      Generate 10 multiple-choice questions (MCQs) on "${topic}" related to "${course}" 
      for the "${level}" level. Each question should have exactly 4 options, one correct answer, 
      and a brief explanation of why that answer is correct.

      Respond ONLY with a valid JSON array, no preamble, no explanation, no markdown, no text before or after the JSON. 
      Each object must have "question", "options", "answer", and "explanation" fields.

      Example:
      [
        {
          "question": "What is ...?",
          "options": ["A", "B", "C", "D"],
          "answer": "A",
          "explanation": "..."
        }
      ]
    `;

    const messages = [
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
    const responseText = data.choices?.[0]?.message?.content || "";

    // Extract JSON array from the response
    let jsonContent = responseText;
    try {
      // Find the first '[' and last ']'
      const startIndex = responseText.indexOf('[');
      const endIndex = responseText.lastIndexOf(']') + 1;

      if (startIndex >= 0 && endIndex > startIndex) {
        jsonContent = responseText.substring(startIndex, endIndex);
      }

      // Try parsing, if fails, try to fix common issues
      let quizData;
      try {
        quizData = JSON.parse(jsonContent);
      } catch (e) {
        // Attempt to fix common JSON issues
        jsonContent = jsonContent
          .replace(/,\s*}/g, '}') // Remove trailing commas before }
          .replace(/,\s*]/g, ']') // Remove trailing commas before ]
          .replace(/(\r\n|\n|\r)/gm, ""); // Remove newlines

        // Fix missing "answer" keys (very basic, for this specific error)
        jsonContent = jsonContent.replace(/("options":\s*\[[^\]]+\],)\s*("[^"]+",)/g, '$1 "answer": $2');

        quizData = JSON.parse(jsonContent);
      }

      if (!Array.isArray(quizData)) {
        throw new Error("Response is not an array");
      }

      const validatedData = quizData.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || !q.answer) {
          console.error(`Invalid question at index ${index}:`, q);
          throw new Error(`Question at index ${index} has invalid format`);
        }

        if (!q.explanation) {
          q.explanation = `The correct answer is "${q.answer}". This is an important concept in ${topic} for ${level} level ${course}.`;
        }

        return q;
      });

      return { questions: validatedData };
    } catch (parseError) {
      console.error("Error parsing Groq response:", parseError);
      console.error("Raw response:", responseText);
      throw new Error("Failed to parse response from Groq API");
    }
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return { questions: [] };
  }
};