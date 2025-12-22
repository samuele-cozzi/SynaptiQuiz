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

        if (!session || session.user.role === 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;

        // Get original game
        const originalGame = await prisma.game.findUnique({
            where: { id },
            include: {
                players: true,
                questions: true,
            },
        });

        if (!originalGame) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // Create duplicate with logged-in user preselected
        const newGame = await prisma.game.create({
            data: {
                name: `${originalGame.name} (Copy)`,
                language: originalGame.language,
                ownerId: session.user.id,
                status: 'CREATED',
                players: {
                    create: [
                        {
                            userId: session.user.id,
                            score: 0,
                        },
                    ],
                },
                questions: {
                    create: originalGame.questions.map((gq: { questionId: string }) => ({
                        questionId: gq.questionId,
                        isPlayed: false,
                    })),
                },
            },
            include: {
                players: {
                    include: {
                        user: true,
                    },
                },
                questions: {
                    include: {
                        question: true,
                    },
                },
            },
        });

        return NextResponse.json(newGame, { status: 201 });
    } catch (error) {
        console.error('Error duplicating game:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
