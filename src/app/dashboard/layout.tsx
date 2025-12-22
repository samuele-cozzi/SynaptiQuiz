'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Home,
    Gamepad2,
    HelpCircle,
    Tag,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    Trophy
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
                <div className="text-white text-2xl font-bold">Loading...</div>
            </div>
        );
    }

    if (!session) return null;

    const userRole = session.user.role;

    const menuItems = [
        { icon: Gamepad2, label: t('menu.games'), href: '/dashboard/games', roles: ['ADMIN', 'EDITOR', 'PLAYER'] },
        { icon: Trophy, label: t('menu.leaderboard'), href: '/dashboard/leaderboard', roles: ['ADMIN', 'EDITOR', 'PLAYER'] },
        { icon: HelpCircle, label: t('menu.questions'), href: '/dashboard/questions', roles: ['ADMIN', 'EDITOR'] },
        { icon: Tag, label: t('menu.topics'), href: '/dashboard/topics', roles: ['ADMIN', 'EDITOR'] },
        { icon: Users, label: t('menu.players'), href: '/dashboard/players', roles: ['ADMIN'] },
        { icon: Settings, label: t('menu.options'), href: '/dashboard/options', roles: ['ADMIN', 'EDITOR', 'PLAYER'] },
    ];

    const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20 px-4 py-3 flex items-center justify-between">
                <h1 className="text-white text-xl font-bold">SynaptiQuiz</h1>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-white p-2"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-lg border-r border-white/20 transform transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                <div className="p-6">
                    <h1 className="text-white text-2xl font-bold mb-8">SynaptiQuiz</h1>

                    {/* User Info */}
                    <div className="mb-8 p-4 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3">
                            <img
                                src={session.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.username}`}
                                alt="Avatar"
                                className="w-12 h-12 rounded-full"
                            />
                            <div>
                                <p className="text-white font-semibold">{session.user.username}</p>
                                <p className="text-white/60 text-sm">{session.user.role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        {filteredMenuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Theme Toggle */}
                    <div className="mt-8 p-4 bg-white/10 rounded-lg">
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="flex items-center gap-3 text-white/80 hover:text-white w-full"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                        </button>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                        className="mt-4 flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-red-500/20 rounded-lg transition-all w-full"
                    >
                        <LogOut size={20} />
                        <span>{t('menu.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
