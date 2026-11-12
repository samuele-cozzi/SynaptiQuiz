export const difficultyPoints = [10, 20, 50, 100, 150] as const;

export function pointsForAnswer(difficulty: number, correct: boolean) {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > difficultyPoints.length) {
    throw new RangeError("Difficulty must be an integer from 1 to 5.");
  }
  return correct ? difficultyPoints[difficulty - 1] : 0;
}

export function hasFairQuestionCount(questionCount: number, playerCount: number) {
  return Number.isInteger(questionCount) && Number.isInteger(playerCount) &&
    questionCount > 0 && playerCount > 0 && questionCount % playerCount === 0;
}

export function playerIndexForTurn(answeredCount: number, playerCount: number) {
  if (!Number.isInteger(answeredCount) || answeredCount < 0 || !Number.isInteger(playerCount) || playerCount < 1) {
    throw new RangeError("Turn and player counts must be non-negative and positive integers.");
  }
  return answeredCount % playerCount;
}

export function sharedRanks<T extends { points: number }>(entries: T[]) {
  let rank = 0;
  let previousPoints: number | null = null;
  return [...entries]
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => {
      if (previousPoints !== entry.points) rank = index + 1;
      previousPoints = entry.points;
      return { ...entry, rank };
    });
}