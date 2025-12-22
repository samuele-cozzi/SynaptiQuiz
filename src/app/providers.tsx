'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/lib/i18n/config';

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize i18n on client
        import('@/lib/i18n/config');
    }, []);

    return (
        <SessionProvider>
            <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
    );
}
