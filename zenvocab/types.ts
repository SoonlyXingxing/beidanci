export interface Word {
  id: string;
  text: string;
  phonetic: string;
  definition: string;
}

export interface WordBook {
  id: string;
  name: string;
  words: Word[];
  learnedWordIds: string[];
  createdAt: number;
}

export interface ErrorRecord {
  wordId: string;
  wordText: string;
  wordDefinition: string;
  wordPhonetic: string;
  date: string; // ISO Date string YYYY-MM-DD
  type: 'learning' | 'dictation';
}

export interface HistoryRecord {
  id: string;
  date: number; // timestamp
  type: 'study' | 'dictation';
  bookName: string;
  totalWords: number;
  accuracy: number; // percentage 0-100
}

export interface StudySessionResult {
  reviewedCount: number;
  errors: ErrorRecord[];
  learnedIds: string[];
}

export type AppView = 'home' | 'study-setup' | 'study-active' | 'dictation-setup' | 'dictation-active' | 'upload' | 'errors' | 'history';

export interface Settings {
  dailyGoal: number;
  dictationSpeed: number; // 0.5 to 2.0
}