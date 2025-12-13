'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { Game, Player, Question, Topic } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function CreateGameContent() {
    const { player: currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const duplicateId = searchParams.get('duplicate');

    const [gameId, setGameId] = useState('');
    const [gameName, setGameName] = useState('');
    const [gameLanguage, setGameLanguage] = useState<'en' | 'it'>('en');
    const [players, setPlayers] = useState<Player[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    const [playerSearch, setPlayerSearch] = useState('');
    const [questionFilters, setQuestionFilters] = useState({
        text: '',
        topicId: '',
        difficulty: ''
    });

    const [formData, setFormData] = useState<{
        selectedPlayers: string[];
        selectedQuestions: string[];
    }>({
        selectedPlayers: [],
        selectedQuestions: []
    });

    useEffect(() => {
        const id = generateId();
        setGameId(id);
        setGameName(`Game ${id}`);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser?.isAdmin) return;

            try {
                const [pSnap, qSnap, tSnap] = await Promise.all([
                    getDocs(collection(db, 'players')),
                    getDocs(collection(db, 'questions')),
                    getDocs(collection(db, 'topics'))
                ]);

                const loadedPlayers = pSnap.docs.map(d => d.data() as Player);
                const loadedQuestions = qSnap.docs.map(d => d.data() as Question);
                const loadedTopics = tSnap.docs.map(d => d.data() as Topic);

                setPlayers(loadedPlayers);
                setQuestions(loadedQuestions);
                setTopics(loadedTopics);

                let initialPlayers = [currentUser.id];
                let initialQuestions: string[] = [];

                if (duplicateId) {
                    const gameDoc = await getDoc(doc(db, 'games', duplicateId));
                    if (gameDoc.exists()) {
                        const game = gameDoc.data() as Game;
                        initialQuestions = game.questionIds;
                        if (game.language) setGameLanguage(game.language);
                    }
                }

                setFormData({
                    selectedPlayers: initialPlayers,
                    selectedQuestions: initialQuestions
                });

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, duplicateId]);

    const toggleSelection = (list: string[], item: string) => {
        return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    };

    const handleCreateGame = async () => {
        const pCount = formData.selectedPlayers.length;
        const qCount = formData.selectedQuestions.length;

        if (!gameName.trim()) return alert("Please enter a game name.");
        if (pCount === 0) return alert("Select at least 1 player.");
        if (qCount === 0) return alert("Select questions.");

        if (qCount % pCount !== 0) {
            return alert(`Questions (${qCount}) must be divisible by Players (${pCount}). Remainder: ${qCount % pCount}`);
        }

        // Use the ID generated on mount
        const newGame: Game = {
            id: gameId,
            name: gameName,
            status: 'CREATED',
            playerIds: formData.selectedPlayers,
            questionIds: formData.selectedQuestions,
            scores: formData.selectedPlayers.reduce((acc, pid) => ({ ...acc, [pid]: 0 }), {}),
            createdAt: Date.now(),
            history: [],
            language: gameLanguage
        };

        try {
            await setDoc(doc(db, 'games', gameId), newGame);
            router.push('/dashboard/games');
        } catch (e) { console.error(e); }
    };

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(playerSearch.toLowerCase())
    );

    const filteredQuestions = questions.filter(q => {
        // Filter by language first (legacy undefined -> 'en')
        const qLang = q.language || 'en';
        if (qLang !== gameLanguage) return false;

        const matchesText = q.text.toLowerCase().includes(questionFilters.text.toLowerCase());
        const matchesTopic = questionFilters.topicId ? q.topicId === questionFilters.topicId : true;
        const matchesDifficulty = questionFilters.difficulty ? q.difficulty === parseInt(questionFilters.difficulty) : true;
        return matchesText && matchesTopic && matchesDifficulty;
    });

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {duplicateId ? 'Duplicate Game' : 'Create New Game'}
                </h1>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
                    <Input
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="e.g. Weekly Challenge"
                        className="max-w-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Game Language</label>
                    <select
                        className="w-full max-w-xs rounded-lg border border-gray-300 p-2.5 text-sm"
                        value={gameLanguage}
                        onChange={(e) => {
                            setGameLanguage(e.target.value as 'en' | 'it');
                            // Clear selected questions when language changes to avoid mismatch
                            setFormData(prev => ({ ...prev, selectedQuestions: [] }));
                        }}
                    >
                        <option value="en">English</option>
                        <option value="it">Italian</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Changing language will clear selected questions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
                {/* Players Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col h-full">
                    <h2 className="text-lg font-semibold mb-3">Select Players ({formData.selectedPlayers.length})</h2>
                    <div className="mb-3">
                        <Input
                            placeholder="Filter players..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            icon={<Search className="h-4 w-4 text-gray-400" />}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 border rounded p-2">
                        {filteredPlayers.map(p => (
                            <label key={p.id} className={`flex items-center gap-3 cursor-pointer p-2 rounded transition-colors ${formData.selectedPlayers.includes(p.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.selectedPlayers.includes(p.id)}
                                    onChange={() => setFormData({ ...formData, selectedPlayers: toggleSelection(formData.selectedPlayers, p.id) })}
                                    className="rounded text-indigo-600 w-4 h-4"
                                />
                                <div className="flex items-center gap-2">
                                    {p.avatarUrl && <img src={p.avatarUrl} className="w-6 h-6 rounded-full bg-gray-200" />}
                                    <span className="text-sm font-medium">{p.username}</span>
                                    {p.id === currentUser?.id && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">You</span>}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Questions Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col h-full">
                    <h2 className="text-lg font-semibold mb-3">Select Questions ({formData.selectedQuestions.length})</h2>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <Input
                            placeholder="Search text..."
                            value={questionFilters.text}
                            onChange={(e) => setQuestionFilters({ ...questionFilters, text: e.target.value })}
                            className="col-span-3 md:col-span-1"
                        />
                        <select
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={questionFilters.topicId}
                            onChange={(e) => setQuestionFilters({ ...questionFilters, topicId: e.target.value })}
                        >
                            <option value="">All Topics</option>
                            {topics.map(t => (
                                <option key={t.id} value={t.id}>{t.text}</option>
                            ))}
                        </select>
                        <select
                            className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={questionFilters.difficulty}
                            onChange={(e) => setQuestionFilters({ ...questionFilters, difficulty: e.target.value })}
                        >
                            <option value="">Any Difficulty</option>
                            {[1, 2, 3, 4, 5].map(d => (
                                <option key={d} value={d}>Level {d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 border rounded p-2">
                        {filteredQuestions.map(q => {
                            const topic = topics.find(t => t.id === q.topicId);
                            return (
                                <label key={q.id} className={`flex items-start gap-3 cursor-pointer p-2 rounded transition-colors ${formData.selectedQuestions.includes(q.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.selectedQuestions.includes(q.id)}
                                        onChange={() => setFormData({ ...formData, selectedQuestions: toggleSelection(formData.selectedQuestions, q.id) })}
                                        className="rounded text-indigo-600 w-4 h-4 mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{q.text}</p>
                                        <div className="flex gap-2 mt-0.5">
                                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded">{topic?.text || 'Unknown'}</span>
                                            <span className={`text-xs px-1.5 rounded ${q.difficulty <= 2 ? 'bg-green-100 text-green-700' :
                                                q.difficulty <= 4 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>Lvl {q.difficulty}</span>
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                        {filteredQuestions.length === 0 && <p className="text-gray-500 text-center text-sm py-4">No questions match filters</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        <div className="text-sm text-gray-500 bg-yellow-50 p-2.5 rounded">
                            Rule: Questions must be divisible by Players.
                            <div className="font-mono mt-1 text-xs">
                                {formData.selectedQuestions.length} % {(formData.selectedPlayers.length || 1)} = {formData.selectedQuestions.length % (formData.selectedPlayers.length || 1)}
                            </div>
                            {formData.selectedPlayers.length > 0 && formData.selectedQuestions.length % formData.selectedPlayers.length === 0
                                ? <span className="text-green-600 font-bold block mt-1">✓ Valid Configuration</span>
                                : <span className="text-red-500 font-bold block mt-1">✕ Invalid Configuration</span>}
                        </div>
                        <Button onClick={handleCreateGame} className="w-full" size="lg">Create Game</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CreateGamePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateGameContent />
        </Suspense>
    );
}
