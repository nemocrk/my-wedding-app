import React, { useEffect, useState } from 'react';
import { whatsappService } from '../services/whatsappService';
import { useWhatsAppSSE } from '../hooks/useWhatsAppSSE';
import QueueTable from '../components/whatsapp/QueueTable';

const WhatsAppDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { realtimeStatus, connectionStatus } = useWhatsAppSSE();

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getQueue();
      setMessages(data.results || data); // Handle pagination or list
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Optional: Polling backup every 30s to sync DB status
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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">WhatsApp Dashboard</h1>
        
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
             }`}>
               SSE: {connectionStatus}
             </span>
             <button 
               onClick={fetchQueue} 
               className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
             >
               Refresh
             </button>
          </div>
          
          <button
             onClick={handleRetry}
             className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
             Retry Failed
          </button>
        </div>

        {loading && messages.length === 0 ? (
           <p>Loading...</p>
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

export default WhatsAppDashboard;
