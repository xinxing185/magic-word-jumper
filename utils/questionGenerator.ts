import { Level, LevelMeta, Question, WordBankLevel, WordEntry } from '../types';

const GAME_QUESTION_COUNT = 10;
const OPTION_COUNT = 3;
const RECENT_WORD_CACHE_PREFIX = 'mwj:recent-words:v1';
const MAX_RECENT_WORDS = 30;

const getRecentCacheKey = (levelId: string) => `${RECENT_WORD_CACHE_PREFIX}:${levelId}`;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const readRecentWords = (levelId: string) => {
  if (!canUseStorage()) return new Set<string>();

  try {
    const value = window.localStorage.getItem(getRecentCacheKey(levelId));
    const parsed = value ? JSON.parse(value) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []);
  } catch (error) {
    console.warn('Failed to read recent words', error);
    return new Set<string>();
  }
};

const writeRecentWords = (levelId: string, selectedWords: WordEntry[]) => {
  if (!canUseStorage()) return;

  try {
    const previousWords = Array.from(readRecentWords(levelId));
    const nextWords = [
      ...selectedWords.map(word => word.word),
      ...previousWords.filter(word => !selectedWords.some(selectedWord => selectedWord.word === word)),
    ].slice(0, MAX_RECENT_WORDS);

    window.localStorage.setItem(getRecentCacheKey(levelId), JSON.stringify(nextWords));
  } catch (error) {
    console.warn('Failed to write recent words', error);
  }
};

const getUniqueWords = (words: WordEntry[]) => (
  Array.from(new Map(words.map(word => [word.word, word])).values())
);

const selectRoundWords = (levelId: string, words: WordEntry[]) => {
  const uniqueWords = getUniqueWords(words);
  const recentWords = readRecentWords(levelId);
  const freshWords = uniqueWords.filter(word => !recentWords.has(word.word));
  const recentPool = uniqueWords.filter(word => recentWords.has(word.word));
  const selectedWords = [
    ...shuffle(freshWords),
    ...shuffle(recentPool),
  ].slice(0, GAME_QUESTION_COUNT);

  writeRecentWords(levelId, selectedWords);
  return selectedWords;
};

const getDistractors = (correctWord: WordEntry, words: WordEntry[]) => {
  const candidateWords = getUniqueWords(words).filter(word => word.word !== correctWord.word);
  const sameCategoryWords = candidateWords.filter(word => word.category === correctWord.category);
  const selectedDistractors = shuffle(sameCategoryWords).slice(0, OPTION_COUNT - 1);

  if (selectedDistractors.length < OPTION_COUNT - 1) {
    const selectedWordSet = new Set(selectedDistractors.map(word => word.word));
    const fillerWords = shuffle(candidateWords.filter(word => !selectedWordSet.has(word.word)))
      .slice(0, OPTION_COUNT - 1 - selectedDistractors.length);
    selectedDistractors.push(...fillerWords);
  }

  return selectedDistractors.slice(0, OPTION_COUNT - 1);
};

const buildQuestion = (correctWord: WordEntry, words: WordEntry[]): Question => {
  const options = shuffle([
    { word: correctWord.word, image: correctWord.icon },
    ...getDistractors(correctWord, words).map(word => ({ word: word.word, image: word.icon })),
  ]);

  return {
    correctWord: correctWord.word,
    options,
  };
};

export const buildGameLevelFromWordBank = (levelMeta: LevelMeta, wordBankLevel: WordBankLevel): Level => {
  const roundWords = selectRoundWords(levelMeta.id, wordBankLevel.words);

  return {
    ...levelMeta,
    questions: roundWords.map(word => buildQuestion(word, wordBankLevel.words)),
  };
};
