import React from 'react';
import { Languages } from 'lucide-react';

const LanguageToggle = ({ lang, setLang }) => {
    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'mr' : 'en';
        setLang(nextLang);
        localStorage.setItem('app_lang', nextLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-black shadow-sm"
            title="Change Language / भाषा बदला"
        >
            <Languages size={16} className="text-orange-500" />
            <span>{lang === 'en' ? 'मराठी' : 'English'}</span>
        </button>
    );
};

export default LanguageToggle;