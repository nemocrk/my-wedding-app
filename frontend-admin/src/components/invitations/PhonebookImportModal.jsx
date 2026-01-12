import React, { useState } from 'react';
import { X, Smartphone, Check, Loader, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { normalizePhone, selectBestPhone, generateSlug } from '../../utils/phonebookUtils';

const PhonebookImportModal = ({ onClose, onSuccess }) => {
  const [origin, setOrigin] = useState('groom');
  const [importedContacts, setImportedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successCount, setSuccessCount] = useState(0);

  const handleImport = async (contacts) => {
    setLoading(true);
    setError(null);
    try {
      if (!('contacts' in navigator && 'ContactsManager' in window)) {
        throw new Error('API Rubrica non supportata su questo dispositivo.');
      }

      const props = ['name', 'tel'];
      const opts = { multiple: true };

      const isIframe = window.self !== window.top;

      if(isIframe){
        const parentWin = window.parent;
        if (!parentWin._ha_contacts_bridge_installed) {
          parentWin.addEventListener('message', async (event) => {
            // Intercetta solo il messaggio specifico
            if (event.data?.type === 'apri-rubrica') {
                const { props, opts } = event.data;
                
                // Controlla il supporto API nel contesto Top-Level
                if (!('contacts' in parentWin.navigator && 'ContactsManager' in parentWin)) {
                    console.error("API Contatti non supportata su questo dispositivo/browser.");
                    replyToChild(event.source, { error: 'API non supportata' });
                    return;
                }

                try {
                    // Esegue l'API Contacts nel contesto del PADRE
                    // Nota: Richiede che il messaggio sia stato scatenato da un gesto utente (click)
                    const contacts = await parentWin.navigator.contacts.select(props, opts);
                    
                    // Invia i risultati al figlio
                    replyToChild(event.source, { data: contacts });
                    
                } catch (err) {
                    console.error("Errore selezione contatti:", err);
                    replyToChild(event.source, { error: err.toString() });
                }
            }
          });
          // Helper per rispondere
          function replyToChild(sourceWindow, payload) {
              if (sourceWindow) {
                  sourceWindow.postMessage({
                      type: 'importa-contatti',
                      ...payload
                  }, '*');
              }
          }

          // Marca come installato per evitare duplicazioni future
          parentWin._ha_contacts_bridge_installed = true;
          console.log("Bridge Rubrica: Listener installato con successo sul Padre.");
        }
        window.addEventListener('message', (event) => {
          if (event.data?.type === 'importa-contatti') {
              if (event.data.error) {
                  console.error("Bridge Rubrica Error:", event.data.error);
                  // Gestisci l'errore UI qui (es. alert o toast)
              } else {
                  console.log("Bridge Rubrica Success:", event.data.data);
                  
                  // --- PUNTO DI INTEGRAZIONE ---
                  // Qui puoi chiamare la tua logica per usare i dati
                  if (typeof window.onContactsReceived === 'function') {
                      handleImport(event.data.data);
                  }
              }
          }
        });
        parentWin.postMessage({type: 'apri-rubrica',props: props,opts: opts}, '*');
        return;
      }

      if(!contacts)
        contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        // Filtro e normalizzazione preliminare
        const validContacts = contacts.map(c => {
          const name = c.name?.[0] || 'Sconosciuto';
          const rawPhone = selectBestPhone(c.tel);
          return {
            original: c,
            name,
            phone: rawPhone,
            isValid: !!rawPhone
          };
        }).filter(c => c.isValid);

        setImportedContacts(validContacts);
        if (validContacts.length === 0) {
          setError('Nessun contatto valido (con numero di telefono) selezionato.');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Errore durante l\'accesso alla rubrica.');
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
      console.warn("Impossibile scaricare lista esistente per check duplicati", e);
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
          <h3 className="text-lg font-bold text-gray-800">Importa da Rubrica</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Origin Toggle */}
          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setOrigin('groom')}
                className={`flex-1 flex justify-center items-center py-2 rounded-md text-sm font-medium transition-all ${
                  origin === 'groom' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">🤵</span> Lato Sposo
              </button>
              <button
                type="button"
                onClick={() => setOrigin('bride')}
                className={`flex-1 flex justify-center items-center py-2 rounded-md text-sm font-medium transition-all ${
                  origin === 'bride' 
                    ? 'bg-white text-pink-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">👰</span> Lato Sposa
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
              {successCount} contatti importati con successo!
            </div>
          )}

          {/* Import Action */}
          {importedContacts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-4">
                Seleziona i contatti dal tuo telefono per aggiungerli rapidamente alla lista inviti.
              </p>
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : <Smartphone size={20} className="mr-2" />}
                Apri Rubrica
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl text-center">
                <span className="block text-2xl font-bold text-indigo-700 mb-1">{importedContacts.length}</span>
                <span className="text-sm text-indigo-600">Contatti Selezionati</span>
              </div>
              
              <button
                onClick={handleConfirm}
                disabled={processing || successCount > 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium flex items-center justify-center transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader size={20} className="animate-spin mr-2" />
                    Elaborazione...
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
                Annulla selezione
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhonebookImportModal;
