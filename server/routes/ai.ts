import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

export const aiRouter = Router();

// Refresh environment variables on request
const getEnvKeys = (req: Request) => {
  dotenv.config();
  const geminiKey = (
    (req.headers['x-gemini-key'] as string) ||
    req.body.geminiApiKey ||
    process.env.VITE_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ''
  ).trim();

  const groqKey = (
    (req.headers['x-groq-key'] as string) ||
    req.body.groqApiKey ||
    process.env.VITE_PUBLIC_GROQ_API_KEY ||
    process.env.GROQ_API_KEY ||
    ''
  ).trim();

  return { geminiKey, groqKey };
};

const GROQ_CANDIDATE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

const GEMINI_CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b",
  "gemini-pro"
];

// Helper to query Groq
async function queryGroq(apiKey: string, messages: any[], maxTokens = 2048): Promise<string | null> {
  for (const model of GROQ_CANDIDATE_MODELS) {
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        const errText = await groqResponse.text();
        console.warn(`[AI Groq] Model ${model} returned ${groqResponse.status}:`, errText);
      }
    } catch (err) {
      console.warn(`[AI Groq] Model ${model} network error:`, err);
    }
  }
  return null;
}

// POST /api/ai/tutor
aiRouter.post('/tutor', async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A message prompt is required' });
    }

    const { geminiKey, groqKey } = getEnvKeys(req);

    const formattedPrompt = `Please explain the topic: "${message}" in ENGLISH.
Use bold text with markdown formatting (e.g., **word**) for important terms.
For any mathematical formulas, equations, or limits, always format with LaTeX delimiters:
- Inline math: $a^{\\infty}$, $\\lim_{x \\to a} f(x)$, $0^0$, $\\infty^0$
- Display math: $$ \\lim_{x\\to a} f(x)^{g(x)} = \\exp\\left( \\lim_{x\\to a} g(x) \\ln f(x) \\right) $$

Provide a comprehensive explanation in the following format:
📌 **BRIEF OVERVIEW:**
[Provide a 2-3 sentence introduction in English, using **bold** for key terms]
🎯 **KEY CONCEPTS:**
• **[Key term 1]**: [Definition]
• **[Key term 2]**: [Definition]
• **[Key term 3]**: [Definition]
📝 **DETAILED EXPLANATION:**
• **[Main concept 1]**
  - [Detailed explanation with **bold** key terms and clear LaTeX math if applicable]
  - [Supporting details]
• **[Main concept 2]**
  - [Detailed explanation with **bold** key terms]
  - [Supporting details]
💡 **EXAMPLES:**
• **Example 1**: [Practical application or worked equation]
• **Example 2**: [Practical application]
✨ **SUMMARY:**
[Brief summary highlighting **key terms** and main points]
Remember to respond in clear ENGLISH and use **bold** formatting (with double asterisks) for important terms throughout.`;

    // Try Groq API first if key exists
    if (groqKey) {
      const groqMessages = [
        ...history.map((h: any) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: formattedPrompt }
      ];
      const groqResult = await queryGroq(groqKey, groqMessages, 2048);
      if (groqResult) {
        return res.json({ success: true, content: groqResult, provider: 'groq' });
      }
    }

    // Fallback to Gemini
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(formattedPrompt);
          const response = await result.response;
          const text = response.text();
          if (text) return res.json({ success: true, content: text, provider: 'gemini', model: modelName });
        } catch (geminiErr: any) {
          console.warn(`[AI Tutor] Gemini ${modelName} failed:`, geminiErr?.message);
        }
      }
    }

    return res.status(503).json({
      error: 'AI service not configured. Please add VITE_PUBLIC_GROQ_API_KEY or VITE_PUBLIC_GEMINI_API_KEY in your .env file.'
    });
  } catch (err: any) {
    console.error('[AI] Tutor endpoint error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to process AI Tutor query' });
  }
});

