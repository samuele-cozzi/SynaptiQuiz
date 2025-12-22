'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlayerStats {
    id: string;
    username: string;
    image: string | null;
    totalPoints: number;
    gamesPlayedCount: number;
    gamesWonCount: number;
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const { t } = useTranslation();
    const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchLeaderboard();
        }
    }, [status]);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard');
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
                    <Trophy size={32} className="text-yellow-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('menu.leaderboard')}</h1>
                    <p className="text-white/60">Top players across all games</p>
                </div>
            </div>

            {leaderboard.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {leaderboard.slice(0, 3).map((player, index) => (
                        <div
                            key={player.id}
                            className={`relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border text-center transition-all hover:scale-105 ${index === 0 ? 'border-yellow-400/50 ring-2 ring-yellow-400/20 md:order-2 md:scale-110' :
                                    index === 1 ? 'border-gray-300/50 md:order-1' :
                                        'border-orange-400/50 md:order-3'
                                }`}
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                <div className={`p-2 rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : 'bg-orange-400'
                                    }`}>
                                    <Medal size={20} className="text-gray-900" />
                                </div>
                            </div>
                            <img
                                src={player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white/10"
                            />
                            <h3 className="text-xl font-bold text-white mb-1">{player.username}</h3>
                            <p className="text-3xl font-black text-white mb-4">{player.totalPoints}</p>
                            <div className="flex justify-around text-white/60 text-xs">
                                <div>
                                    <p className="font-bold text-white">{player.gamesPlayedCount}</p>
                                    <p>Played</p>
                                </div>
                                <div>
                                    <p className="font-bold text-white">{player.gamesWonCount}</p>
                                    <p>Won</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4 text-white/60 font-semibold uppercase text-xs">Rank</th>
                            <th className="px-6 py-4 text-white/60 font-semibold uppercase text-xs">Player</th>
                            <th className="px-6 py-4 text-white/60 font-semibold uppercase text-xs text-center">Games</th>
                            <th className="px-6 py-4 text-white/60 font-semibold uppercase text-xs text-center">Wins</th>
                            <th className="px-6 py-4 text-white/60 font-semibold uppercase text-xs text-right">Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((player, index) => (
                            <tr
                                key={player.id}
                                className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-all ${player.id === session?.user?.id ? 'bg-cyan-500/10' : ''
                                    }`}
                            >
                                <td className="px-6 py-4">
                                    <span className={`text-lg font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white/40'
                                        }`}>
                                        #{index + 1}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={player.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <span className="text-white font-semibold">{player.username}</span>
                                        {player.id === session?.user?.id && (
                                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">YOU</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center text-white/80">{player.gamesPlayedCount}</td>
                                <td className="px-6 py-4 text-center text-white/80">{player.gamesWonCount}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-white font-black text-lg">{player.totalPoints}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
