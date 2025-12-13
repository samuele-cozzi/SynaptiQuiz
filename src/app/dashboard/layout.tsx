'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { player, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && !player) {
            console.warn("DashboardLayout: Access Denied. Loading:", loading, "Player:", player);
            // DEBUG: Do not redirect immediately, show error to user for screenshot
            // router.push('/');
        }
    }, [player, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied (Debug Mode)</h2>
                    <p className="mb-2">You were about to be redirected to login.</p>
                    <div className="text-left bg-gray-100 p-4 rounded text-xs font-mono mb-4">
                        <p>Loading: {String(loading)}</p>
                        <p>Player: {String(player)}</p>
                        <p>User UID: {String(useAuth().user?.uid)}</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                        Go to Login
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-2 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 animate-in fade-in duration-500 overflow-x-hidden">
                <div className="mx-auto max-w-6xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
