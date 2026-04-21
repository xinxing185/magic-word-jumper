
export interface WordOption {
  word: string;
  image: string;
}

export interface Question {
  correctWord: string;
  options: WordOption[];
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
