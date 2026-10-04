import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const quizRouter = Router();

// POST /api/quiz/generate
quizRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { course, topic, level, count = 10 } = req.body;

    if (!course || !topic || !level) {
      return res.status(400).json({ error: 'course, topic, and level are required fields' });
    }

    const groqKey = process.env.VITE_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    const geminiKey = process.env.VITE_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    const prompt = `
Generate ${count} multiple-choice questions (MCQs) on "${topic}" related to "${course}" 
for the "${level}" level. Each question should have exactly 4 options, one correct answer (matching one of the option strings or option letter), 
and a brief explanation of why that answer is correct.

Respond ONLY with a valid JSON array, no preamble, no markdown backticks, no text before or after the JSON.
Each object must have "question", "options" (array of 4 strings), "answer" (string), and "explanation" (string) fields.

Example structure:
[
  {
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Option A is correct because..."
  }
]
`;

    let rawText = '';

    if (groqKey) {
      const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "allam-2-7b", "llama-3.3-70b-versatile"];
      for (const groqModel of groqModels) {
        try {
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 3000
            })
          });

          if (groqResponse.ok) {
            const data = await groqResponse.json();
            rawText = data.choices?.[0]?.message?.content || "";
            if (rawText) break;
          }
        } catch (err) {
          console.warn(`[Quiz Groq] Model ${groqModel} failed:`, err);
        }
      }
    }

    if (!rawText && geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro-latest", "gemini-pro"];
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          rawText = response.text();
          if (rawText) break;
        } catch (geminiErr: any) {
          console.warn(`[Quiz] Gemini ${modelName} failed:`, geminiErr?.message);
        }
      }
    }

    if (!rawText) {
      return res.status(503).json({
        error: 'Quiz AI service is not available. Please configure API keys in .env.'
      });
    }

    // Clean JSON content
    let jsonContent = rawText.trim();
    const startIndex = jsonContent.indexOf('[');
    const endIndex = jsonContent.lastIndexOf(']') + 1;

    if (startIndex >= 0 && endIndex > startIndex) {
      jsonContent = jsonContent.substring(startIndex, endIndex);
    }

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(jsonContent);
    } catch {
      // Fallback cleanup
      const cleaned = jsonContent
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/(\r\n|\n|\r)/gm, ' ');
      parsedQuestions = JSON.parse(cleaned);
    }

    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not a valid question array');
    }

    const validated = parsedQuestions.map((q, idx) => ({
      question: q.question || `Question ${idx + 1}`,
      options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
      answer: q.answer || (Array.isArray(q.options) ? q.options[0] : 'A'),
      explanation: q.explanation || `The correct answer is "${q.answer}". Important concept in ${topic} for ${level} level.`
    }));

    return res.json({
      success: true,
      course,
      topic,
      level,
      questions: validated
    });
  } catch (err: any) {
    console.error('[Quiz] Generation error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate quiz questions' });
  }
});
