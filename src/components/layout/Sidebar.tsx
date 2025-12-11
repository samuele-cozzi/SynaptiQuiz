'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    Users,
    HelpCircle,
    Tags,
    Gamepad2,
    Trophy,
    LogOut,
    Menu,
    X,
    BrainCircuit,
    LayoutDashboard,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

export function Sidebar() {
    const pathname = usePathname();
    const { logout, player } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation('common');

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Games', href: '/dashboard/games', icon: Gamepad2 },
        { name: 'Players', href: '/dashboard/players', icon: Users },
        { name: 'Questions', href: '/dashboard/questions', icon: HelpCircle },
        { name: 'Topics', href: '/dashboard/topics', icon: Tags },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        // { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    ];

    const adminOnly = ['Players', 'Questions', 'Topics', 'Games'];

    const filteredNav = navigation.filter(item => {
        if (adminOnly.includes(item.name) && !player?.isAdmin && item.name !== 'Games') {
            // Games might be viewable by everyone, but let's assume management is admin initially? 
            // Actually "Games, where user can manage games" usually implies admin or creation.
            // Let's hide specific management tabs if not admin, but careful with requirements.
            // Requirements say: "After login in a page the user can choose between: Players, Questions, Topics, Games"
            // It doesn't explicitly say ONLY admin, but "The first player is an admin... The admin can create a game".
            // I'll show all links for now but handle permission inside or just show for clarity.
            // Let's assume for now everyone sees them but actions are restricted.
            return true;
        }
        return true;
    });

    return (
        <>
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-indigo-600">
                    <BrainCircuit className="h-6 w-6" />
                    <span>SynaptiQuiz</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-gray-500 hover:text-gray-900"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            <div
                className={clsx(
                    "fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 font-bold text-indigo-600 hidden lg:flex">
                    <BrainCircuit className="h-6 w-6" />
                    <span className="text-xl">SynaptiQuiz</span>
                </div>

                <div className="flex flex-col justify-between h-[calc(100%-4rem)] p-4">
                    <nav className="space-y-1 mt-16 lg:mt-4">
                        {filteredNav.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-3 px-3 py-2">
                            <div className="h-8 w-8 overflow-hidden rounded-full bg-indigo-100">
                                {player?.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={player.avatarUrl} alt={player.username} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-indigo-600 font-bold">
                                        {player?.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium text-gray-900">{player?.username}</p>
                                <p className="text-xs text-gray-500">{player?.isAdmin ? 'Admin' : 'Player'}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="mt-2 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => logout()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('auth.logout', 'Logout')}
                        </Button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
