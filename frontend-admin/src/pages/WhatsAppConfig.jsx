import React, { useState, useEffect } from 'react';
import { RefreshCw, QrCode, CheckCircle, AlertTriangle, Phone, Loader, LogOut, Send, User } from 'lucide-react';
import { api } from '../services/api';
import WhatsAppQueueDashboard from '../components/whatsapp/WhatsAppQueueDashboard'; // Import Dashboard

const WhatsAppConfig = () => {
  const [groomStatus, setGroomStatus] = useState({ state: 'loading' });
  const [brideStatus, setBrideStatus] = useState({ state: 'loading' });
  const [activeModal, setActiveModal] = useState(null); 
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [testLoading, setTestLoading] = useState(null); 
  const [logoutLoading, setLogoutLoading] = useState(null); // 'groom' or 'bride'

  useEffect(() => {
    fetchStatuses();
  }, []);

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

  let pollingInterval;
  const startPolling = (sessionType) => {
    if (isPolling) return;
    setIsPolling(true);
    
    pollingInterval = setInterval(async () => {
      try {
        const data = await api.getWhatsAppStatus(sessionType);
        
        if (data.state === 'connected') {
          stopPolling();
          closeModal();
          fetchStatuses();
        } else if (data.qr_code && !qrCodeData) {
            setQrCodeData(data.qr_code);
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
      setQrCodeData(null);
      setActiveModal(sessionType);
      
      const data = await api.refreshWhatsAppSession(sessionType);

      if (data.state === 'waiting_qr' || data.state === 'connecting') {
        if (data.qr_code) setQrCodeData(data.qr_code);
        startPolling(sessionType);
      } else if (data.state === 'connected') {
        closeModal();
        fetchStatuses();
      } else {
        closeModal();
        alert(`Stato imprevisto: ${data.state}`);
        fetchStatuses();
      }
    } catch (error) {
      closeModal();
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

  const closeModal = () => {
    setActiveModal(null);
    setQrCodeData(null);
    stopPolling();
  };

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
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestione Integrazione WhatsApp</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatusCard title="Account Sposo" status={groomStatus} type="groom" />
            <StatusCard title="Account Sposa" status={brideStatus} type="bride" />
        </div>
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

      {activeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Scansiona QR Code ({activeModal === 'groom' ? 'Sposo' : 'Sposa'})
              </h3>
              
              <div className="flex justify-center mb-6 min-h-[256px]">
                {qrCodeData ? (
                  <img src={qrCodeData} alt="WhatsApp QR Code" className="border-4 border-gray-200 rounded-lg animate-fade-in" />
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
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConfig;
