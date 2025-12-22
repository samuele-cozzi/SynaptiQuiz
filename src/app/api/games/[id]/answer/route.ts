import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const POINTP_MAP: Record<number, number> = {
    1: 10,
    2: 20,
    3: 50,
    4: 100,
    5: 150,
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { answerId } = await req.json();

        const game = await prisma.game.findUnique({
            where: { id },
            include: {
                players: {
                    orderBy: { id: 'asc' },
                },
                questions: true,
            }
        });

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (!game.selectedQuestionId) {
            return NextResponse.json({ error: 'No question selected' }, { status: 400 });
        }

        if (!game.players || game.players.length === 0) {
            return NextResponse.json({ error: 'No players in this game' }, { status: 400 });
        }

        // Identify current player
        const turnIndex = game.currentTurnIndex ?? 0;
        const playersCount = game.players.length;
        const currentPlayer = game.players[turnIndex % playersCount];

        if (!currentPlayer) {
            console.error(`Current player not found. Turn: ${turnIndex}, Players: ${playersCount}`);
            return NextResponse.json({ error: 'Current player not found' }, { status: 404 });
        }

        // Only current player or admin can answer
        if (currentPlayer.userId !== session.user.id && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'It is not your turn' }, { status: 403 });
        }

        // Fetch the answer and verify it belongs to the selected question
        const answer = await prisma.answer.findUnique({
            where: { id: answerId },
            include: {
                question: true,
            }
        });

        if (!answer || answer.questionId !== game.selectedQuestionId) {
            return NextResponse.json({ error: 'Invalid answer' }, { status: 400 });
        }

        // Record the player answer
        await prisma.playerAnswer.create({
            data: {
                gameId: id,
                userId: currentPlayer.userId,
                questionId: game.selectedQuestionId,
                answerId: answerId,
            }
        });

        let scoreIncrement = 0;
        if (answer.correct) {
            scoreIncrement = POINTP_MAP[answer.question.difficulty] || 0;

            // Update player score in GamePlayer
            await prisma.gamePlayer.update({
                where: { id: currentPlayer.id },
                data: {
                    score: {
                        increment: scoreIncrement,
                    }
                }
            });
        }

        // Mark question as played
        await prisma.gameQuestion.update({
            where: {
                gameId_questionId: {
                    gameId: id,
                    questionId: game.selectedQuestionId,
                }
            },
            data: { isPlayed: true }
        });

        // Check if game should end
        const remainingQuestions = game.questions.filter((q: { isPlayed: boolean; questionId: string }) => !q.isPlayed && q.questionId !== game.selectedQuestionId);
        const newStatus = remainingQuestions.length === 0 ? 'ENDED' : 'STARTED';

        // Update game state
        await prisma.game.update({
            where: { id },
            data: {
                selectedQuestionId: null,
                currentTurnIndex: { increment: 1 },
                status: newStatus,
            }
        });

        // If game ended, update aggregate stats
        if (newStatus === 'ENDED') {
            // Refetch final scores
            const finalPlayers = await prisma.gamePlayer.findMany({
                where: { gameId: id },
            });

            const maxScore = Math.max(...finalPlayers.map((p: { score: number }) => p.score));

            for (const p of finalPlayers as any[]) {
                await prisma.user.update({
                    where: { id: p.userId },
                    data: {
                        gamesPlayedCount: { increment: 1 },
                        totalPoints: { increment: p.score },
                        gamesWonCount: {
                            increment: p.score === maxScore ? 1 : 0
                        }
                    }
                });
            }
        }

        return NextResponse.json({
            correct: answer.correct,
            choice: answer.text,
            correctId: answer.correct ? answer.id : (await prisma.answer.findFirst({ where: { questionId: game.selectedQuestionId, correct: true } }))?.id
        });
    } catch (error) {
        console.error('Error submitting answer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
