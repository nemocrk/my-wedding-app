import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Loader2, Globe } from 'lucide-react';
import ConfigurableTextEditor from './ConfigurableTextEditor';
import { useTranslation } from 'react-i18next';

const TextConfigWidget = () => {
  const { t } = useTranslation();
  const [allTexts, setAllTexts] = useState([]); // Store ALL texts for ALL languages
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedLang, setSelectedLang] = useState('it');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  
  // Pre-defined known keys to ensure they are visible even if not yet in DB
  const KNOWN_KEYS = [
    { key: 'envelope.front.content', label: 'Busta: Fronte (HTML)' },
    { key: 'card.alloggio.content_offered', label: 'Card Alloggio: Offerto' },
    { key: 'card.alloggio.content_not_offered', label: 'Card Alloggio: Non Offerto' },
    { key: 'card.viaggio.content', label: 'Card Viaggio' },
    { key: 'card.evento.content', label: 'Card Evento' },
    { key: 'card.dresscode.content', label: 'Card Dress Code' },
    { key: 'card.bottino.content', label: 'Card Bottino (Regalo)' },
    { key: 'card.cosaltro.content', label: 'Card Cos\'altro' },
  ];

  // 1. Initial Load: Languages AND All Texts
  useEffect(() => {
    const initData = async () => {
        setLoading(true);
        try {
            // First: Load languages
            const langs = await api.fetchLanguages();
            setAvailableLanguages(langs);

            // Then: Load texts for EACH language and ADD language attribute manually
            const textsPromises = langs.map(async (lang) => {
                const texts = await api.fetchConfigurableTexts(lang.code);
                // IMPORTANT: API doesn't return 'language' field, so we add it manually
                return texts.map(t => ({ ...t, language: lang.code }));
            });
            const textsArrays = await Promise.all(textsPromises);
            
            // Flatten and merge all texts into a single array
            const mergedTexts = textsArrays.flat();
            setAllTexts(mergedTexts);

            // Set default lang if not set or invalid
            if (langs.length > 0 && !langs.find(l => l.code === selectedLang)) {
                if (langs.find(l => l.code === 'it')) setSelectedLang('it');
                else setSelectedLang(langs[0].code);
            }

        } catch (err) {
            console.error("Errore caricamento iniziale", err);
            setError(t('admin.config.text_editor.load_error'));
        } finally {
            setLoading(false);
        }
    };
    initData();
  }, []);

  // Refresh all texts for all languages
  const refreshTexts = async () => {
      try {
          if (availableLanguages.length === 0) return;
          
          const textsPromises = availableLanguages.map(async (lang) => {
              const texts = await api.fetchConfigurableTexts(lang.code);
              return texts.map(t => ({ ...t, language: lang.code }));
          });
          const textsArrays = await Promise.all(textsPromises);
          const mergedTexts = textsArrays.flat();
          setAllTexts(mergedTexts);
      } catch (err) {
          console.error("Failed to refresh texts", err);
      }
  };

  // Helper per controllare se l'HTML è "vuoto"
  const isContentEmpty = (html) => {
      if (!html) return true;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return !doc.body.textContent.trim() && !doc.body.querySelector('img');
  };

  const handleUpdateText = async (key, newContent) => {
    try {
      if (isContentEmpty(newContent)) {
          // SE VUOTO -> CANCELLA
          const existing = allTexts.find(t => t.key === key && t.language === selectedLang);
          if (existing) {
              await api.deleteConfigurableText(key, selectedLang);
          }
      } else {
          // SE PIENO -> AGGIORNA
          await api.updateConfigurableText(key, { content: newContent }, selectedLang);
      }
      
      // Refresh local state immediately for responsiveness
      await refreshTexts();
      
    } catch (err) {
      console.error(err);
      alert(t('admin.config.text_editor.save_error') + ': ' + err.message);
    }
  };

  const getCombinedList = () => {
    const merged = [...KNOWN_KEYS];
    // Add dynamic keys found in DB (for current lang) but not in KNOWN_KEYS
    const currentLangTexts = allTexts.filter(t => t.language === selectedLang);
    
    currentLangTexts.forEach(dbText => {
      if (!merged.find(k => k.key === dbText.key)) {
        merged.push({ key: dbText.key, label: dbText.key });
      }
    });

    return merged.filter(item => 
      item.label.toLowerCase().includes(filter.toLowerCase()) || 
      item.key.toLowerCase().includes(filter.toLowerCase())
    );
  };
  
  // Calculate missing count for a specific language
  const getMissingCount = (langCode) => {
      const langTexts = allTexts.filter(t => t.language === langCode);
      return KNOWN_KEYS.filter(k => !langTexts.find(t => t.key === k.key)).length;
  };

  const getLangButtonStyle = (langCode) => {
      const isSelected = selectedLang === langCode;
      const baseClass = "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border shadow-sm group";
      
      if (isSelected) {
          return `${baseClass} bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200`;
      }
      return `${baseClass} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300`;
  };

  if (loading && allTexts.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const list = getCombinedList();
  
  // Current texts for editor
  const currentLangTexts = allTexts.filter(t => t.language === selectedLang);

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
        <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Globe size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">{t('admin.config.text_editor.localization')}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t('admin.config.text_editor.title')}</h2>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap bg-gray-100 p-1.5 rounded-full">
            {availableLanguages.map(lang => {
                const missingCount = getMissingCount(lang.code);
                return (
                    <button
                        key={lang.code}
                        onClick={() => setSelectedLang(lang.code)}
                        className={getLangButtonStyle(lang.code)}
                        title={missingCount > 0 ? `${missingCount} testi mancanti` : 'Completo'}
                    >
                        <span className="text-lg leading-none">{lang.flag}</span>
                        <span className="uppercase">{lang.code}</span>
                        
                        {/* BADGE GIALLO PER TESTI MANCANTI */}
                        {missingCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-md border border-amber-200 flex items-center gap-0.5 animate-pulse">
                                ⚠️ {missingCount}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      <div className="mb-6">
        <input 
          type="text" 
          placeholder={t('admin.config.text_editor.search_placeholder')} 
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {list.map(item => {
          const dbText = currentLangTexts.find(t => t.key === item.key);
          const isConfigured = !!dbText;
          
          return (
            <div key={item.key} className={`border rounded-lg p-4 bg-white shadow-sm transition-all hover:shadow-md ${!isConfigured ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-emerald-500'}`}>
                <div className="mb-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-700 flex items-center gap-2">
                        {item.label}
                        <code className="text-xs font-normal bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.key}</code>
                    </span>
                    {!isConfigured ? (
                        <span className="text-xs text-amber-700 font-bold px-2 py-1 bg-amber-50 rounded border border-amber-200 flex items-center gap-1">
                             ⚠️ {t('admin.config.text_editor.missing_in_lang', { lang: selectedLang.toUpperCase() })}
                        </span>
                    ) : (
                        <span className="text-xs text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded border border-emerald-200 flex items-center gap-1">
                             ✅ {t('admin.config.text_editor.configured')}
                        </span>
                    )}
                </div>
                <ConfigurableTextEditor
                  textKey={item.key}
                  label={null} 
                  initialContent={dbText ? dbText.content : ''}
                  onSave={handleUpdateText}
                />
            </div>
          );
        })}
      </div>
      
      {list.length === 0 && (
        <p className="text-center text-gray-500 py-12 bg-white rounded-lg border border-dashed border-gray-300">
            {t('admin.config.text_editor.no_results')}
        </p>
      )}
    </div>
  );
};

export default TextConfigWidget;
