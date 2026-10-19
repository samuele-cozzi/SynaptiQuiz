import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isQuestionInput } from '@/lib/question-input';

export async function GET() {
    try {
        const questions = await prisma.question.findMany({
            include: {
                topic: true,
                answers: true,
            },
            orderBy: { text: 'asc' },
        });
        return NextResponse.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
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

        const input: unknown = await req.json();

        if (
            !isQuestionInput(input) ||
            !input.text ||
            !input.topicId
        ) {
            return NextResponse.json(
                { error: 'Invalid question data' },
                { status: 400 }
            );
        }

        const { text, difficulty, language, topicId, answers } = input;
        const correctAnswers = answers.filter((a) => a.correct).length;
        if (correctAnswers !== 1) {
            return NextResponse.json(
                { error: 'Exactly one answer must be correct' },
                { status: 400 }
            );
        }

        const question = await prisma.question.create({
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

        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
