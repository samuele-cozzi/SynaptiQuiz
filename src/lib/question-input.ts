export interface AnswerInput {
    text: string;
    correct: boolean;
    plausibility: number;
}

export interface QuestionInput {
    text: string;
    difficulty: number;
    language: string;
    topicId: string;
    answers: AnswerInput[];
}

function isAnswerInput(value: unknown): value is AnswerInput {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const answer = value as Record<string, unknown>;
    return (
        typeof answer.text === 'string' &&
        typeof answer.correct === 'boolean' &&
        typeof answer.plausibility === 'number'
    );
}

export function isQuestionInput(value: unknown): value is QuestionInput {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const input = value as Record<string, unknown>;
    return (
        typeof input.text === 'string' &&
        typeof input.difficulty === 'number' &&
        typeof input.language === 'string' &&
        typeof input.topicId === 'string' &&
        Array.isArray(input.answers) &&
        input.answers.length === 4 &&
        input.answers.every(isAnswerInput)
    );
}
