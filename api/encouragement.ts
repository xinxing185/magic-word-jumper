import type { IncomingMessage, ServerResponse } from 'http';
import { generateEncouragement, getAiProvider } from './aiProvider';

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

  const body = getBody(req.body);
  const score = clampScore(body.score);
  const total = Math.max(1, clampScore(body.total));
  const provider = getAiProvider();

  try {
    const message = await generateEncouragement(score, total, provider);

    return res.status(200).json({
      message: message || 'Wow! You are a superstar! Keep playing! 🌟',
    });
  } catch (error) {
    console.error(`${provider} encouragement error:`, error);
    return res.status(502).json({ error: 'Failed to generate encouragement' });
  }
}
