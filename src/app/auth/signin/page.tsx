'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function SignInPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGuestLogin = async () => {
        if (!username.trim()) {
            setError('Username is required for guest login');
            return;
        }
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            username,
            password: '',
            isGuest: 'true',
            redirect: false,
        });

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Username and password are required');
            return;
        }
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            username,
            password,
            isGuest: 'false',
            redirect: false,
        });

        if (result?.error) {
            setError('Invalid credentials');
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    const handleGoogleLogin = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
                <h1 className="text-4xl font-bold text-white text-center mb-8">
                    SynaptiQuiz
                </h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCredentialsLogin} className="space-y-4">
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
                    >
                        {t('auth.loginWithCredentials')}
                    </button>
                </form>

                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-white/30"></div>
                    <span className="px-4 text-white/60 text-sm">OR</span>
                    <div className="flex-1 border-t border-white/30"></div>
                </div>

                <button
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="w-full bg-white/20 border border-white/30 text-white font-semibold py-3 rounded-lg hover:bg-white/30 transition-all mb-3 disabled:opacity-50"
                >
                    {t('auth.loginAsGuest')}
                </button>

                {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && (
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white text-gray-800 font-semibold py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('auth.loginWithGoogle')}
                    </button>
                )}

                <p className="text-center text-white/80 mt-6">
                    {t('auth.noAccount')}{' '}
                    <Link href="/auth/register" className="text-cyan-300 hover:text-cyan-200 font-semibold">
                        {t('auth.register')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
