'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Search, Copy, Play } from 'lucide-react';
import Link from 'next/link';

interface Player {
    id: string;
    username: string;
    image: string | null;
}

interface Game {
    id: string;
    name: string;
    language: string;
    status: string;
    ownerId: string;
    createdAt: string;
    players: { user: Player }[];
    questions: { question: { id: string } }[];
}

export default function GamesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            fetchGames();
        }
    }, [status]);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/games');
            const data = await res.json();
            setGames(data);
        } catch (error) {
            console.error('Failed to fetch games:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this game?')) return;

        try {
            const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchGames();
            }
        } catch (error) {
            console.error('Failed to delete game:', error);
        }
    };

    const handleDuplicate = async (gameId: string) => {
        try {
            const res = await fetch(`/api/games/${gameId}/duplicate`, {
                method: 'POST',
            });

            if (res.ok) {
                const newGame = await res.json();
                router.push(`/dashboard/games/${newGame.id}/edit`);
            }
        } catch (error) {
            console.error('Failed to duplicate game:', error);
        }
    };

    const filteredGames = games.filter(game => {
        if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterStatus && game.status !== filterStatus) return false;
        if (filterLanguage && game.language !== filterLanguage) return false;
        return true;
    });

    const canManageGame = (game: Game) => {
        if (!session) return false;
        if (session.user.role === 'ADMIN') return true;
        if (session.user.role === 'EDITOR' && game.ownerId === session.user.id) return true;
        return false;
    };

    const canPlayGame = (game: Game) => {
        if (!session) return false;
        if (session.user.role === 'ADMIN') return true;
        return game.players.some(p => p.user.id === session.user.id);
    };

    if (status === 'loading' || loading) {
        return <div className="text-white">Loading...</div>;
    }

    if (!session) {
        router.push('/auth/signin');
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{t('menu.games')}</h1>
                {(session.user.role === 'ADMIN' || session.user.role === 'EDITOR') && (
                    <Link
                        href="/dashboard/games/create"
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Create Game
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search games..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Statuses</option>
                        <option value="CREATED" className="bg-gray-800">Created</option>
                        <option value="STARTED" className="bg-gray-800">Started</option>
                        <option value="ENDED" className="bg-gray-800">Ended</option>
                    </select>

                    <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Languages</option>
                        <option value="en" className="bg-gray-800">English</option>
                        <option value="it" className="bg-gray-800">Italian</option>
                    </select>
                </div>
            </div>

            {/* Games List */}
            <div className="space-y-4">
                {filteredGames.map((game) => (
                    <div
                        key={game.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-2xl font-semibold text-white mb-2">{game.name}</h3>
                                <div className="flex gap-4 text-sm text-white/60">
                                    <span>Language: {game.language.toUpperCase()}</span>
                                    <span>Players: {game.players.length}</span>
                                    <span>Questions: {game.questions.length}</span>
                                    <span className={`px-2 py-1 rounded ${game.status === 'CREATED' ? 'bg-blue-500/20 text-blue-300' :
                                            game.status === 'STARTED' ? 'bg-yellow-500/20 text-yellow-300' :
                                                'bg-green-500/20 text-green-300'
                                        }`}>
                                        {game.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {canPlayGame(game) && game.status !== 'ENDED' && (
                                    <Link
                                        href={`/dashboard/games/${game.id}/play`}
                                        className="flex items-center gap-2 bg-green-500/20 text-white py-2 px-4 rounded-lg hover:bg-green-500/30 transition-all"
                                    >
                                        <Play size={16} />
                                        Play
                                    </Link>
                                )}

                                {session.user.role !== 'PLAYER' && (
                                    <button
                                        onClick={() => handleDuplicate(game.id)}
                                        className="flex items-center gap-2 bg-purple-500/20 text-white py-2 px-4 rounded-lg hover:bg-purple-500/30 transition-all"
                                    >
                                        <Copy size={16} />
                                        Duplicate
                                    </button>
                                )}

                                {canManageGame(game) && (
                                    <>
                                        <Link
                                            href={`/dashboard/games/${game.id}/edit`}
                                            className="flex items-center gap-2 bg-blue-500/20 text-white py-2 px-4 rounded-lg hover:bg-blue-500/30 transition-all"
                                        >
                                            <Edit size={16} />
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(game.id)}
                                            className="flex items-center gap-2 bg-red-500/20 text-white py-2 px-4 rounded-lg hover:bg-red-500/30 transition-all"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Player Avatars */}
                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Players:</span>
                            <div className="flex -space-x-2">
                                {game.players.map((gp) => (
                                    <img
                                        key={gp.user.id}
                                        src={gp.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gp.user.username}`}
                                        alt={gp.user.username}
                                        className="w-8 h-8 rounded-full border-2 border-white/20"
                                        title={gp.user.username}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredGames.length === 0 && (
                <div className="text-center text-white/60 py-12">
                    No games found. Create your first game!
                </div>
            )}
        </div>
    );
}
