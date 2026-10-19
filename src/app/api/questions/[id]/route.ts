import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isQuestionInput } from '@/lib/question-input';

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
        const input: unknown = await req.json();
        if (!isQuestionInput(input)) {
            return NextResponse.json(
                { error: 'Invalid question data' },
                { status: 400 }
            );
        }
        const { text, difficulty, language, topicId, answers } = input;

        if (answers.filter((answer) => answer.correct).length !== 1) {
            return NextResponse.json(
                { error: 'Exactly one answer must be correct' },
                { status: 400 }
            );
        }

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
                    create: answers.map((a) => ({
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
