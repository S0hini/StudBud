const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
  "llama-3.3-70b-versatile"
];

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

// Helper to safely parse and normalize questions from raw AI responses
function parseAndNormalizeQuizJson(
  rawText: string,
  topic: string,
  level: string,
  course: string
): QuizQuestion[] {
  if (!rawText) return [];

  // 1. Clean markdown fences and isolate JSON
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const startIndex = cleaned.indexOf('[');
  const endIndex = cleaned.lastIndexOf(']');

  if (startIndex >= 0 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }

  let rawList: any[] = [];

  // 2. Direct JSON Parse attempt
  try {
    rawList = JSON.parse(cleaned);
  } catch (directErr) {
    // 3. Fallback: Parse individual JSON objects in case array was cut off
    try {
      // Find all complete object blocks { ... }
      const objectRegex = /\{\s*"question"[\s\S]*?"explanation"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g;
      const matches = cleaned.match(objectRegex);
      if (matches && matches.length > 0) {
        rawList = matches.map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    } catch (regexErr) {
      console.warn("Regex object extraction fallback failed:", regexErr);
    }
  }

  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error("Failed to parse valid quiz questions from AI response");
  }

  // 4. Normalize fields, options, and answer mappings
  const validated: QuizQuestion[] = [];

  for (const item of rawList) {
    if (!item.question || !Array.isArray(item.options) || item.options.length < 2) {
      continue;
    }

    const options = item.options.map((opt: any) => String(opt).trim());
    let rawAnswer = String(item.answer || '').trim();
    let finalAnswer = options[0];

    // Check if answer is letter notation like "A", "B", "C", "D" or "Option A"
    const letterMatch = rawAnswer.match(/^(?:Option\s*)?([A-D])(?:\b|\))/i);
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        finalAnswer = options[idx];
      }
    } else {
      // Check if rawAnswer exactly matches one of the options
      const exactMatch = options.find((opt) => opt.toLowerCase() === rawAnswer.toLowerCase());
      if (exactMatch) {
        finalAnswer = exactMatch;
      } else {
        // Fallback: search for partial match
        const partialMatch = options.find((opt) => rawAnswer.toLowerCase().includes(opt.toLowerCase()) || opt.toLowerCase().includes(rawAnswer.toLowerCase()));
        if (partialMatch) {
          finalAnswer = partialMatch;
        }
      }
    }

    validated.push({
      question: item.question.trim(),
      options: options.slice(0, 4),
      answer: finalAnswer,
      explanation: item.explanation
        ? item.explanation.trim()
        : `The correct answer is "${finalAnswer}". This is an essential concept in ${topic} for ${level} level ${course}.`
    });
  }

  if (validated.length === 0) {
    throw new Error("No valid quiz questions could be extracted");
  }

  return validated;
}

export const getQuizQuestions = async (
  course: string,
  topic: string,
  level: string
): Promise<{ questions: QuizQuestion[] }> => {
  const apiKey = (import.meta.env.VITE_PUBLIC_GROQ_API_KEY || '').trim();
  const geminiApiKey = (import.meta.env.VITE_PUBLIC_GEMINI_API_KEY || '').trim();

  const prompt = `Generate 8 multiple-choice questions (MCQs) on "${topic}" related to "${course}" for the "${level}" difficulty level.
Each question must have exactly 4 options.
For the "answer" field, specify the EXACT string matching one of the options in the "options" array.
For any mathematical formulas or symbols, format cleanly with LaTeX delimiters (e.g. \\lim_{x \\to 0} \\frac{\\sin x}{x}, x^2, \\infty).
Keep explanations concise (1-2 sentences).

Respond ONLY with a valid JSON array matching this exact schema:
[
  {
    "question": "What is ...?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": "Option 1",
    "explanation": "Brief 1-sentence explanation."
  }
]`;

  // 1. Try backend quiz generation first
  try {
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course, topic, level, count: 8 })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        return { questions: data.questions };
      }
    }
  } catch (backendErr) {
    console.warn("[Quiz] Backend endpoint unavailable, trying client Groq...", backendErr);
  }

  // 2. Client Groq Fallback
  if (apiKey) {
    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            temperature: 0.6
          })
        });

        if (response.ok) {
          const data = await response.json();
          const responseText = data.choices?.[0]?.message?.content || "";
          if (responseText) {
            const parsed = parseAndNormalizeQuizJson(responseText, topic, level, course);
            if (parsed.length > 0) {
              return { questions: parsed };
            }
          }
        }
      } catch (err) {
        console.warn(`[Quiz Groq] Model ${model} failed:`, err);
      }
    }
  }

  throw new Error("Failed to generate quiz questions. Please check your Groq API key.");
};