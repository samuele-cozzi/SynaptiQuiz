import { describe, expect, it } from "vitest";
import {
  hasFairQuestionCount,
  playerIndexForTurn,
  pointsForAnswer,
  sharedRanks,
} from "./game-rules";

describe("game rules", () => {
  it("awards the configured points only for correct answers", () => {
    expect([1, 2, 3, 4, 5].map((difficulty) => pointsForAnswer(difficulty, true))).toEqual([10, 20, 50, 100, 150]);
    expect(pointsForAnswer(5, false)).toBe(0);
  });

  it("rejects question counts that cannot be shared evenly", () => {
    expect(hasFairQuestionCount(6, 3)).toBe(true);
    expect(hasFairQuestionCount(5, 2)).toBe(false);
    expect(hasFairQuestionCount(0, 2)).toBe(false);
    expect(hasFairQuestionCount(2, 0)).toBe(false);
  });

  it("rotates turns in participant order", () => {
    expect([0, 1, 2, 3, 4].map((turn) => playerIndexForTurn(turn, 3))).toEqual([0, 1, 2, 0, 1]);
  });

  it("assigns shared ranks to ties, including zero-point scores", () => {
    expect(sharedRanks([{ name: "A", points: 50 }, { name: "B", points: 50 }, { name: "C", points: 10 }])).toEqual([
      { name: "A", points: 50, rank: 1 },
      { name: "B", points: 50, rank: 1 },
      { name: "C", points: 10, rank: 3 },
    ]);
    expect(sharedRanks([{ name: "A", points: 0 }, { name: "B", points: 0 }]).map((entry) => entry.rank)).toEqual([1, 1]);
  });
});