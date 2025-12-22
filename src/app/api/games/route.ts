import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admins see all games, others see only their games
        const where = session.user.role === 'ADMIN'
            ? {}
            : {
                OR: [
                    { ownerId: session.user.id },
                    { players: { some: { userId: session.user.id } } },
                ],
            };

        const games = await prisma.game.findMany({
            where,
            include: {
                players: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                image: true,
                            },
                        },
                    },
                },
                questions: {
                    select: {
                        question: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role === 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { name, language, playerIds, questionIds } = await req.json();

        // Validation
        if (!name || !language || !playerIds || !questionIds) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (playerIds.length === 0 || questionIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one player and one question required' },
                { status: 400 }
            );
        }

        if (questionIds.length % playerIds.length !== 0) {
            return NextResponse.json(
                { error: 'Number of questions must be divisible by number of players' },
                { status: 400 }
            );
        }

        const game = await prisma.game.create({
            data: {
                name,
                language,
                ownerId: session.user.id,
                players: {
                    create: playerIds.map((userId: string) => ({
                        userId,
                        score: 0,
                    })),
                },
                questions: {
                    create: questionIds.map((questionId: string) => ({
                        questionId,
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

        return NextResponse.json(game, { status: 201 });
    } catch (error) {
        console.error('Error creating game:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
