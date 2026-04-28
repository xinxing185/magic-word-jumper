import { GoogleGenAI, Type } from '@google/genai';
import type { LevelMeta } from '../types';

export type AiProvider = 'deepseek' | 'gemini';

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

const WORD_BANK_TARGET_SIZE = 80;

const WORD_BANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    levelId: {
      type: Type.STRING,
    },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: {
            type: Type.STRING,
          },
          icon: {
            type: Type.STRING,
          },
          category: {
            type: Type.STRING,
          },
        },
        required: ['word', 'icon', 'category'],
      },
    },
  },
  required: ['levelId', 'words'],
};

export const getAiProvider = (): AiProvider => {
  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  return configuredProvider === 'gemini' ? 'gemini' : 'deepseek';
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};

const buildWordBankPrompt = (levelMeta: LevelMeta) => `
Create a kid-safe English word bank for a reading game.

Level:
- id: ${levelMeta.id}
- name: ${levelMeta.name}
- theme/category: ${levelMeta.category}

Return exactly ${WORD_BANK_TARGET_SIZE} unique words.

Rules:
- Match the reading difficulty implied by the Raz level name.
- Prefer concrete nouns, simple verbs, familiar school/home/nature/community words.
- Use lowercase English words only.
- Do not include spaces, punctuation, proper nouns, brand names, scary words, or adult topics.
- Each word must have one clear emoji icon.
- Use short category labels such as animals, food, nature, home, school, action, people, places, objects.
- Make words varied enough that a child can replay the game without seeing the same words constantly.

Return only valid JSON in this exact shape:
{
  "levelId": "${levelMeta.id}",
  "words": [
    { "word": "apple", "icon": "🍎", "category": "food" }
  ]
}
`;

const buildEncouragementPrompt = (score: number, total: number) => `My 5-year-old daughter just finished a word learning game. She got ${score} out of ${total} correct.
Write a short (max 20 words), extremely encouraging, and fun message for her in English.
Include some emojis!`;

const requestDeepSeek = async (messages: Array<{ role: 'system' | 'user'; content: string }>, jsonOutput = false) => {
  const apiKey = getRequiredEnv('DEEPSEEK_API_KEY');
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: jsonOutput ? 0.45 : 0.7,
      max_tokens: jsonOutput ? 8192 : 120,
      ...(jsonOutput ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API returned ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const payload = await response.json() as DeepSeekChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek returned an empty response');
  }
  console.log('DeepSeek response:', content);
  
  return content.trim();
};

const generateDeepSeekWordBankText = (levelMeta: LevelMeta) => (
  requestDeepSeek([
    {
      role: 'system',
      content: 'You create safe, age-appropriate English learning content for children. Always return valid JSON only.',
    },
    {
      role: 'user',
      content: buildWordBankPrompt(levelMeta),
    },
  ], true)
);

const generateGeminiWordBankText = async (levelMeta: LevelMeta) => {
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const model = process.env.GEMINI_WORD_BANK_MODEL?.trim() || 'gemini-2.5-flash-lite';
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildWordBankPrompt(levelMeta),
    config: {
      responseMimeType: 'application/json',
      responseSchema: WORD_BANK_SCHEMA,
      temperature: 0.45,
      maxOutputTokens: 8192,
    },
  });

  return response.text || '';
};

const generateDeepSeekEncouragement = (score: number, total: number) => (
  requestDeepSeek([
    {
      role: 'system',
      content: 'You write warm, playful encouragement for young children. Keep the response short.',
    },
    {
      role: 'user',
      content: buildEncouragementPrompt(score, total),
    },
  ])
);

const generateGeminiEncouragement = async (score: number, total: number) => {
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const model = process.env.GEMINI_ENCOURAGEMENT_MODEL?.trim() || 'gemini-3-flash-preview';
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildEncouragementPrompt(score, total),
  });

  return response.text || '';
};

export const generateWordBankText = (levelMeta: LevelMeta, provider = getAiProvider()) => (
  provider === 'gemini' ? generateGeminiWordBankText(levelMeta) : generateDeepSeekWordBankText(levelMeta)
);

export const generateEncouragement = (score: number, total: number, provider = getAiProvider()) => (
  provider === 'gemini' ? generateGeminiEncouragement(score, total) : generateDeepSeekEncouragement(score, total)
);
