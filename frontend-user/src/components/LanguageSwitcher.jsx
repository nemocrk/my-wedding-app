import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const currentLang = i18n.language || 'it';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2">
        <Globe size={20} className="text-gray-600" />
        <button
          onClick={() => changeLanguage('it')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            currentLang === 'it'
              ? 'bg-pink-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🇮🇹 IT
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            currentLang === 'en'
              ? 'bg-pink-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🇬🇧 EN
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
