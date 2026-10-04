import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const quizRouter = Router();

function sanitizeJsonForLatex(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/\\(frac|to|tan|times|theta|text|tau|textbf|tilde|top|begin|end|beta|bar|bullet|bmod|boxed|binom|bmatrix|pmatrix|vmatrix|cases|cdot|cos|csc|cot|cosh|sinh|tanh|deg|det|dim|div|exp|gcd|hom|inf|injlim|ker|lg|lim|liminf|limsup|ln|log|max|min|Pr|sec|sin|sup|sqrt|sum|prod|int|oint|partial|nabla|infty|alpha|gamma|delta|epsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|upsilon|phi|chi|psi|omega|le|ge|neq|approx|equiv|sim|pm|mp|cap|cup|subset|subseteq|in|notin|forall|exists|neg|lor|land|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|mapsto|uparrow|downarrow|displaystyle|left|right|big|Big|bigg|Bigg|over|under)/g, '\\\\$1');
  s = s.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
  return s;
}

// POST /api/quiz/generate
quizRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { course, topic, level, count = 8 } = req.body;

    if (!course || !topic || !level) {
      return res.status(400).json({ error: 'course, topic, and level are required fields' });
    }

    const groqKey = process.env.VITE_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    const geminiKey = process.env.VITE_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    const prompt = `Generate ${count} multiple-choice questions (MCQs) on "${topic}" related to "${course}" for the "${level}" difficulty level.
Each question must have exactly 4 options.
For the "answer" field, specify the EXACT string matching one of the options in the "options" array.
For any mathematical formulas or symbols, format with LaTeX dollar delimiters (e.g. $\\lim_{x \\to 0} \\frac{\\sin x}{x}$, $x^2$, $\\infty$).
Keep explanations concise (1-2 sentences).

Respond ONLY with a valid JSON array:
[
  {
    "question": "What is ...?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": "Option 1",
    "explanation": "Brief explanation."
  }
]`;

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
              max_tokens: 4096,
              temperature: 0.5
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
      const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro"];
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
    let jsonContent = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIndex = jsonContent.indexOf('[');
    const endIndex = jsonContent.lastIndexOf(']');

    if (startIndex >= 0 && endIndex > startIndex) {
      jsonContent = jsonContent.substring(startIndex, endIndex + 1);
    }

    const sanitized = sanitizeJsonForLatex(jsonContent);

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(sanitized);
    } catch {
      try {
        parsedQuestions = JSON.parse(jsonContent);
      } catch {
        const objectRegex = /\{\s*"question"[\s\S]*?"(?:explanation|answer)"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g;
        const matches = sanitized.match(objectRegex) || jsonContent.match(objectRegex);
        if (matches && matches.length > 0) {
          parsedQuestions = matches.map((m) => {
            try { return JSON.parse(m); } catch { return null; }
          }).filter(Boolean);
        }
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error('Response is not a valid question array');
    }

    const validated = parsedQuestions.map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : ['A', 'B', 'C', 'D'];
      let rawAnswer = String(q.answer || '').trim();
      let finalAnswer = options[0];

      const letterMatch = rawAnswer.match(/^(?:Option\s*)?([A-D])(?:\b|\))/i);
      if (letterMatch) {
        const letterIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < options.length) {
          finalAnswer = options[letterIdx];
        }
      } else {
        const exact = options.find((o) => o.toLowerCase() === rawAnswer.toLowerCase());
        if (exact) finalAnswer = exact;
      }

      return {
        question: q.question || `Question ${idx + 1}`,
        options: options.slice(0, 4),
        answer: finalAnswer,
        explanation: q.explanation || `The correct answer is "${finalAnswer}". Important concept in ${topic} for ${level} level.`
      };
    });

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
