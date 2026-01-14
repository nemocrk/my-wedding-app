import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';
import ConfigurableTextEditor from './ConfigurableTextEditor';

const TextConfigWidget = () => {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.fetchConfigurableTexts();
      setTexts(data);
    } catch (err) {
      setError('Errore nel caricamento dei testi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateText = async (key, newContent) => {
    try {
      const existing = texts.find(t => t.key === key);
      
      if (existing) {
        await api.updateConfigurableText(key, { 
          key, 
          content: newContent,
          metadata: existing.metadata 
        });
      } else {
        const isNew = !texts.find(t => t.key === key);
        if (isNew) {
           await fetch('/api/admin/texts/', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ key, content: newContent })
           }).then(async res => {
             if (!res.ok) throw new Error(await res.text());
             return res.json();
           });
        } else {
           await api.updateConfigurableText(key, { content: newContent });
        }
      }
      
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio: ' + err.message);
      throw err;
    }
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

  if (loading) return <div className="flex justify-center p-8" data-testid="loader2"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const list = getCombinedList();

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Testi Configurabili</h2>
        <input 
          type="text" 
          placeholder="Cerca testo..." 
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          data-testid="search-input"
        />
      </div>

      <div className="space-y-4">
        {list.map(item => {
          const dbText = texts.find(t => t.key === item.key);
          return (
            <ConfigurableTextEditor
              key={item.key}
              textKey={item.key}
              label={item.label}
              initialContent={dbText ? dbText.content : ''}
              onSave={handleUpdateText}
            />
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
