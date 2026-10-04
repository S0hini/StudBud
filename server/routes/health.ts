import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const envStatus = {
    hasGroqKey: !!(process.env.VITE_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY),
    hasGeminiKey: !!(process.env.VITE_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    hasYouTubeKey: !!(process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY),
    hasFirebaseKey: !!(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY),
  };

  res.json({
    status: 'ok',
    service: 'StudBud Backend API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: envStatus
  });
});
