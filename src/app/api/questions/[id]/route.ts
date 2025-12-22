import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role === 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { text, difficulty, language, topicId, answers } = await req.json();

        // Delete existing answers and create new ones
        await prisma.answer.deleteMany({
            where: { questionId: id },
        });

        const question = await prisma.question.update({
            where: { id },
            data: {
                text,
                difficulty,
                language,
                topicId,
                answers: {
                    create: answers.map((a: any) => ({
                        text: a.text,
                        correct: a.correct,
                        plausibility: a.plausibility,
                    })),
                },
            },
            include: {
                topic: true,
                answers: true,
            },
        });

        return NextResponse.json(question);
    } catch (error) {
        console.error('Error updating question:', error);
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

        if (!session || session.user.role === 'PLAYER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;

        await prisma.question.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
