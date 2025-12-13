'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Game } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Play, Eye, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GamesPage() {
    const { player: currentUser } = useAuth();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Filters
    const [filterName, setFilterName] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');

    const filteredGames = games.filter(g => {
        const matchesName = g.name?.toLowerCase().includes(filterName.toLowerCase()) ||
            g.id.toLowerCase().includes(filterName.toLowerCase());
        const matchesStatus = filterStatus ? g.status === filterStatus : true;
        const matchesLanguage = filterLanguage ? (g.language || 'en') === filterLanguage : true;
        return matchesName && matchesStatus && matchesLanguage;
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const gamesQ = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
            const gSnap = await getDocs(gamesQ);
            setGames(gSnap.docs.map(d => d.data() as Game));
            setLoading(false);
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

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Name/ID</label>
                    <Input
                        placeholder="Search by name or ID..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="CREATED">Created</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Language</label>
                    <select
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                    >
                        <option value="">All Languages</option>
                        <option value="en">English</option>
                        <option value="it">Italian</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Game ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Players</TableHead>
                            <TableHead>Questions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredGames.map(g => (
                            <TableRow key={g.id}>
                                <TableCell className="font-mono text-xs">{g.id}</TableCell>
                                <TableCell className="font-medium">{g.name || '-'}</TableCell>
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
