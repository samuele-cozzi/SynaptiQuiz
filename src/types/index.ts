export type Player = {
    id: string;
    username: string;
    avatarUrl?: string; // Optional, can be auto-generated or from Google
    isAdmin: boolean;
    email?: string; // Optional, for Google auth tracking
    createdAt: number;
};

export type Topic = {
    id: string;
    text: string;
    imageUrl?: string;
};

export type Answer = {
    text: string;
    correct: boolean;
    plausibility: number; // 0-100 placeholder
};

export type Question = {
    id: string;
    text: string;
    topicId: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    answers: Answer[];
};

export type GameStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';

export type Game = {
    id: string;
    status: GameStatus;
    playerIds: string[];
    questionIds: string[];
    currentTurnPlayerId?: string;
    scores: Record<string, number>; // playerId -> score
    createdAt: number;
    history?: GameHistoryItem[];
};

export type GameHistoryItem = {
    questionId: string;
    playerId: string;
    correct: boolean;
    points: number;
    timestamp: number;
};
