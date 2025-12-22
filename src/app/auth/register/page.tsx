'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import bcrypt from 'bcryptjs';

export default function RegisterPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: hashedPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Registration failed');
                setLoading(false);
                return;
            }

            router.push('/auth/signin');
        } catch (err) {
            setError('An error occurred during registration');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
                <h1 className="text-4xl font-bold text-white text-center mb-8">
                    {t('auth.register')}
                </h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            {t('auth.username')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            placeholder={t('auth.username')}
                        />
                    </div>

                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            {t('auth.password')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            placeholder={t('auth.password')}
                        />
                    </div>

                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            {t('auth.confirmPassword')}
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            placeholder={t('auth.confirmPassword')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                    >
                        {t('auth.signUp')}
                    </button>
                </form>

                <p className="text-center text-white/80 mt-6">
                    {t('auth.hasAccount')}{' '}
                    <Link href="/auth/signin" className="text-cyan-300 hover:text-cyan-200 font-semibold">
                        {t('auth.signIn')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
