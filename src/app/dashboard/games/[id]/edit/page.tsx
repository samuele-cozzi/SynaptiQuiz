'use client';

import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    useEffect(() => {
        // For now, redirect to games list
        // Full edit functionality would be similar to create page
        router.push('/dashboard/games');
    }, [router]);

    return (
        <div className="text-white">
            <p>Edit functionality coming soon. Redirecting...</p>
        </div>
    );
}
