import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, DollarSign, FileText, Lock, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import TextConfigWidget from '../components/config/TextConfigWidget';

const Configuration = () => {
  const { t } = useTranslation();
  
  const [config, setConfig] = useState({
    price_adult_meal: '',
    price_child_meal: '',
    price_accommodation_adult: '',
    price_accommodation_child: '',
    price_transfer: '',
    letter_text: '',
    invitation_link_secret: '',
    unauthorized_message: '',
    whatsapp_rate_limit: ''
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
      setMessage({ type: 'error', text: t('admin.config.error_load') });
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
      setMessage({ type: 'success', text: t('admin.config.success_message') });
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.config.error_message') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.config.loading')}</div>;

  return (
    <div className="animate-fadeIn max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('admin.config.page_title')}</h1>
          <p className="text-sm text-gray-500">{t('admin.config.page_subtitle')}</p>
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
            <h2 className="text-lg font-semibold text-gray-800">{t('admin.sections.prices.title')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.sections.prices.adult_meal')}</label>
              <input
                type="number" step="0.01"
                name="price_adult_meal"
                value={config.price_adult_meal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.sections.prices.child_meal')}</label>
              <input
                type="number" step="0.01"
                name="price_child_meal"
                value={config.price_child_meal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.sections.prices.accommodation_adult')}</label>
              <input
                type="number" step="0.01"
                name="price_accommodation_adult"
                value={config.price_accommodation_adult}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.sections.prices.accommodation_child')}</label>
              <input
                type="number" step="0.01"
                name="price_accommodation_child"
                value={config.price_accommodation_child}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.sections.prices.transfer')}</label>
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
            <h2 className="text-lg font-semibold text-gray-800">{t('admin.sections.texts.title')}</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.sections.texts.letter_template')}
              <span className="ml-2 text-xs text-gray-500 font-normal">
                {t('admin.sections.texts.available_vars')}
              </span>
            </label>
            <textarea
              name="letter_text"
              rows={8}
              value={config.letter_text}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 font-mono text-sm"
              placeholder={t('admin.sections.texts.placeholder')}
            />
          </div>
        </div>

        {/* SECTION 3: SECURITY */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
            <Lock className="text-pink-600 mr-2" size={20}/>
            <h2 className="text-lg font-semibold text-gray-800">{t('admin.sections.security.title')}</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.sections.security.secret_key')}
                <span className="ml-2 text-xs text-red-500 font-normal">
                  {t('admin.sections.security.secret_warning')}
                </span>
              </label>
              <input
                type="text"
                name="invitation_link_secret"
                value={config.invitation_link_secret}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 font-mono bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.sections.security.unauthorized_message')}
              </label>
              <input
                type="text"
                name="unauthorized_message"
                value={config.unauthorized_message}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: WHATSAPP CONFIGURATION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
            <Phone className="text-pink-600 mr-2" size={20}/>
            <h2 className="text-lg font-semibold text-gray-800">{t('admin.sections.whatsapp.title')}</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.sections.whatsapp.rate_limit')}
              <span className="ml-2 text-xs text-gray-500 font-normal">
                {t('admin.sections.whatsapp.rate_limit_hint')}
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              name="whatsapp_rate_limit"
              value={config.whatsapp_rate_limit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              placeholder={t('admin.sections.whatsapp.placeholder_rate')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.sections.whatsapp.rate_limit_note')}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
           <button
            type="submit"
            disabled={saving}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-lg flex items-center shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={18} />
                {t('admin.config.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} />
                {t('admin.config.save_button')}
              </>
            )}
          </button>
        </div>

      </form>

      {/* SECTION 5: DYNAMIC TEXTS (CONFIGURABLE TEXT WIDGET) */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">{t('admin.config.dynamic_texts_title')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.config.dynamic_texts_subtitle')}
          </p>
        </div>
        <TextConfigWidget />
      </div>
    </div>
  );
};

export default Configuration;
