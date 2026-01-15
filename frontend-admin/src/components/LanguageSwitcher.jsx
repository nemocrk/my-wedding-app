import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader } from 'lucide-react';
import { api } from '../services/api';

const LanguageSwitcher = () => {
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
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-gray-500" />
        <Loader size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={18} className="text-gray-500" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`px-2 py-1 rounded text-sm font-medium transition-all ${
            currentLang === lang.code
              ? 'bg-pink-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={lang.name}
        >
          {lang.flag_emoji} {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
