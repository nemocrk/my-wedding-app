import React, { useState, useEffect } from 'react';
import { X, Smartphone, Check, Loader, AlertCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { selectBestPhone, generateSlug } from '../../utils/phonebookUtils';

const PhonebookImportModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState('groom');
  const [importedContacts, setImportedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successCount, setSuccessCount] = useState(0);
  const [isHA, setIsHA] = useState(false);

  useEffect(() => {
    // Client-side: non è possibile leggere l'header HTTP X-Requested-With.
    // In Home Assistant Companion App (Android) l'User-Agent contiene tipicamente "Home Assistant".
    const ua = navigator.userAgent || '';
    if (ua.includes('Home Assistant') || ua.includes('io.homeassistant.companion.android')) {
      setIsHA(true);
    }
  }, []);

  const handleOpenExternal = () => {
    try {
      // Costruiamo un Intent URI per Android che forza l'apertura nel browser di sistema.
      // Formato: intent://<host><path><query>#Intent;scheme=<scheme>;end
      // Esempio: intent://miosito.com/pagina?a=1#Intent;scheme=https;end
      
      // Prendiamo l'URL corrente completo
      const currentUrl = new URL(window.top?.location?.href || window.location.href);
      
      // Rimuoviamo il protocollo (es. 'https:') per metterlo dopo nell'Intent
      // L'Intent URI inizia con "intent://" seguito da host+path+query
      const urlWithoutScheme = currentUrl.toString().replace(`${currentUrl.protocol}//`, '');
      
      // Costruiamo la stringa finale
      const intentUri = `intent://${urlWithoutScheme}#Intent;scheme=${currentUrl.protocol.replace(':', '')};end`;
      
      // Navigazione verso l'URI speciale
      window.location.href = intentUri;
    } catch (e) {
      console.error("Errore apertura Intent esterno:", e);
      // Fallback classico: window.open (spesso bloccato in WebView, ma meglio di nulla)
      const url = window.top?.location?.href || window.location.href;
      window.open(url, '_system');
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!('contacts' in navigator && 'ContactsManager' in window)) {
        throw new Error('API Rubrica non supportata su questo dispositivo.');
      }

      const props = ['name', 'tel'];
      const opts = { multiple: true };

      const contacts = await window.top.navigator.contacts.select(props, opts);

      if (contacts.length > 0) {
        // Filtro e normalizzazione preliminare
        const validContacts = contacts
          .map(c => {
            const name = c.name?.[0] || 'Sconosciuto';
            const rawPhone = selectBestPhone(c.tel);
            return {
              original: c,
              name,
              phone: rawPhone,
              isValid: !!rawPhone
            };
          })
          .filter(c => c.isValid);

        setImportedContacts(validContacts);
        if (validContacts.length === 0) {
          setError('Nessun contatto valido (con numero di telefono) selezionato.');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Errore durante l'accesso alla rubrica.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (importedContacts.length === 0) return;

    setProcessing(true);
    let count = 0;
    const errors = [];

    // Recupero inviti esistenti per check duplicati (best effort client side)
    // Nota: Il backend dovrebbe comunque gestire unique constraint su slug
    let existingPhones = new Set();
    try {
      const existing = await api.fetchInvitations();
      const list = existing.results || existing;
      list.forEach(i => {
        if (i.phone_number) existingPhones.add(i.phone_number);
      });
    } catch (e) {
      console.warn('Impossibile scaricare lista esistente per check duplicati', e);
    }

    for (const contact of importedContacts) {
      // Salta duplicati
      if (existingPhones.has(contact.phone)) {
        console.log(`Skipping duplicate phone: ${contact.phone}`);
        continue;
      }

      const payload = {
        status: 'imported',
        name: contact.name,
        code: generateSlug(contact.name, contact.phone),
        origin: origin,
        phone_number: contact.phone,
        accommodation_offered: false,
        transfer_offered: false,
        guests: [{ first_name: contact.name, last_name: '', is_child: false }],
        affinities: [],
        non_affinities: []
      };

      try {
        await api.createInvitation(payload);
        count++;
        existingPhones.add(contact.phone); // Aggiorna set locale
      } catch (err) {
        console.error(`Failed to import ${contact.name}`, err);
        errors.push(`${contact.name}: ${err.message}`);
      }
    }

    setProcessing(false);
    setSuccessCount(count);

    if (count > 0) {
      // Delay chiusura per mostrare successo
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } else if (errors.length > 0) {
      setError(`Errore importazione: ${errors.length} falliti. Nessun nuovo contatto aggiunto.`);
    } else {
      setError('Nessun nuovo contatto importato (tutti duplicati o vuoti).');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{t('admin.invitations.import.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {isHA ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-center w-full">
                <div className="flex justify-center mb-2">
                  <AlertCircle size={32} className="text-amber-600" />
                </div>
                <h4 className="font-bold text-lg mb-1">{t('admin.invitations.import.warning_title')}</h4>
                <p className="text-sm">{t('admin.invitations.import.ha_warning')}</p>
              </div>

              <button
                onClick={handleOpenExternal}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                <ExternalLink size={20} className="mr-2" />
                {t('admin.invitations.import.open_external')}
              </button>
            </div>
          ) : (
            <>
              {/* Origin Toggle */}
              <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-lg flex space-x-1 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => setOrigin('groom')}
                    className={`flex-1 flex justify-center items-center py-2 rounded-md text-sm font-medium transition-all ${
                      origin === 'groom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">🤵</span> {t('admin.invitations.import.groom_side')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigin('bride')}
                    className={`flex-1 flex justify-center items-center py-2 rounded-md text-sm font-medium transition-all ${
                      origin === 'bride' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">👰</span> {t('admin.invitations.import.bride_side')}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
                  <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successCount > 0 && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center justify-center font-medium">
                  <Check size={18} className="mr-2" />
                  {t('admin.invitations.import.success_count', { count: successCount })}
                </div>
              )}

              {/* Import Action */}
              {importedContacts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-4">
                    {t('admin.invitations.import.description')}
                  </p>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <Smartphone size={20} className="mr-2" />}
                    {t('admin.invitations.import.open_phonebook')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-indigo-700 mb-1">{importedContacts.length}</span>
                    <span className="text-sm text-indigo-600">{t('admin.invitations.import.selected_contacts')}</span>
                  </div>

                  <button
                    onClick={handleConfirm}
                    disabled={processing || successCount > 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <Loader size={20} className="animate-spin mr-2" />
                        {t('admin.invitations.import.processing')}
                      </>
                    ) : successCount > 0 ? (
                      'Completato'
                    ) : (
                      'Conferma Importazione'
                    )}
                  </button>

                  <button
                    onClick={() => setImportedContacts([])}
                    disabled={processing}
                    className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    {t('admin.invitations.import.cancel_selection')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhonebookImportModal;
