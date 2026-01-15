import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Loader2, Globe, AlertTriangle } from 'lucide-react';
import ConfigurableTextEditor from './ConfigurableTextEditor';

const TextConfigWidget = () => {
  const [texts, setTexts] = useState([]);
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

  useEffect(() => {
    // 1. Carica le lingue disponibili
    const loadLanguages = async () => {
        try {
            const langs = await api.fetchLanguages();
            setAvailableLanguages(langs);
            
            // Se la lingua selezionata non è nella lista (salvo default 'it'), resetta
            if (langs.length > 0 && !langs.find(l => l.code === selectedLang)) {
                // Mantieni 'it' se esiste, altrimenti il primo
                if (langs.find(l => l.code === 'it')) setSelectedLang('it');
                else setSelectedLang(langs[0].code);
            }
        } catch (err) {
            console.error("Errore caricamento lingue", err);
            // Fallback minimo
            setAvailableLanguages([
                { code: 'it', label: 'Italiano', flag: '🇮🇹' },
                { code: 'en', label: 'English', flag: '🇬🇧' }
            ]);
        }
    };
    loadLanguages();
  }, []); // Run only once on mount

  const fetchData = async (lang) => {
    setLoading(true);
    try {
      const data = await api.fetchConfigurableTexts(lang);
      setTexts(data);
    } catch (err) {
      setError('Errore nel caricamento dei testi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Ricarica testi quando cambia la lingua selezionata
  useEffect(() => {
    fetchData(selectedLang);
  }, [selectedLang]);

  // Helper per controllare se l'HTML è "vuoto" (es. "<p></p>" o "<br>")
  const isContentEmpty = (html) => {
      if (!html) return true;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return !doc.body.textContent.trim() && !doc.body.querySelector('img');
  };

  const handleUpdateText = async (key, newContent) => {
    try {
      if (isContentEmpty(newContent)) {
          // SE VUOTO -> CANCELLA (DELETE)
          // Se esiste già nel DB, lo rimuoviamo. Se non esiste, non facciamo nulla.
          const existing = texts.find(t => t.key === key);
          if (existing) {
              await api.deleteConfigurableText(key, selectedLang);
          }
      } else {
          // SE PIENO -> AGGIORNA (PUT UPSERT)
          await api.updateConfigurableText(key, { content: newContent }, selectedLang);
      }
      
      // Refresh list
      fetchData(selectedLang);
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio: ' + err.message);
    }
  };

  const handleLanguageChange = (newLang) => {
      if (newLang === selectedLang) return;

      // Check se ci sono testi non configurati nella lingua corrente
      const missingKeys = KNOWN_KEYS.filter(k => !texts.find(t => t.key === k.key));
      
      if (missingKeys.length > 0) {
          const confirmSwitch = window.confirm(
              `ATTENZIONE: Ci sono ${missingKeys.length} testi NON configurati in ${selectedLang.toUpperCase()}.\n\n` +
              `Testi mancanti:\n- ${missingKeys.map(k => k.label).join('\n- ')}\n\n` +
              `Vuoi cambiare lingua comunque?`
          );
          if (!confirmSwitch) return;
      }
      
      setSelectedLang(newLang);
  };

  const getCombinedList = () => {
    const merged = [...KNOWN_KEYS];
    texts.forEach(dbText => {
      if (!merged.find(k => k.key === dbText.key)) {
        merged.push({ key: dbText.key, label: dbText.key });
      }
    });

    return merged.filter(item => 
      item.label.toLowerCase().includes(filter.toLowerCase()) || 
      item.key.toLowerCase().includes(filter.toLowerCase())
    );
  };
  
  const getLangButtonStyle = (langCode) => {
      const isSelected = selectedLang === langCode;
      const baseClass = "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border shadow-sm";
      
      if (isSelected) {
          return `${baseClass} bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200`;
      }
      return `${baseClass} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300`;
  };

  if (loading && texts.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const list = getCombinedList();

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
        <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Globe size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Localization</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Testi Configurabili</h2>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap bg-gray-100 p-1.5 rounded-full">
            {availableLanguages.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={getLangButtonStyle(lang.code)}
                >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span className="uppercase">{lang.code}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Cerca testo (chiave o etichetta)..." 
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {list.map(item => {
          const dbText = texts.find(t => t.key === item.key);
          const isConfigured = !!dbText;
          
          return (
            <div key={item.key} className={`border rounded-lg p-4 bg-white shadow-sm transition-all hover:shadow-md ${!isConfigured ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-green-400'}`}>
                <div className="mb-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-700 flex items-center gap-2">
                        {item.label}
                        <code className="text-xs font-normal bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.key}</code>
                    </span>
                    {!isConfigured ? (
                        <span className="text-xs text-orange-600 font-bold px-2 py-1 bg-orange-50 rounded border border-orange-100 flex items-center gap-1">
                             ⚠️ Manca in {selectedLang.toUpperCase()}
                        </span>
                    ) : (
                        <span className="text-xs text-green-600 font-bold px-2 py-1 bg-green-50 rounded border border-green-100 flex items-center gap-1">
                             ✅ Configurato
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
            Nessun testo trovato con questo filtro.
        </p>
      )}
    </div>
  );
};

export default TextConfigWidget;
