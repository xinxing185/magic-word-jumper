import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'http';

type ApiRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type ApiResponse = ServerResponse & {
  status: (statusCode: number) => ApiResponse;
  json: (body: unknown) => void;
};

const getBody = (body: unknown): Record<string, unknown> => (
  body && typeof body === 'object' ? body as Record<string, unknown> : {}
);

const clampScore = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : 0;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  }

  const body = getBody(req.body);
  const score = clampScore(body.score);
  const total = Math.max(1, clampScore(body.total));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `My 5-year-old daughter just finished a word learning game. She got ${score} out of ${total} correct.
Write a short (max 20 words), extremely encouraging, and fun message for her in English.
Include some emojis!`,
    });

    return res.status(200).json({
      message: response.text || 'Wow! You are a superstar! Keep playing! 🌟',
    });
  } catch (error) {
    console.error('Gemini encouragement error:', error);
    return res.status(502).json({ error: 'Failed to generate encouragement' });
  }
}
