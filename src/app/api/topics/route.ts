import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const topics = await prisma.topic.findMany({
            orderBy: { text: 'asc' },
        });
        return NextResponse.json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error);
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

        const { text, image } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Topic name is required' },
                { status: 400 }
            );
        }

        const topic = await prisma.topic.create({
            data: {
                text,
                image: image || null,
            },
        });

        return NextResponse.json(topic, { status: 201 });
    } catch (error) {
        console.error('Error creating topic:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
