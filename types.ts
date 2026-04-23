
export interface WordOption {
  word: string;
  image: string;
}

export interface Question {
  correctWord: string;
  options: WordOption[];
}

export interface WordEntry {
  word: string;
  icon: string;
  category: string;
}

export interface WordBankLevel {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  words: WordEntry[];
  source: 'cache' | 'gemini' | 'fallback';
  generatedAt?: string;
}

export interface WordBank {
  version: string;
  levels: WordBankLevel[];
}

export interface LevelMeta {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
}

export interface Level {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  questions: Question[];
}

export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  SETTLEMENT = 'SETTLEMENT'
}

export interface GameScore {
  correct: number;
  wrong: number;
  total: number;
}
