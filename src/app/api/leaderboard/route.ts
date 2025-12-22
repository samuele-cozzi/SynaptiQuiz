import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const leaderboard = await prisma.user.findMany({
            where: {
                totalPoints: {
                    gt: 0,
                },
            },
            select: {
                id: true,
                username: true,
                image: true,
                totalPoints: true,
                gamesPlayedCount: true,
                gamesWonCount: true,
            },
            orderBy: {
                totalPoints: 'desc',
            },
            take: 50,
        });

        return NextResponse.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
