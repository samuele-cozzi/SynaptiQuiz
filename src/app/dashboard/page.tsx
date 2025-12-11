'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { Gamepad2, Trophy, Zap, AlertCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { player } = useAuth();

    const stats = [
        { label: 'Total Score', value: '0', icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Games Played', value: '0', icon: Gamepad2, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { label: 'Win Rate', value: '0%', icon: Zap, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Welcome back, {player?.username}!
                </h1>
                <p className="text-gray-500">Here is what is happening with your games today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className={`rounded-xl p-3 ${stat.bg}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Recent Games</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <Gamepad2 className="h-10 w-10 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500 mb-4">No recent games found</p>
                            <Link
                                href="/dashboard/games"
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                Start a new game &rarr;
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Link
                            href="/dashboard/games"
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <Gamepad2 className="h-5 w-5 text-purple-600 group-hover:text-indigo-600" />
                                </div>
                                <span className="font-medium text-gray-700">Create New Game</span>
                            </div>
                            <span className="text-gray-400 group-hover:text-indigo-400">&rarr;</span>
                        </Link>

                        {player?.isAdmin && (
                            <Link
                                href="/dashboard/questions"
                                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-200 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <HelpCircle className="h-5 w-5 text-blue-600 group-hover:text-indigo-600" />
                                    </div>
                                    <span className="font-medium text-gray-700">Manage Questions</span>
                                </div>
                                <span className="text-gray-400 group-hover:text-indigo-400">&rarr;</span>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
