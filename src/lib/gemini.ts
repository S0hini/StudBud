import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
export const model = genAI.getGenerativeModel({ model: 'gemini-pro' });