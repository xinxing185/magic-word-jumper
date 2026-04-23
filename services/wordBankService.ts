import { GoogleGenAI, Type } from '@google/genai';
import { FALLBACK_WORD_BANKS, LEVEL_METADATA } from '../constants';
import { LevelMeta, WordBankLevel, WordEntry } from '../types';

const WORD_BANK_MODEL = 'gemini-2.5-flash-lite';
export const WORD_BANK_TARGET_SIZE = 80;
const MIN_GENERATED_WORDS = 50;
const WORD_BANK_CACHE_PREFIX = 'mwj:word-bank:v1';
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

type GeneratedWordBankPayload = {
  levelId?: unknown;
  words?: unknown;
};

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

const getLevelMeta = (levelId: string) => LEVEL_METADATA.find(level => level.id === levelId) ?? LEVEL_METADATA[0];

const getCacheKey = (levelId: string) => `${WORD_BANK_CACHE_PREFIX}:${levelId}`;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

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

const getFallbackWords = (levelId: string) => {
  const fallbackWords = FALLBACK_WORD_BANKS[levelId] ?? FALLBACK_WORD_BANKS[LEVEL_METADATA[0]?.id] ?? [];
  return normalizeWords(fallbackWords);
};

const buildWordBankLevel = (
  levelMeta: LevelMeta,
  words: WordEntry[],
  source: WordBankLevel['source'],
  generatedAt?: string
): WordBankLevel => ({
  ...levelMeta,
  words,
  source,
  generatedAt,
});

const getFallbackWordBank = (levelMeta: LevelMeta): WordBankLevel => (
  buildWordBankLevel(levelMeta, getFallbackWords(levelMeta.id), 'fallback')
);

const readCachedWordBank = (levelMeta: LevelMeta): WordBankLevel | null => {
  if (!canUseStorage()) return null;

  try {
    const cachedValue = window.localStorage.getItem(getCacheKey(levelMeta.id));
    if (!cachedValue) return null;

    const parsed = JSON.parse(cachedValue) as GeneratedWordBankPayload & { generatedAt?: unknown };
    const words = normalizeWords(parsed.words);
    if (words.length < 10) return null;

    return buildWordBankLevel(
      levelMeta,
      words,
      'cache',
      typeof parsed.generatedAt === 'string' ? parsed.generatedAt : undefined
    );
  } catch (error) {
    console.warn('Failed to read cached word bank', error);
    return null;
  }
};

export const hasCachedWordBank = (levelId: string): boolean => {
  const levelMeta = getLevelMeta(levelId);
  return Boolean(readCachedWordBank(levelMeta));
};

const writeCachedWordBank = (wordBankLevel: WordBankLevel) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      getCacheKey(wordBankLevel.id),
      JSON.stringify({
        levelId: wordBankLevel.id,
        generatedAt: wordBankLevel.generatedAt,
        words: wordBankLevel.words,
      })
    );
  } catch (error) {
    console.warn('Failed to cache generated word bank', error);
  }
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

const generateWordBank = async (levelMeta: LevelMeta): Promise<WordBankLevel> => {
  if (!API_KEY) {
    throw new Error('Missing GEMINI_API_KEY');
  }

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
  const generatedWordBank = buildWordBankLevel(levelMeta, words, 'gemini', new Date().toISOString());
  writeCachedWordBank(generatedWordBank);
  return generatedWordBank;
};

export const getWordBankForLevel = async (levelId: string): Promise<WordBankLevel> => {
  const levelMeta = getLevelMeta(levelId);
  const cachedWordBank = readCachedWordBank(levelMeta);
  if (cachedWordBank) return cachedWordBank;

  try {
    return await generateWordBank(levelMeta);
  } catch (error) {
    console.warn('Falling back to starter word bank', error);
    return getFallbackWordBank(levelMeta);
  }
};

export const refreshWordBankForLevel = async (levelId: string): Promise<WordBankLevel> => {
  const levelMeta = getLevelMeta(levelId);
  return generateWordBank(levelMeta);
};
