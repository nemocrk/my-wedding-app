import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { api } from '../../services/api';
import { Loader2, Save, Undo, Plus, Trash2 } from 'lucide-react';

const ConfigurableTextEditor = ({ textKey, initialContent, onSave, label }) => {
  const [content, setContent] = useState(initialContent || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Parse HTML content to extract style and text if possible, 
  // but for now we keep it simple as a text area that accepts HTML/Text
  // In a future iteration, this could be a full Rich Text Editor

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(textKey, content);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save text:', error);
      // Error handling is managed by the parent or global handler
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label || textKey}</label>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Modifica
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setContent(initialContent || '');
                setIsEditing(false);
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Annulla"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-green-600 hover:text-green-800 p-1"
              title="Salva"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="relative">
          <div className="mb-2 flex gap-2">
             <button 
               onClick={() => setShowEmojiPicker(!showEmojiPicker)}
               className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300"
             >
               😊 Emoji
             </button>
             {/* Basic HTML helpers could go here */}
             <div className="text-xs text-gray-400 self-center ml-auto">
               Supporta HTML di base (b, i, span style...)
             </div>
          </div>
          
          {showEmojiPicker && (
            <div className="absolute z-10 top-10 left-0">
              <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setShowEmojiPicker(false)}
              ></div>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] font-mono text-sm"
          />
        </div>
      ) : (
        <div 
          className="p-3 bg-gray-50 rounded border border-gray-100 min-h-[40px] prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: initialContent || '<em class="text-gray-400">Nessun contenuto configurato</em>' }}
        />
      )}
    </div>
  );
};

const TextConfigWidget = () => {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  // Pre-defined known keys to ensure they are visible even if not yet in DB
  // This helps the admin know what can be configured
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
      // Data is an array of objects { key, content, metadata, ... }
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
      // Check if text exists
      const existing = texts.find(t => t.key === key);
      
      if (existing) {
        // Update
        await api.updateConfigurableText(key, { 
          key, 
          content: newContent,
          metadata: existing.metadata 
        });
      } else {
        // Create (using update endpoint logic usually implies existence, but for robust handling we might need create)
        // Since our API service `updateConfigurableText` maps to PUT /texts/:key/, 
        // and our backend ViewSet supports update_or_create logic via PUT if configured, 
        // OR we should check if we need to call create.
        
        // Let's assume standard REST: PUT requires existence usually, but we can try generic update
        // If 404, we might need to POST.
        // However, DRF ModelViewSet update usually 404s if not found.
        
        // Strategy: Try PUT, if 404, then try create logic via specific API call if we had one.
        // But `api.createConfigurableText` is not defined in our service yet (only update).
        // Let's add creation support implicitly or handle it.
        
        // Actually, looking at `api.js` we added `updateConfigurableText` (PUT).
        // If the resource doesn't exist, PUT to a specific ID/Key is technically valid for creation if the server supports it,
        // but DRF ViewSets by default expect the object to exist for details routes.
        
        // Wait, ConfigurableTextViewSet uses `lookup_field = 'key'`.
        // If I PUT to `/api/admin/texts/new.key/`, DRF tries to `get_object()`. If fail -> 404.
        // So we need a CREATE method if it doesn't exist.
        
        // Let's check `api.js` again... we didn't add `createConfigurableText` explicitly in previous step!
        // We only added `updateConfigurableText`.
        // Let's rely on the fact that we should probably verify existence.
        
        // WORKAROUND: For now, if it's a known key but not in DB, we need to POST to list endpoint.
        // But `api.js` needs `createConfigurableText`.
        
        // Let's assume for this widget we only edit existing OR we use a special "save" that handles both.
        // Since I cannot change api.js in this transaction (already passed), I'll implement a try/catch strategy
        // or assumes the keys are pre-seeded. 
        // But the requirement says "Database Driven".
        
        // Let's assume we will implement `create` logic inside `handleUpdateText` by calling a raw fetch if needed
        // or assuming the backend handles it. 
        // Actually, the best way is to check `texts` state.
        
        const isNew = !texts.find(t => t.key === key);
        if (isNew) {
           // We need to POST to /texts/
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
      
      // Reload
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio: ' + err.message);
      throw err;
    }
  };

  const getCombinedList = () => {
    // Merge known keys with fetched texts
    const merged = [...KNOWN_KEYS];
    
    // Add any text from DB that is NOT in known keys
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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const list = getCombinedList();

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Testi Configurabili</h2>
        <input 
          type="text" 
          placeholder="Cerca testo..." 
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-2">
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
