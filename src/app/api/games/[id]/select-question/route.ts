import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        const { questionId } = await req.json();

        const game = await prisma.game.findUnique({
            where: { id },
            include: {
                players: {
                    orderBy: { id: 'asc' }, // Ensure consistent player order
                },
            }
        });

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (game.status !== 'STARTED') {
            return NextResponse.json({ error: 'Game is not in STARTED state' }, { status: 400 });
        }

        if (game.selectedQuestionId) {
            return NextResponse.json({ error: 'A question is already selected' }, { status: 400 });
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

        // Only current player or admin can select
        if (currentPlayer.userId !== session.user.id && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'It is not your turn' }, { status: 403 });
        }

        // Verify question is in game and not played
        const gameQuestion = await prisma.gameQuestion.findUnique({
            where: {
                gameId_questionId: {
                    gameId: id,
                    questionId,
                }
            }
        });

        if (!gameQuestion) {
            return NextResponse.json({ error: 'Question not in this game' }, { status: 400 });
        }

        if (gameQuestion.isPlayed) {
            return NextResponse.json({ error: 'Question already played' }, { status: 400 });
        }

        // Update game with selected question
        await prisma.game.update({
            where: { id },
            data: {
                selectedQuestionId: questionId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error selecting question:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
