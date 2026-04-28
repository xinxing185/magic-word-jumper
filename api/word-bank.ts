import { GoogleGenAI, Type } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'http';
import { LEVEL_METADATA } from '../constants.js';
import type { LevelMeta, WordEntry } from '../types';

type ApiRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type ApiResponse = ServerResponse & {
  status: (statusCode: number) => ApiResponse;
  json: (body: unknown) => void;
};

type GeneratedWordBankPayload = {
  levelId?: unknown;
  words?: unknown;
};

const WORD_BANK_MODEL = 'gemini-2.5-flash-lite';
const WORD_BANK_TARGET_SIZE = 80;
const MIN_GENERATED_WORDS = 50;

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

const getBody = (body: unknown): Record<string, unknown> => (
  body && typeof body === 'object' ? body as Record<string, unknown> : {}
);

const getLevelMeta = (levelId: string) => LEVEL_METADATA.find(level => level.id === levelId);

const normalizeWord = (word: string) => word.trim().toLowerCase();

const normalizeCategory = (category: string) => category.trim().toLowerCase() || 'general';

const isPlayableWord = (word: string) => /^[a-z]+(?:-[a-z]+)?$/.test(word) && word.length <= 14;

const isUsableIcon = (icon: string) => icon.trim().length > 0 && icon.trim().length <= 8;

const normalizeWords = (words: unknown): WordEntry[] => {
  if (!Array.isArray(words)) return [];

  const wordsByKey = new Map<string, WordEntry>();

  words.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<Record<keyof WordEntry, unknown>>;
    if (typeof candidate.word !== 'string' || typeof candidate.icon !== 'string') return;

    const word = normalizeWord(candidate.word);
    const icon = candidate.icon.trim();
    const category = typeof candidate.category === 'string' ? normalizeCategory(candidate.category) : 'general';

    if (!isPlayableWord(word) || !isUsableIcon(icon) || wordsByKey.has(word)) return;
    wordsByKey.set(word, { word, icon, category });
  });

  return Array.from(wordsByKey.values());
};

const parseGeneratedWordBank = (text: string, levelMeta: LevelMeta) => {
  const parsed = JSON.parse(text) as GeneratedWordBankPayload;
  const words = normalizeWords(parsed.words);

  if (parsed.levelId !== levelMeta.id) {
    console.warn(`Generated word bank level mismatch: expected ${levelMeta.id}, got ${String(parsed.levelId)}`);
  }

  if (words.length < MIN_GENERATED_WORDS) {
    throw new Error(`Generated word bank only had ${words.length} usable words`);
  }

  return words.slice(0, WORD_BANK_TARGET_SIZE);
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
`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  }

  const body = getBody(req.body);
  const levelId = typeof body.levelId === 'string' ? body.levelId : '';
  const levelMeta = getLevelMeta(levelId);

  if (!levelMeta) {
    return res.status(400).json({ error: 'Unknown levelId' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: WORD_BANK_MODEL,
      contents: buildWordBankPrompt(levelMeta),
      config: {
        responseMimeType: 'application/json',
        responseSchema: WORD_BANK_SCHEMA,
        temperature: 0.45,
        maxOutputTokens: 8192,
      },
    });

    const words = parseGeneratedWordBank(response.text || '', levelMeta);

    return res.status(200).json({
      ...levelMeta,
      words,
      source: 'gemini',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Gemini word bank error:', error);
    return res.status(502).json({ error: 'Failed to generate word bank' });
  }
}
