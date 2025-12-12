'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Game } from '@/types';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Play, Eye, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GamesPage() {
    const { player: currentUser } = useAuth();
    const [games, setGames] = useState<Game[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            const gamesQ = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
            const gSnap = await getDocs(gamesQ);
            setGames(gSnap.docs.map(d => d.data() as Game));
        };
        fetchData();
    }, [currentUser]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Games</h1>
                {currentUser?.isAdmin && (
                    <Button onClick={() => router.push('/dashboard/games/create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Game
                    </Button>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Game ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Players</TableHead>
                            <TableHead>Questions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {games.map(g => (
                            <TableRow key={g.id}>
                                <TableCell className="font-mono text-xs">{g.id}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${g.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                        g.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {g.status}
                                    </span>
                                </TableCell>
                                <TableCell>{g.playerIds.length}</TableCell>
                                <TableCell>{g.questionIds.length}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/play?id=${g.id}`)}>
                                        {g.status === 'CREATED' ? <Play className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                                        {g.status === 'CREATED' ? 'Start' : 'View'}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/games/create?duplicate=${g.id}`)} title="Duplicate Game">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
