'use client';

import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Globe } from 'lucide-react';

export default function OptionsPage() {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">{t('menu.options')}</h1>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 space-y-8">
                {/* Theme Selection */}
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
                        Theme
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-6 rounded-lg border-2 transition-all ${theme === 'light'
                                    ? 'border-cyan-400 bg-white/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <Sun size={32} className="mx-auto mb-2 text-white" />
                            <p className="text-white font-medium">Light Mode</p>
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-6 rounded-lg border-2 transition-all ${theme === 'dark'
                                    ? 'border-cyan-400 bg-white/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <Moon size={32} className="mx-auto mb-2 text-white" />
                            <p className="text-white font-medium">Dark Mode</p>
                        </button>
                    </div>
                </div>

                {/* Language Selection */}
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe size={24} />
                        Language
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`p-6 rounded-lg border-2 transition-all ${i18n.language === 'en'
                                    ? 'border-cyan-400 bg-white/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <p className="text-4xl mb-2">🇬🇧</p>
                            <p className="text-white font-medium">English</p>
                        </button>
                        <button
                            onClick={() => changeLanguage('it')}
                            className={`p-6 rounded-lg border-2 transition-all ${i18n.language === 'it'
                                    ? 'border-cyan-400 bg-white/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <p className="text-4xl mb-2">🇮🇹</p>
                            <p className="text-white font-medium">Italiano</p>
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                    <p className="text-white/60 text-sm">
                        Your preferences will be used as default settings for creating games and questions.
                    </p>
                </div>
            </div>
        </div>
    );
}
