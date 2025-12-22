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

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { role } = await req.json();

        const player = await prisma.user.update({
            where: { id },
            data: { role },
        });

        return NextResponse.json(player);
    } catch (error) {
        console.error('Error updating player:', error);
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

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;

        // Prevent deleting yourself
        if (id === session.user.id) {
            return NextResponse.json(
                { error: 'Cannot delete yourself' },
                { status: 400 }
            );
        }

        // Check if this is the last admin
        const adminCount = await prisma.user.count({
            where: { role: 'ADMIN' },
        });

        const userToDelete = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });

        if (userToDelete?.role === 'ADMIN' && adminCount <= 1) {
            return NextResponse.json(
                { error: 'Cannot delete the last admin' },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting player:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
