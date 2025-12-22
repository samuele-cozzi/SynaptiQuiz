import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const players = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                image: true,
                isGuest: true,
            },
            orderBy: { username: 'asc' },
        });

        return NextResponse.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
