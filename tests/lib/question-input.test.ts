import { describe, expect, it } from "vitest";
import { isQuestionInput, type QuestionInput } from "@/lib/question-input";

const validQuestion: QuestionInput = {
  text: "Question",
  difficulty: 1,
  language: "en",
  topicId: "topic-id",
  answers: [
    { text: "First", correct: true, plausibility: 100 },
    { text: "Second", correct: false, plausibility: 80 },
    { text: "Third", correct: false, plausibility: 60 },
    { text: "Fourth", correct: false, plausibility: 40 },
  ],
};

describe("isQuestionInput", () => {
  it("accepts a question with four typed answers", () => {
    expect(isQuestionInput(validQuestion)).toBe(true);
  });

  it("rejects malformed question fields", () => {
    expect(isQuestionInput({ ...validQuestion, answers: null })).toBe(false);
    expect(isQuestionInput({
      ...validQuestion,
      answers: [{ text: "Answer", correct: "yes", plausibility: 100 }],
    })).toBe(false);
  });

  it("rejects question payloads without exactly four answers", () => {
    expect(isQuestionInput({ ...validQuestion, answers: validQuestion.answers.slice(0, 3) })).toBe(false);
  });
});
