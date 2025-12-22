import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // Check if user has access to this game
        const isPlayer = game.players.some((p: { user: { id: string } }) => p.user.id === session.user.id);
        const isOwner = game.ownerId === session.user.id;
        const isAdmin = session.user.role === 'ADMIN';

        if (!isPlayer && !isOwner && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(game);
    } catch (error) {
        console.error('Error fetching game:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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
            select: { ownerId: true },
        });

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // Only owner or admin can delete
        if (game.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.game.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting game:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
