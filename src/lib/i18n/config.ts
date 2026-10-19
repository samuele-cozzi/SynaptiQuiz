import i18n from 'i18next';
import type { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import locales from './locales.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: locales satisfies Resource,
        fallbackLng: 'en',
        supportedLngs: ['en', 'it'],
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
