'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

interface Player {
    id: string;
    username: string;
    image: string | null;
}

interface Topic {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    difficulty: number;
    language: string;
    topic: Topic;
}

export default function CreateGamePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t, i18n } = useTranslation();

    const [formData, setFormData] = useState({
        name: '',
        language: i18n.language || 'en',
    });

    const [players, setPlayers] = useState<Player[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

    const [playerSearch, setPlayerSearch] = useState('');
    const [questionSearch, setQuestionSearch] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');

    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            fetchPlayers();
            fetchTopics();
        }
    }, [status]);

    useEffect(() => {
        if (formData.language) {
            fetchQuestions();
        }
    }, [formData.language]);

    const fetchPlayers = async () => {
        try {
            const res = await fetch('/api/players');
            const data = await res.json();
            setPlayers(data);
        } catch (error) {
            console.error('Failed to fetch players:', error);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await fetch('/api/questions');
            const data = await res.json();
            setQuestions(data.filter((q: Question) => q.language === formData.language));
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        }
    };

    const fetchTopics = async () => {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            setTopics(data);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        }
    };

    const validateGame = (): boolean => {
        if (!formData.name.trim()) {
            setValidationError('Game name is required');
            return false;
        }

        if (selectedPlayers.length === 0) {
            setValidationError('At least one player is required');
            return false;
        }

        if (selectedQuestions.length === 0) {
            setValidationError('At least one question is required');
            return false;
        }

        if (selectedQuestions.length % selectedPlayers.length !== 0) {
            setValidationError(
                `Number of questions (${selectedQuestions.length}) must be divisible by number of players (${selectedPlayers.length})`
            );
            return false;
        }

        setValidationError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateGame()) return;

        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    playerIds: selectedPlayers,
                    questionIds: selectedQuestions,
                }),
            });

            if (res.ok) {
                router.push('/dashboard/games');
            } else {
                const error = await res.json();
                setValidationError(error.error || 'Failed to create game');
            }
        } catch (error) {
            console.error('Failed to create game:', error);
            setValidationError('An error occurred');
        }
    };

    const togglePlayer = (playerId: string) => {
        setSelectedPlayers(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    const toggleQuestion = (questionId: string) => {
        setSelectedQuestions(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(playerSearch.toLowerCase())
    );

    const filteredQuestions = questions.filter(q => {
        if (questionSearch && !q.text.toLowerCase().includes(questionSearch.toLowerCase())) return false;
        if (filterTopic && q.topic.id !== filterTopic) return false;
        if (filterDifficulty && q.difficulty !== parseInt(filterDifficulty)) return false;
        return true;
    });

    if (status === 'loading') {
        return <div className="text-white">Loading...</div>;
    }

    if (!session || session.user.role === 'PLAYER') {
        router.push('/dashboard');
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Create New Game</h1>
                <button
                    onClick={() => router.back()}
                    className="text-white/60 hover:text-white transition-all"
                >
                    Cancel
                </button>
            </div>

            {validationError && (
                <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg">
                    {validationError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Game Details */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-semibold text-white mb-4">Game Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Game Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="Enter game name"
                            />
                        </div>
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Language
                            </label>
                            <select
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                                <option value="en" className="bg-gray-800">English</option>
                                <option value="it" className="bg-gray-800">Italian</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Player Selection */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Select Players ({selectedPlayers.length} selected)
                    </h2>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                        <input
                            type="text"
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            placeholder="Search players..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                        {filteredPlayers.map((player) => (
                            <button
                                key={player.id}
                                type="button"
                                onClick={() => togglePlayer(player.id)}
                                className={`p-3 rounded-lg border-2 transition-all ${selectedPlayers.includes(player.id)
                                        ? 'border-cyan-400 bg-cyan-500/20'
                                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <img
                                        src={player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                        alt={player.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <span className="text-white text-sm truncate">{player.username}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question Selection */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Select Questions ({selectedQuestions.length} selected)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                            <input
                                type="text"
                                value={questionSearch}
                                onChange={(e) => setQuestionSearch(e.target.value)}
                                placeholder="Search questions..."
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        <select
                            value={filterTopic}
                            onChange={(e) => setFilterTopic(e.target.value)}
                            className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                            <option value="">All Topics</option>
                            {topics.map(topic => (
                                <option key={topic.id} value={topic.id} className="bg-gray-800">
                                    {topic.text}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filterDifficulty}
                            onChange={(e) => setFilterDifficulty(e.target.value)}
                            className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                            <option value="">All Difficulties</option>
                            {[1, 2, 3, 4, 5].map(d => (
                                <option key={d} value={d} className="bg-gray-800">
                                    Difficulty {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredQuestions.map((question) => (
                            <button
                                key={question.id}
                                type="button"
                                onClick={() => toggleQuestion(question.id)}
                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedQuestions.includes(question.id)
                                        ? 'border-cyan-400 bg-cyan-500/20'
                                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-white flex-1">{question.text}</span>
                                    <div className="flex gap-2 ml-4">
                                        <span className="text-white/60 text-sm">{question.topic.text}</span>
                                        <span className="text-white/60 text-sm">Diff: {question.difficulty}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 bg-white/20 text-white py-3 rounded-lg hover:bg-white/30 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition-all"
                    >
                        Create Game
                    </button>
                </div>
            </form>
        </div>
    );
}
