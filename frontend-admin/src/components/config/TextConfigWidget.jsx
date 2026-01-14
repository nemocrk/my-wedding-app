import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';
import ConfigurableTextEditor from './ConfigurableTextEditor';
import languages from '../../config/languages.json';

const TextConfigWidget = () => {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedLang, setSelectedLang] = useState('it');
  
  // Cache per stato lingue: { 'en': { 'key1': exists? } }
  // Ottimizzazione: Al caricamento potremmo voler sapere quali lingue sono complete.
  // Per ora semplifichiamo ricaricando quando cambia la lingua.
  
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

  useEffect(() => {
    fetchData(selectedLang);
  }, [selectedLang]);

  const handleUpdateText = async (key, newContent) => {
    try {
      await api.updateConfigurableText(key, { content: newContent }, selectedLang);
      fetchData(selectedLang);
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio: ' + err.message);
    }
  };

  const getCombinedList = () => {
    const merged = [...KNOWN_KEYS];
    // Aggiungiamo chiavi extra trovate a DB che non sono nella lista hardcoded
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
  
  // Helper per determinare lo stile del bottone lingua
  // Nota: Questo richiederebbe di sapere se PER QUELLA LINGUA esistono testi.
  // Attualmente l'API restituisce solo i testi della lingua selezionata.
  // Per fare l'highlight "rosso" se mancano configurazioni, dovremmo avere un endpoint di "status" o caricare tutto.
  // Implementazione base: Rosso se non è la lingua di default (segnalazione visiva che si sta editando traduzione).
  const getLangButtonStyle = (lang) => {
      const isSelected = selectedLang === lang;
      const baseClass = "px-3 py-1 rounded-md text-sm font-medium transition-colors border";
      
      if (isSelected) {
          return `${baseClass} bg-indigo-600 text-white border-indigo-600`;
      }
      return `${baseClass} bg-white text-gray-600 border-gray-300 hover:bg-gray-50`;
  };

  if (loading && texts.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const list = getCombinedList();

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Testi Configurabili</h2>
            <p className="text-sm text-gray-500 mt-1">Personalizza i contenuti statici per lingua.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            {languages.map(lang => (
                <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={getLangButtonStyle(lang)}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
      </div>

      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Cerca testo..." 
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {list.map(item => {
          const dbText = texts.find(t => t.key === item.key);
          const isConfigured = !!dbText;
          
          return (
            <div key={item.key} className={`border rounded-lg p-4 bg-white ${!isConfigured ? 'border-l-4 border-l-orange-400' : ''}`}>
                <div className="mb-2 flex justify-between">
                    <span className="font-semibold text-gray-700">{item.label}</span>
                    {!isConfigured && <span className="text-xs text-orange-500 font-bold px-2 py-0.5 bg-orange-50 rounded">Non configurato in {selectedLang.toUpperCase()}</span>}
                </div>
                <ConfigurableTextEditor
                  textKey={item.key}
                  label={null} // Label già renderizzata sopra
                  initialContent={dbText ? dbText.content : ''}
                  onSave={handleUpdateText}
                />
            </div>
          );
        })}
      </div>
      
      {list.length === 0 && (
        <p className="text-center text-gray-500 py-8">Nessun testo trovato.</p>
      )}
    </div>
  );
};

export default TextConfigWidget;
