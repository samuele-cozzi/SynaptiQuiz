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

        const game = await prisma.game.findUnique({
            where: { id },
            include: {
                players: true,
            }
        });

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // Only owner or admin can start
        if (game.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (game.status !== 'CREATED') {
            return NextResponse.json({ error: 'Game already started or ended' }, { status: 400 });
        }

        // Update status to STARTED
        const updatedGame = await prisma.game.update({
            where: { id },
            data: {
                status: 'STARTED',
            },
            include: {
                players: {
                    orderBy: { id: 'asc' },
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
                    include: {
                        question: {
                            include: {
                                topic: true,
                                answers: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(updatedGame);
    } catch (error) {
        console.error('Error starting game:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
