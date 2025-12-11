'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Languages } from 'lucide-react';

export default function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{t('settings', 'Settings')}</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* THEME SECTION */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                            {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            {t('appearance', 'Appearance')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('theme_mode', 'Theme Mode')}
                            </span>
                            <Button
                                variant="outline"
                                onClick={toggleTheme}
                                className="w-32"
                            >
                                {theme === 'light' ? 'Light' : 'Dark'}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('theme_desc', 'Toggle between light and dark mode.')}
                        </p>
                    </CardContent>
                </Card>

                {/* LANGUAGE SECTION */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                            <Languages className="h-5 w-5" />
                            {t('language', 'Language')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('current_language', 'Current Language')}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={i18n.language === 'en' ? 'primary' : 'outline'}
                                    onClick={() => changeLanguage('en')}
                                >
                                    English
                                </Button>
                                <Button
                                    size="sm"
                                    variant={i18n.language === 'it' ? 'primary' : 'outline'}
                                    onClick={() => changeLanguage('it')}
                                >
                                    Italiano
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('language_desc', 'Select your preferred language.')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
