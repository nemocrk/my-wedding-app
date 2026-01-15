import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader } from 'lucide-react';
import { api } from '../services/api';

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const data = await api.fetchLanguages();
        setLanguages(data);
      } catch (error) {
        console.error('Failed to load languages:', error);
        // Fallback to default languages if API fails
        setLanguages([
          { code: 'it', name: 'Italiano', flag_emoji: '🇮🇹' },
          { code: 'en', name: 'English', flag_emoji: '🇬🇧' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const currentLang = i18n.language || 'it';

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Globe size={18} />
        <Loader size={16} className="animate-spin" />
      </div>
    );
  }

  // Compact variant for header/sidebar integration
  return (
    <div className="flex items-center gap-2">
      <Globe size={18} className="text-gray-500" />
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentLang === lang.code
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={lang.name}
            aria-label={`Switch to ${lang.name}`}
          >
            <span className="text-base leading-none">{lang.flag_emoji}</span>
            <span className="uppercase text-xs font-bold">{lang.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
