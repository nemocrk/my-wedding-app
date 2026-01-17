import React, { useEffect, useState } from 'react';
import { whatsappService } from '../../services/whatsappService';
import { useWhatsAppSSE } from '../../hooks/useWhatsAppSSE';
import QueueTable from './QueueTable';
import EditMessageModal from './EditMessageModal';
import { RefreshCw, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WhatsAppQueueDashboard = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
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
    } catch (e) { alert(t('admin.whatsapp.dashboard.alert.retry_failed')); }
  };

  const handleForceSend = async (id) => {
    try {
        await whatsappService.forceSend(id);
        fetchQueue();
    } catch (e) { alert(t('admin.whatsapp.dashboard.alert.force_failed')); }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('admin.whatsapp.dashboard.confirm.delete'))) {
        try {
            await whatsappService.deleteMessage(id);
            setMessages(messages.filter(m => m.id !== id));
        } catch (e) { alert(t('admin.whatsapp.dashboard.alert.delete_failed')); }
    }
  };

  const handleEditClick = (msg) => {
    setEditingMessage(msg);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (id, data) => {
    try {
        await whatsappService.updateMessage(id, data);
        setIsEditModalOpen(false);
        setEditingMessage(null);
        fetchQueue();
    } catch (e) { alert(t('admin.whatsapp.dashboard.alert.update_failed')); }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 mt-8">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-900">{t('admin.whatsapp.dashboard.title')}</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-500">{t('admin.whatsapp.dashboard.stream_status', { status: connectionStatus })}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
            <button 
               onClick={fetchQueue} 
               className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
               title={t('admin.whatsapp.dashboard.refresh_tooltip')}
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
            <button
                onClick={handleRetry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
                {t('admin.whatsapp.dashboard.retry_failed_btn')}
            </button>
        </div>
      </div>

      <div className="p-0">
         {loading && messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('admin.whatsapp.dashboard.loading')}</div>
         ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('admin.whatsapp.dashboard.empty_queue')}</div>
         ) : (
            <QueueTable 
                messages={messages} 
                realtimeStatus={realtimeStatus} 
                onRetry={(id) => whatsappService.retryFailed().then(fetchQueue)} // Use simple retry for single item if API supports it, otherwise generic retry
                onForceSend={handleForceSend}
                onDelete={handleDelete}
                onEdit={handleEditClick}
            />
         )}
      </div>

      <EditMessageModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        message={editingMessage}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default WhatsAppQueueDashboard;
