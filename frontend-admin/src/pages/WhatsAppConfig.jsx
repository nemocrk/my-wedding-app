import React, { useState, useEffect } from 'react';
import { RefreshCw, QrCode, CheckCircle, AlertTriangle, Phone, Loader, LogOut, Send, User, MessageSquare, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { api } from '../services/api';
import WhatsAppQueueDashboard from '../components/whatsapp/WhatsAppQueueDashboard'; // Import Dashboard

const WhatsAppConfig = () => {
  const [activeTab, setActiveTab] = useState('connection'); // connection | templates
  const [groomStatus, setGroomStatus] = useState({ state: 'loading' });
  const [brideStatus, setBrideStatus] = useState({ state: 'loading' });
  const [activeModal, setActiveModal] = useState(null); 
  const [qrCodeData, setQrCodeData] = useState({});
  const [isPolling, setIsPolling] = useState(false);
  const [testLoading, setTestLoading] = useState(null); 
  const [logoutLoading, setLogoutLoading] = useState(null); // 'groom' or 'bride'

  // --- TEMPLATES STATE ---
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // null = create mode
  const [formData, setFormData] = useState({
      name: '',
      condition: 'manual',
      trigger_status: '',
      content: '',
      is_active: true
  });

  // Aggiunge una nuova coppia chiave-valore
  const addEntry = (set, key, value) => {
    set(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Aggiorna un valore esistente (in React 'Add' e 'Update' usano la stessa logica)
  const updateEntry = (set, key, newValue) => {
    set(prev => ({
      ...prev,
      [key]: newValue
    }));
  };

  // Rimuove una chiave specifica usando il destructuring (metodo standard consigliato)
  const removeEntry = (set, keyToRemove) => {
    set(prev => {
      const { [keyToRemove]: _, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
        fetchTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const fetchStatuses = async () => {
    try {
      const [groom, bride] = await Promise.all([
        api.getWhatsAppStatus('groom').catch(() => ({ state: 'error' })),
        api.getWhatsAppStatus('bride').catch(() => ({ state: 'error' }))
      ]);
      setGroomStatus(groom);
      setBrideStatus(bride);
    } catch (error) {
      console.error('Error fetching statuses', error);
    }
  };
  
  const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
          const data = await api.fetchWhatsAppTemplates();
          setTemplates(data.results || data);
      } catch (error) {
          console.error("Failed to load templates", error);
      } finally {
          setTemplatesLoading(false);
      }
  };

  let pollingInterval;
  const startPolling = (sessionType) => {
    if (isPolling) return;
    setIsPolling(true);
    
    pollingInterval = setInterval(async () => {
      try {
        const data = await api.getWhatsAppStatus(sessionType);
        
        if (data.state === 'connected') {
          stopPolling();
          closeModal(sessionType);
          fetchStatuses();
        } else if (data.qr_code && !qrCodeData[sessionType]) {
            addEntry(setQrCodeData, sessionType, data.qr_code);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    setIsPolling(false);
  };

  const handleRefresh = async (sessionType) => {
    try {
      removeEntry(setQrCodeData, sessionType);
      setActiveModal(sessionType);
      
      const data = await api.refreshWhatsAppSession(sessionType);

      if (data.state === 'waiting_qr' || data.state === 'connecting') {
        if (data.qr_code) addEntry(setQrCodeData, sessionType, data.qr_code);
        startPolling(sessionType);
      } else if (data.state === 'connected') {
        closeModal(sessionType);
        fetchStatuses();
      } else {
        closeModal(sessionType);
        alert(`Stato imprevisto: ${data.state}`);
        fetchStatuses();
      }
    } catch (error) {
      closeModal(sessionType);
      alert('Errore durante il refresh: ' + (error.message));
    }
  };

  const handleLogout = async (sessionType) => {
      if(!window.confirm('Sei sicuro di voler disconnettere questa sessione?')) return;
      
      setLogoutLoading(sessionType);
      try {
          await api.logoutWhatsAppSession(sessionType);
          fetchStatuses(); 
      } catch (error) {
          alert('Errore durante il logout: ' + error.message);
      } finally {
          setLogoutLoading(null);
      }
  };

  const handleTestMessage = async (sessionType) => {
      setTestLoading(sessionType);
      try {
          const res = await api.sendWhatsAppTest(sessionType);
          alert(`Messaggio inviato con successo a ${res.recipient}! Controlla il telefono.`);
      } catch (error) {
          alert('Errore invio messaggio test: ' + error.message);
      } finally {
          setTestLoading(null);
      }
  };

  const closeModal = (sessionType) => {
    setActiveModal(null);
    removeEntry(setQrCodeData, sessionType);
    stopPolling();
  };

  // --- TEMPLATE HANDLERS ---
  const handleOpenTemplateModal = (template = null) => {
      if (template) {
          setEditingTemplate(template);
          setFormData({
              name: template.name,
              condition: template.condition,
              trigger_status: template.trigger_status || '',
              content: template.content,
              is_active: template.is_active
          });
      } else {
          setEditingTemplate(null);
          setFormData({
              name: '',
              condition: 'manual',
              trigger_status: '',
              content: '',
              is_active: true
          });
      }
      setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
      e.preventDefault();
      try {
          if (editingTemplate) {
              await api.updateWhatsAppTemplate(editingTemplate.id, formData);
          } else {
              await api.createWhatsAppTemplate(formData);
          }
          setIsTemplateModalOpen(false);
          fetchTemplates();
      } catch (error) {
          console.error("Error saving template", error);
      }
  };

  const handleDeleteTemplate = async (id) => {
      if(!window.confirm("Sei sicuro di voler eliminare questo template?")) return;
      try {
          await api.deleteWhatsAppTemplate(id);
          fetchTemplates();
      } catch (error) {
          console.error("Error deleting template", error);
      }
  };
  
  const insertPlaceholder = (placeholder) => {
      setFormData(prev => ({
          ...prev,
          content: prev.content + placeholder
      }));
  };

  // --- UI COMPONENTS ---

  const StatusCard = ({ title, status, type }) => {
    const isConnected = status.state === 'connected';
    const isError = status.state === 'error';
    const isLoading = status.state === 'loading';
    const profile = status.profile;

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-500" />
            {title}
          </h3>
          {isLoading ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Caricamento...
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 gap-1">
              <CheckCircle className="w-3 h-3" /> Connesso
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 gap-1">
              <AlertTriangle className="w-3 h-3" /> {isError ? 'Errore' : 'Disconnesso'}
            </span>
          )}
        </div>

        {isConnected && profile && (
            <div className="mb-6 p-3 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex items-center gap-3">
                    {profile.picture ? (
                        <img 
                            src={profile.picture} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full border border-blue-200 object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="p-2 bg-blue-100 rounded-full">
                            <User className="w-5 h-5 text-blue-700" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-bold text-gray-900">{profile.pushName || profile.name || 'Utente WhatsApp'}</p>
                        <p className="text-xs text-gray-600 font-mono">{profile.id?.split('@')[0] || profile.wid?.user}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="text-sm text-gray-600 mb-6">
          {!isConnected && (status.error_message ? (
             <p className="text-red-500">{status.error_message}</p>
          ) : (
             <p>Ultimo controllo: {status.last_check ? new Date(status.last_check).toLocaleTimeString() : 'Mai'}</p>
          ))}
        </div>

        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <button
                onClick={() => handleRefresh(type)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    isConnected 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                >
                {isConnected ? <RefreshCw className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                {isConnected ? 'Verifica Stato' : 'Collega Account'}
                </button>
                
                {isConnected && (
                    <button
                        onClick={() => handleLogout(type)}
                        disabled={logoutLoading === type}
                        className="flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Disconnetti Sessione"
                    >
                        {logoutLoading === type ? <Loader className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {isConnected && (
                <button
                    onClick={() => handleTestMessage(type)}
                    disabled={testLoading === type}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                    {testLoading === type ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Invia Messaggio di Test
                </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* HEADER & TABS */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrazione WhatsApp</h1>
        <div className="flex border-b border-gray-200">
            <button
                onClick={() => setActiveTab('connection')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'connection' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Connessione & Stato
            </button>
            <button
                onClick={() => setActiveTab('templates')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'templates' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Template Messaggi
            </button>
        </div>
      </div>
      
      {/* CONTENT: CONNECTION TAB */}
      {activeTab === 'connection' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatusCard title="Account Sposo" status={groomStatus} type="groom" />
                <StatusCard title="Account Sposa" status={brideStatus} type="bride" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Note Importanti Anti-Ban</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Non inviare mai messaggi a contatti che non hanno scritto per primi.</li>
                <li>Il sistema simula la digitazione umana (typing...) prima di ogni invio.</li>
                <li>È attivo un limite di sicurezza di 10 messaggi/ora per sessione.</li>
                </ul>
            </div>

            {/* DASHBOARD CODA MESSAGGI */}
            <WhatsAppQueueDashboard />
          </div>
      )}

      {/* CONTENT: TEMPLATES TAB */}
      {activeTab === 'templates' && (
          <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Gestione Template Messaggi</h2>
                  <button 
                    onClick={() => handleOpenTemplateModal()}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                      <Plus className="w-4 h-4 mr-2" />
                      Nuovo Template
                  </button>
              </div>

              {templatesLoading ? (
                  <div className="flex justify-center py-12">
                      <Loader className="w-8 h-8 text-green-600 animate-spin" />
                  </div>
              ) : templates.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Nessun template configurato.</p>
                      <button onClick={() => handleOpenTemplateModal()} className="text-green-600 font-medium hover:underline mt-2">Creane uno ora</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {templates.map(tpl => (
                          <div key={tpl.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-gray-900">{tpl.name}</h3>
                                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                          tpl.condition === 'status_change' 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : 'bg-blue-100 text-blue-700'
                                      }`}>
                                          {tpl.condition === 'status_change' ? 'Automatico' : 'Manuale (Spot)'}
                                      </span>
                                      {!tpl.is_active && (
                                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                              Inattivo
                                          </span>
                                      )}
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => handleOpenTemplateModal(tpl)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit2 size={16}/></button>
                                      <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                              
                              {tpl.condition === 'status_change' && (
                                  <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 inline-block px-2 py-1 rounded">
                                      Trigger: Cambio stato in <strong>{tpl.trigger_status}</strong>
                                  </div>
                              )}
                              
                              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 font-mono whitespace-pre-wrap border border-gray-100">
                                  {tpl.content}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* MODAL: QR CODE */}
      {activeModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 animate-fadeIn">
          <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Scansiona QR Code ({activeModal === 'groom' ? 'Sposo' : 'Sposa'})
              </h3>
              
              <div className="flex justify-center mb-6 min-h-[256px]">
                {qrCodeData[activeModal] ? (
                  <img src={qrCodeData[activeModal]} alt="WhatsApp QR Code" className="border-4 border-gray-200 rounded-lg animate-scaleIn" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4">
                     <Loader className="w-12 h-12 animate-spin text-indigo-500" />
                     <p className="text-sm text-gray-500">Generazione QR Code in corso...</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Apri WhatsApp sul telefono &gt; Impostazioni &gt; Dispositivi collegati &gt; Collega un dispositivo
              </p>

              <button
                onClick={() => closeModal(activeModal)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE/EDIT TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 animate-fadeIn">
             <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-900">
                         {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
                     </h3>
                     <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                         <X size={24} />
                     </button>
                 </div>

                 <form onSubmit={handleSaveTemplate} className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Nome Template</label>
                             <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                placeholder="es. Conferma Ricezione"
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                             <select 
                                value={formData.condition}
                                onChange={(e) => setFormData({...formData, condition: e.target.value})}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                             >
                                 <option value="manual">Manuale (Spot)</option>
                                 <option value="status_change">Automatico (Cambio Stato)</option>
                             </select>
                         </div>
                     </div>

                     {formData.condition === 'status_change' && (
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Attiva quando lo stato diventa:</label>
                             <select 
                                value={formData.trigger_status}
                                onChange={(e) => setFormData({...formData, trigger_status: e.target.value})}
                                required={formData.condition === 'status_change'}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                             >
                                 <option value="">-- Seleziona Stato --</option>
                                 <option value="sent">Inviato (Sent)</option>
                                 <option value="read">Letto (Read)</option>
                                 <option value="confirmed">Accettato (Confirmed)</option>
                                 <option value="declined">Declinato (Declined)</option>
                             </select>
                         </div>
                     )}

                     <div>
                         <div className="flex justify-between items-end mb-1">
                             <label className="block text-sm font-medium text-gray-700">Contenuto Messaggio</label>
                             <div className="space-x-2 text-xs">
                                 <button type="button" onClick={() => insertPlaceholder('{name}')} className="text-blue-600 hover:underline bg-blue-50 px-1 rounded">Nome</button>
                                 <button type="button" onClick={() => insertPlaceholder('{link}')} className="text-blue-600 hover:underline bg-blue-50 px-1 rounded">Link</button>
                                 <button type="button" onClick={() => insertPlaceholder('{code}')} className="text-blue-600 hover:underline bg-blue-50 px-1 rounded">Codice</button>
                             </div>
                         </div>
                         <textarea 
                            required
                            rows={6}
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                            placeholder="Ciao {name}, ecco il tuo invito..."
                         />
                     </div>

                     <div className="flex items-center">
                         <input 
                            id="is_active"
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                         />
                         <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                             Template Attivo
                         </label>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                         <button 
                            type="button" 
                            onClick={() => setIsTemplateModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                         >
                             Annulla
                         </button>
                         <button 
                            type="submit" 
                            className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 flex items-center"
                         >
                             <Save size={16} className="mr-2" />
                             Salva Template
                         </button>
                     </div>
                 </form>
             </div>
        </div>
      )}

    </div>
  );
};

export default WhatsAppConfig;
