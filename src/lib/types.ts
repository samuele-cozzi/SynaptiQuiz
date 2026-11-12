import type { Locale } from "@/lib/messages";

export type AppUser = {
  id: string;
  username: string;
  avatar: string | null;
  role: "admin" | "editor" | "player";
  isGuest: boolean;
  locale: Locale;
  theme: "light" | "dark";
  defaultLanguage: Locale;
};

export type Player = AppUser & { position?: number };

export type Topic = {
  id: string;
  text: string;
  image: string | null;
};

export type AnswerOption = {
  id: string;
  position: number;
  text: string;
  correct?: boolean;
  plausibility: number;
};

export type QuestionVariant = {
  id: string;
  language: Locale;
  text: string;
  answers: AnswerOption[];
};

export type QuestionRecord = {
  id: string;
  topicId: string;
  difficulty: number;
  topic: Topic;
  variants: QuestionVariant[];
};

export type GameAnswer = {
  player: Player;
  selectedOptionId: string;
  selectedText: string;
  correct?: boolean;
  points?: number;
};

export type GameQuestion = {
  id: string;
  questionId: string;
  position: number;
  text: string;
  topic: string;
  difficulty: number;
  options: AnswerOption[];
  answer: GameAnswer | null;
};

export type GameRecord = {
  id: string;
  name: string;
  language: Locale;
  status: "draft" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
  creator: AppUser;
  players: Player[];
  questions: GameQuestion[];
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  avatar: string | null;
  points: number;
  wins: number;
  games: number;
  rank: number;
};

export type AppSnapshot = {
  user: AppUser;
  users: AppUser[];
  topics: Topic[];
  questions: QuestionRecord[];
  games: GameRecord[];
  manageableGameIds: string[];
  stats: {
    points: number;
    wins: number;
    gamesPlayed: number;
    gamesAgainstOthers: number;
  };
  leaderboard: LeaderboardEntry[];
};