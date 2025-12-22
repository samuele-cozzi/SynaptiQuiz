'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Search } from 'lucide-react';

interface Player {
    id: string;
    username: string;
    email: string | null;
    role: string;
    image: string | null;
    isGuest: boolean;
}

export default function PlayersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [formData, setFormData] = useState({ role: 'PLAYER' });

    useEffect(() => {
        if (status === 'authenticated') {
            fetchPlayers();
        }
    }, [status]);

    const fetchPlayers = async () => {
        try {
            const res = await fetch('/api/players');
            const data = await res.json();
            setPlayers(data);
        } catch (error) {
            console.error('Failed to fetch players:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingPlayer) return;

        try {
            const res = await fetch(`/api/players/${editingPlayer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchPlayers();
                setShowModal(false);
                setEditingPlayer(null);
            }
        } catch (error) {
            console.error('Failed to update player:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this player?')) return;

        try {
            const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchPlayers();
            }
        } catch (error) {
            console.error('Failed to delete player:', error);
        }
    };

    const openEditModal = (player: Player) => {
        setEditingPlayer(player);
        setFormData({ role: player.role });
        setShowModal(true);
    };

    const filteredPlayers = players.filter(player => {
        if (searchTerm && !player.username.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterRole && player.role !== filterRole) return false;
        return true;
    });

    if (status === 'loading' || loading) {
        return <div className="text-white">Loading...</div>;
    }

    if (session?.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{t('menu.players')}</h1>
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search players..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="">All Roles</option>
                        <option value="ADMIN" className="bg-gray-800">Admin</option>
                        <option value="EDITOR" className="bg-gray-800">Editor</option>
                        <option value="PLAYER" className="bg-gray-800">Player</option>
                    </select>
                </div>
            </div>

            {/* Players Table */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-white font-semibold">Player</th>
                            <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                            <th className="px-6 py-4 text-left text-white font-semibold">Role</th>
                            <th className="px-6 py-4 text-left text-white font-semibold">Type</th>
                            <th className="px-6 py-4 text-right text-white font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlayers.map((player) => (
                            <tr key={player.id} className="border-t border-white/10 hover:bg-white/5">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                            alt={player.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <span className="text-white font-medium">{player.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-white/60">{player.email || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${player.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                                            player.role === 'EDITOR' ? 'bg-blue-500/20 text-blue-300' :
                                                'bg-green-500/20 text-green-300'
                                        }`}>
                                        {player.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-white/60">{player.isGuest ? 'Guest' : 'Registered'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(player)}
                                            className="flex items-center gap-2 bg-blue-500/20 text-white py-2 px-4 rounded-lg hover:bg-blue-500/30 transition-all"
                                        >
                                            <Edit size={16} />
                                            Edit
                                        </button>
                                        {player.id !== session.user.id && (
                                            <button
                                                onClick={() => handleDelete(player.id)}
                                                className="flex items-center gap-2 bg-red-500/20 text-white py-2 px-4 rounded-lg hover:bg-red-500/30 transition-all"
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredPlayers.length === 0 && (
                <div className="text-center text-white/60 py-12">
                    No players found.
                </div>
            )}

            {/* Modal */}
            {showModal && editingPlayer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            Edit Player: {editingPlayer.username}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="ADMIN" className="bg-gray-800">Admin</option>
                                    <option value="EDITOR" className="bg-gray-800">Editor</option>
                                    <option value="PLAYER" className="bg-gray-800">Player</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white/20 text-white py-3 rounded-lg hover:bg-white/30 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
