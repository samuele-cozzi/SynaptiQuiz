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
            console.log("DashboardLayout: Redirecting to login (no player found)");
            router.push('/');
        }
    }, [player, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!player) return null;

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