// POST /api/ai/generate-notes
aiRouter.post('/generate-notes', async (req: Request, res: Response) => {
  try {
    const { videoUrl, videoTitle, videoDescription, transcript } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    const { geminiKey, groqKey } = getEnvKeys(req);

    let prompt = `You are an expert academic tutor. Generate comprehensive, well-structured academic notes in ENGLISH based on the following YouTube video content:\n\n`;
    prompt += `YouTube URL: ${videoUrl}\n\n`;
    if (videoTitle) prompt += `Video Title: ${videoTitle}\n\n`;
    if (videoDescription) prompt += `Video Description: ${videoDescription}\n\n`;
    if (transcript) prompt += `Transcript (Translate to English if needed):\n${transcript.substring(0, 35000)}\n\n`;

    prompt += `
CRITICAL REQUIREMENT:
Regardless of what language the video title, description, or transcript is in (e.g. Arabic, Hindi, Spanish, etc.), write all notes strictly in clean, well-formatted ENGLISH.

Structure the notes as follows:
# [Clear English Title for the Lecture]

## 📌 Executive Overview
* Concise 2-3 paragraph summary in English explaining what the lecture covers and its core objectives.

## 🎯 Key Concepts & Definitions
* **[Concept/Term 1]**: Clear English explanation and definition.
* **[Concept/Term 2]**: Clear English explanation and definition.
* **[Concept/Term 3]**: Clear English explanation and definition.

## 📝 Detailed Lecture Breakdown
### 1. [Main Topic 1]
* Detailed point with **bold** key terms and explanations.
* Important formulas, theories, or mechanisms.
### 2. [Main Topic 2]
* In-depth details and context.
* Practical examples or problems discussed.

## 💡 Practical Examples & Applications
* Real-world applications or sample worked examples.

## ✨ Summary Takeaways
* Bullet points of the most essential takeaways to remember for exams or studying.

MATHEMATICAL NOTATION:
- For any mathematical equations, powers, fractions, limits, or formulas, always format them with standard LaTeX delimiters:
  - Inline math: $a^{\\infty}$, $\\lim_{x \\to a} f(x)$, $0^0$, $\\infty^0$
  - Display equations: $$ \\lim_{x\\to a} f(x)^{g(x)} = \\exp\\left( \\lim_{x\\to a} g(x) \\ln f(x) \\right) $$
- Never output raw brackets or unescaped parentheses for math.

Ensure the Markdown is rich, clean, formatted with proper headings (#, ##, ###), bold (**term**), and bullet points (*).`;

    // 1. Try Groq first for fast and reliable response
    if (groqKey) {
      const groqResult = await queryGroq(groqKey, [{ role: 'user', content: prompt }], 3000);
      if (groqResult) {
        return res.json({ success: true, notes: groqResult, provider: 'groq' });
      }
    }

    // 2. Try Gemini with candidate models
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          if (text) return res.json({ success: true, notes: text, provider: 'gemini', model: modelName });
        } catch (geminiErr: any) {
          console.warn(`[AI Notes] Gemini ${modelName} failed:`, geminiErr?.message);
        }
      }
    }

    return res.status(503).json({
      error: 'AI note generator could not generate notes. Please verify your VITE_PUBLIC_GROQ_API_KEY or VITE_PUBLIC_GEMINI_API_KEY.'
    });
  } catch (err: any) {
    console.error('[AI] Generate notes error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate notes' });
  }
});

// POST /api/ai/recommend-lectures
aiRouter.post('/recommend-lectures', async (req: Request, res: Response) => {
  try {
    const { subject, topic } = req.body;
    if (!subject && !topic) {
      return res.status(400).json({ error: 'Subject or topic is required' });
    }

    const { geminiKey, groqKey } = getEnvKeys(req);
    const prompt = `Recommend 6 top educational YouTube lectures or channels for studying the subject "${subject || 'General'}" on topic "${topic}".
Respond ONLY with a valid JSON array of objects with fields:
- title: string (descriptive lecture title)
- channelName: string (top YouTube educator/channel e.g. Gate Smashers, NPTEL, 3Blue1Brown, Khan Academy, freeCodeCamp, MIT OpenCourseWare, etc.)
- description: string (2 sentence overview of what this covers)
- searchQuery: string (exact search term to find it on YouTube)

JSON format only, no markdown or text:
[
  {
    "title": "...",
    "channelName": "...",
    "description": "...",
    "searchQuery": "..."
  }
]`;

    let content: string | null = null;
    if (groqKey) {
      content = await queryGroq(groqKey, [{ role: 'user', content: prompt }], 1500);
    }

    if (!content && geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          content = response.text();
          if (content) break;
        } catch {}
      }
    }

    if (content) {
      try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        return res.json({ success: true, recommendations: parsed });
      } catch (parseErr) {
        console.warn('Failed to parse lecture recommendation JSON:', parseErr);
      }
    }

    return res.json({
      success: true,
      recommendations: [
        {
          title: `${topic} Complete Lecture & Concept Breakdown`,
          channelName: `${subject || 'Academic'} Mastery`,
          description: `Comprehensive video lecture covering fundamental concepts, problem solving, and theory for ${topic}.`,
          searchQuery: `${subject || ''} ${topic} lecture`
        }
      ]
    });
  } catch (err: any) {
    console.error('[AI Recommend Lectures] Error:', err);
    return res.status(500).json({ error: 'Failed to recommend lectures' });
  }
});
