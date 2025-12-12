'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { Game, Player, Question } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Play, Eye, Copy, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function GamesPage() {
    const { player: currentUser } = useAuth();
    const [games, setGames] = useState<Game[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [playerSearch, setPlayerSearch] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState<{
        selectedPlayers: string[];
        selectedQuestions: string[];
    }>({
        selectedPlayers: [],
        selectedQuestions: []
    });

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Games
            const gamesQ = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
            const gSnap = await getDocs(gamesQ);
            setGames(gSnap.docs.map(d => d.data() as Game));

            // Fetch Players & Questions for creation
            if (currentUser?.isAdmin) {
                const pSnap = await getDocs(collection(db, 'players'));
                setPlayers(pSnap.docs.map(d => d.data() as Player));
                const qSnap = await getDocs(collection(db, 'questions'));
                setQuestions(qSnap.docs.map(d => d.data() as Question));
            }
        };
        fetchData();
    }, [currentUser]);

    const toggleSelection = (list: string[], item: string) => {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    };

    const handleCreateGame = async () => {
        const pCount = formData.selectedPlayers.length;
        const qCount = formData.selectedQuestions.length;

        if (pCount === 0) return alert("Select at least 1 player.");
        if (qCount === 0) return alert("Select questions.");

        // Validation Rule: Divisible
        if (qCount % pCount !== 0) {
            return alert(`Questions (${qCount}) must be divisible by Players (${pCount}). Remainder: ${qCount % pCount}`);
        }

        const id = generateId();
        const newGame: Game = {
            id,
            status: 'CREATED',
            playerIds: formData.selectedPlayers,
            questionIds: formData.selectedQuestions,
            scores: formData.selectedPlayers.reduce((acc, pid) => ({ ...acc, [pid]: 0 }), {}),
            createdAt: Date.now(),
            history: []
        };

        try {
            await setDoc(doc(db, 'games', id), newGame);
            setGames([newGame, ...games]);
            setIsModalOpen(false);
            // Reset
            setFormData({ selectedPlayers: [], selectedQuestions: [] });
        } catch (e) { console.error(e); }
    };

    const handleDuplicate = (game: Game) => {
        setFormData({
            selectedPlayers: currentUser ? [currentUser.id] : [],
            selectedQuestions: game.questionIds
        });
        setPlayerSearch('');
        setIsModalOpen(true);
    };

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(playerSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Games</h1>
                {currentUser?.isAdmin && (
                    <Button onClick={() => setIsModalOpen(true)}>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(g)} title="Duplicate Game">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Game"
            >
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium mb-2">Select Players ({formData.selectedPlayers.length})</h3>
                        <div className="mb-2">
                            <Input
                                placeholder="Filter players..."
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                                icon={<Search className="h-4 w-4 text-gray-400" />}
                            />
                        </div>
                        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                            {filteredPlayers.map(p => (
                                <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={formData.selectedPlayers.includes(p.id)}
                                        onChange={() => setFormData({ ...formData, selectedPlayers: toggleSelection(formData.selectedPlayers, p.id) })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span className="text-sm">{p.username}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium mb-2">Select Questions ({formData.selectedQuestions.length})</h3>
                        <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
                            {questions.map(q => (
                                <label key={q.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={formData.selectedQuestions.includes(q.id)}
                                        onChange={() => setFormData({ ...formData, selectedQuestions: toggleSelection(formData.selectedQuestions, q.id) })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span className="text-sm truncate">{q.text}</span>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">Lvl {q.difficulty}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 bg-yellow-50 p-3 rounded">
                        Rule: Questions must be divisible by Players.
                        Condition: {formData.selectedQuestions.length} % {(formData.selectedPlayers.length || 1)} = {formData.selectedQuestions.length % (formData.selectedPlayers.length || 1)}
                        {formData.selectedPlayers.length > 0 && formData.selectedQuestions.length % formData.selectedPlayers.length === 0
                            ? <span className="text-green-600 font-bold ml-2">✓ Valid</span>
                            : <span className="text-red-500 font-bold ml-2">✕ Invalid</span>}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateGame}>Create Game</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
