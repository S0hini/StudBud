import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRouter } from './routes/health.js';
import { youtubeRouter } from './routes/youtube.js';
import { aiRouter } from './routes/ai.js';
import { quizRouter } from './routes/quiz.js';

// Load environment variables from .env in project root
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/ai', aiRouter);
app.use('/api/quiz', quizRouter);

// Root greeting
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🎓 StudBud Backend API Server is running!',
    endpoints: {
      health: '/api/health',
      youtubeTranscript: 'POST /api/youtube/transcript',
      aiTutor: 'POST /api/ai/tutor',
      aiNotes: 'POST /api/ai/generate-notes',
      quizGenerate: 'POST /api/quiz/generate'
    }
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 StudBud Backend running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
