import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, DollarSign, FileText } from 'lucide-react';
import { api } from '../services/api';

const Configuration = () => {
  const [config, setConfig] = useState({
    price_adult_meal: '',
    price_child_meal: '',
    price_accommodation_adult: '',
    price_accommodation_child: '',
    price_transfer: '',
    letter_text: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      setConfig(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore caricamento configurazione.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.updateConfig(config);
      setMessage({ type: 'success', text: 'Configurazione salvata con successo!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore durante il salvataggio.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento configurazione...</div>;

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configurazione</h1>
          <p className="text-sm text-gray-500">Gestisci prezzi e testi globali dell'applicazione</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: PRICES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
            <DollarSign className="text-pink-600 mr-2" size={20}/>
            <h2 className="text-lg font-semibold text-gray-800">Gestione Costi Unitari</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pranzo Adulti (€)</label>
              <input
                type="number" step="0.01"
                name="price_adult_meal"
                value={config.price_adult_meal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pranzo Bambini (€)</label>
              <input
                type="number" step="0.01"
                name="price_child_meal"
                value={config.price_child_meal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alloggio Adulti (€)</label>
              <input
                type="number" step="0.01"
                name="price_accommodation_adult"
                value={config.price_accommodation_adult}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alloggio Bambini (€)</label>
              <input
                type="number" step="0.01"
                name="price_accommodation_child"
                value={config.price_accommodation_child}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer per persona (€)</label>
              <input
                type="number" step="0.01"
                name="price_transfer"
                value={config.price_transfer}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: TEXTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
            <FileText className="text-pink-600 mr-2" size={20}/>
            <h2 className="text-lg font-semibold text-gray-800">Testi e Comunicazioni</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Lettera di Benvenuto
              <span className="ml-2 text-xs text-gray-500 font-normal">
                Disponibili: {'{guest_names}, {family_name}, {code}'}
              </span>
            </label>
            <textarea
              name="letter_text"
              rows={8}
              value={config.letter_text}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 font-mono text-sm"
              placeholder="Inserisci qui il testo..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
           <button
            type="submit"
            disabled={saving}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-lg flex items-center shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={18} />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} />
                Salva Modifiche
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default Configuration;
