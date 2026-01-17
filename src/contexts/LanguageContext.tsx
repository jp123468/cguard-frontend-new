import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import i18n from '@/i18n';

type Language = 'es' | 'en' | 'pt';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGES = {
    es: { code: 'es', name: 'Español', flag: '🇪🇸' },
    en: { code: 'en', name: 'English', flag: '🇺🇸' },
    pt: { code: 'pt', name: 'Português', flag: '🇧🇷' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        const stored = localStorage.getItem('app_language');
        return (stored as Language) || 'es';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);
        // also set generic key used by legacy pages (Google Translate page)
        try { localStorage.setItem('language', lang); } catch {}
        i18n.changeLanguage(lang);
    };

    useEffect(() => {
        // ensure i18n is using the stored language on mount
        try { i18n.changeLanguage(language); } catch {}
    }, []);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export { LANGUAGES };
export type { Language };
