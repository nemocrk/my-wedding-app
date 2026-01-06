import React, { useEffect, useState } from 'react';
import { whatsappService } from '../../services/whatsappService';
import { useWhatsAppSSE } from '../../hooks/useWhatsAppSSE';
import QueueTable from './QueueTable';
import { RefreshCw, Activity } from 'lucide-react';

const WhatsAppQueueDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { realtimeStatus, connectionStatus } = useWhatsAppSSE();

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getQueue();
      setMessages(data.results || data);
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    try {
        await whatsappService.retryFailed();
        fetchQueue();
    } catch (e) { alert("Retry failed"); }
  };

  const handleForceSend = async (id) => {
    try {
        await whatsappService.forceSend(id);
        fetchQueue();
    } catch (e) { alert("Force send failed"); }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 mt-8">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Coda di Invio Messaggi</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-500">Realtime Stream: {connectionStatus}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
            <button 
               onClick={fetchQueue} 
               className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
               title="Aggiorna lista"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
            <button
                onClick={handleRetry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
                Riprova Falliti
            </button>
        </div>
      </div>

      <div className="p-0">
         {loading && messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Caricamento coda...</div>
         ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nessun messaggio in coda.</div>
         ) : (
            <QueueTable 
                messages={messages} 
                realtimeStatus={realtimeStatus} 
                onRetry={handleRetry}
                onForceSend={handleForceSend}
            />
         )}
      </div>
    </div>
  );
};

export default WhatsAppQueueDashboard;
