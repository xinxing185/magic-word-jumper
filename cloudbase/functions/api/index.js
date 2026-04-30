const LEVEL_METADATA = [
  { id: 'raz-aa-a', name: '🌟 Level aa-A', category: 'Foundations', thumbnail: '🍎' },
  { id: 'raz-b-c', name: '🌈 Level B-C', category: 'Exploration', thumbnail: '🐸' },
  { id: 'raz-d-e', name: '🚀 Level D-E', category: 'Adventure', thumbnail: '👨‍⚕️' },
  { id: 'raz-f', name: '🌳 Level F', category: 'Nature', thumbnail: '🏞️' },
  { id: 'raz-g', name: '🏡 Level G', category: 'Community', thumbnail: '🏢' },
  { id: 'raz-h', name: '🦁 Level H', category: 'Zoo', thumbnail: '🦒' },
  { id: 'raz-i', name: '🌌 Level I', category: 'Space', thumbnail: '🪐' },
  { id: 'raz-j', name: '☀️ Level J', category: 'Daily', thumbnail: '🥪' },
  { id: 'raz-k', name: '🏰 Level K', category: 'Fantasy', thumbnail: '🐉' },
];

const WORD_BANK_TARGET_SIZE = 80;
const MIN_GENERATED_WORDS = 50;

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const getHeader = (headers, name) => {
  if (!headers || typeof headers !== 'object') return '';
  const directValue = headers[name] || headers[name.toLowerCase()];
  return typeof directValue === 'string' ? directValue.trim() : '';
};

const getAllowedOrigins = () => (
  process.env.CORS_ALLOWED_ORIGINS || ''
).split(',').map(origin => origin.trim()).filter(Boolean);

const getCorsHeaders = (event) => {
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.length) return corsHeaders;

  const requestOrigin = getHeader(event?.headers, 'origin');
  const allowAnyOrigin = allowedOrigins.includes('*');
  const allowedOrigin = allowAnyOrigin ? '*' : allowedOrigins.find(origin => origin === requestOrigin);

  if (!allowedOrigin) return corsHeaders;

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigin,
    Vary: 'Origin',
  };
};

const jsonResponse = (statusCode, body, event) => ({
  statusCode,
  headers: getCorsHeaders(event),
  body: JSON.stringify(body),
});

const getProvider = () => {
  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  return configuredProvider === 'gemini' ? 'gemini' : 'deepseek';
};

const getRequiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};

const parseBody = (event) => {
  if (
    event
    && typeof event === 'object'
    && !event.body
    && !event.httpMethod
    && !event.method
    && !event.path
    && !event.rawPath
    && !event.requestContext
  ) {
    return event;
  }

  if (!event?.body) return {};

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  if (rawBody && typeof rawBody === 'object') return rawBody;
  if (typeof rawBody !== 'string') return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
};

const getPath = (event, context) => {
  const contextUrl = context?.httpContext?.url;
  const contextPath = typeof contextUrl === 'string'
    ? new URL(contextUrl, 'https://cloudbase.local').pathname
    : '';
  const rawPath = event?.path || event?.requestContext?.path || event?.rawPath || contextPath || '/';
  const path = rawPath.replace(/^\/api(?=\/|$)/, '');
  return path || '/';
};

const getMethod = (event, context) => (
  event?.httpMethod || event?.requestContext?.http?.method || event?.method || context?.httpContext?.httpMethod || 'GET'
).toUpperCase();

const getLevelMeta = (levelId) => LEVEL_METADATA.find(level => level.id === levelId);

const normalizeWord = (word) => word.trim().toLowerCase();

const normalizeCategory = (category) => category.trim().toLowerCase() || 'general';

const isPlayableWord = (word) => /^[a-z]+(?:-[a-z]+)?$/.test(word) && word.length <= 14;

const isUsableIcon = (icon) => icon.trim().length > 0 && icon.trim().length <= 8;

const normalizeWords = (words) => {
  if (!Array.isArray(words)) return [];

  const wordsByKey = new Map();

  words.forEach(item => {
    if (!item || typeof item !== 'object') return;
    if (typeof item.word !== 'string' || typeof item.icon !== 'string') return;

    const word = normalizeWord(item.word);
    const icon = item.icon.trim();
    const category = typeof item.category === 'string' ? normalizeCategory(item.category) : 'general';

    if (!isPlayableWord(word) || !isUsableIcon(icon) || wordsByKey.has(word)) return;
    wordsByKey.set(word, { word, icon, category });
  });

  return Array.from(wordsByKey.values());
};

