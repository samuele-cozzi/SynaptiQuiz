-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "selectedQuestionId" TEXT;
