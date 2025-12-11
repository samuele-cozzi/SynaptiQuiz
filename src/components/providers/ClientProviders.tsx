'use client';

import React from 'react';
import '@/lib/i18n';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    // Simple wrapper to ensure i18n is imported/initialized
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
