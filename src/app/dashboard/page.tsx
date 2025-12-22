'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        points: 0,
        gamesPlayed: 0,
        gamesWon: 0,
    });

    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            // Fetch user stats
            fetch(`/api/users/${session.user.id}/stats`)
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(err => console.error('Failed to fetch stats:', err));
        }
    }, [status, session]);

    if (status === 'loading') {
        return <div className="text-white">Loading...</div>;
    }

    if (!session) {
        router.push('/auth/signin');
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h1 className="text-3xl font-bold text-white mb-2">
                    {t('dashboard.welcome')}, {session.user.username || session.user.name || 'User'}!
                </h1>
                <p className="text-white/60">
                    {t('dashboard.title')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-white/60 text-sm font-medium mb-2">
                        {t('dashboard.points')}
                    </h3>
                    <p className="text-4xl font-bold text-white">{stats.points}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-white/60 text-sm font-medium mb-2">
                        {t('dashboard.gamesPlayed')}
                    </h3>
                    <p className="text-4xl font-bold text-white">{stats.gamesPlayed}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-white/60 text-sm font-medium mb-2">
                        Games Won
                    </h3>
                    <p className="text-4xl font-bold text-white">{stats.gamesWon}</p>
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push('/dashboard/games')}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                        View Games
                    </button>
                    {(session.user.role === 'ADMIN' || session.user.role === 'EDITOR') && (
                        <button
                            onClick={() => router.push('/dashboard/questions')}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-4 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                        >
                            Manage Questions
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