const parseGeneratedWordBank = (text, levelMeta) => {
  const parsed = JSON.parse(text);
  const words = normalizeWords(parsed.words);

  if (parsed.levelId !== levelMeta.id) {
    console.warn(`Generated word bank level mismatch: expected ${levelMeta.id}, got ${String(parsed.levelId)}`);
  }

  if (words.length < MIN_GENERATED_WORDS) {
    throw new Error(`Generated word bank only had ${words.length} usable words`);
  }

  return words.slice(0, WORD_BANK_TARGET_SIZE);
};

const buildWordBankPrompt = (levelMeta) => `
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
    { "word": "apple", "icon": "emoji", "category": "food" }
  ]
}
`;

const buildEncouragementPrompt = (score, total) => `My 5-year-old daughter just finished a word learning game. She got ${score} out of ${total} correct.
Write a short (max 20 words), extremely encouraging, and fun message for her in English.
Include some emojis!`;

const requestDeepSeek = async (messages, jsonOutput = false) => {
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

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek returned an empty response');
  }

  return content.trim();
};

const generateDeepSeekWordBankText = (levelMeta) => (
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

const generateGeminiWordBankText = async (levelMeta) => {
  const { GoogleGenAI, Type } = require('@google/genai');
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const model = process.env.GEMINI_WORD_BANK_MODEL?.trim() || 'gemini-2.5-flash-lite';
  const wordBankSchema = {
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
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildWordBankPrompt(levelMeta),
    config: {
      responseMimeType: 'application/json',
      responseSchema: wordBankSchema,
      temperature: 0.45,
      maxOutputTokens: 8192,
    },
  });

  return response.text || '';
};

const generateWordBankText = (levelMeta, provider) => (
  provider === 'gemini' ? generateGeminiWordBankText(levelMeta) : generateDeepSeekWordBankText(levelMeta)
);

const generateDeepSeekEncouragement = (score, total) => (
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

const generateGeminiEncouragement = async (score, total) => {
  const { GoogleGenAI } = require('@google/genai');
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const model = process.env.GEMINI_ENCOURAGEMENT_MODEL?.trim() || 'gemini-3-flash-preview';
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildEncouragementPrompt(score, total),
  });

  return response.text || '';
};

const generateEncouragement = (score, total, provider) => (
  provider === 'gemini' ? generateGeminiEncouragement(score, total) : generateDeepSeekEncouragement(score, total)
);

const clampScore = (value) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : 0;
};

const handleWordBank = async (body, event) => {
  const levelId = typeof body.levelId === 'string' ? body.levelId : '';
  const levelMeta = getLevelMeta(levelId);

  if (!levelMeta) {
    return jsonResponse(400, { error: 'Unknown levelId' }, event);
  }

  const provider = getProvider();
  const text = await generateWordBankText(levelMeta, provider);
  const words = parseGeneratedWordBank(text, levelMeta);

  return jsonResponse(200, {
    ...levelMeta,
    words,
    source: provider,
    generatedAt: new Date().toISOString(),
  }, event);
};

const handleEncouragement = async (body, event) => {
  const score = clampScore(body.score);
  const total = Math.max(1, clampScore(body.total));
  const provider = getProvider();
  const message = await generateEncouragement(score, total, provider);

  return jsonResponse(200, {
    message: message || 'Wow! You are a superstar! Keep playing!',
  }, event);
};

exports.main = async (event, context) => {
  console.log('CloudBase API request:', {
    eventMethod: event?.method,
    eventHttpMethod: event?.httpMethod,
    eventPath: event?.path,
    eventRawPath: event?.rawPath,
    contextMethod: context?.httpContext?.httpMethod,
    contextUrl: context?.httpContext?.url,
    hasBody: Boolean(event?.body),
  });

  const method = getMethod(event, context);
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: '',
    };
  }

  if (method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, event);
  }

  const path = getPath(event, context);
  const body = parseBody(event);

  try {
    if (path === '/health' || path === '/api/health') {
      return jsonResponse(200, {
        ok: true,
        method,
        path,
        provider: getProvider(),
        timestamp: new Date().toISOString(),
      }, event);
    }

    if (path === '/word-bank' || path === '/api/word-bank') {
      return await handleWordBank(body, event);
    }

    if (path === '/encouragement' || path === '/api/encouragement') {
      return await handleEncouragement(body, event);
    }

    return jsonResponse(404, { error: 'Not found' }, event);
  } catch (error) {
    console.error('CloudBase API error:', error);
    return jsonResponse(502, { error: 'AI service unavailable' }, event);
  }
};
