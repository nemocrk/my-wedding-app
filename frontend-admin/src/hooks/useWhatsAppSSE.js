import { useState, useEffect } from 'react';

export const useWhatsAppSSE = () => {
  const [realtimeStatus, setRealtimeStatus] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const eventSource = new EventSource('/api/whatsapp-service/events');

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // data structure: { type: 'message_status', session, chatId, status, timestamp }
        if (data.type === 'message_status') {
          setRealtimeStatus(prev => ({
            ...prev,
            [data.chatId]: {
              status: data.status,
              timestamp: data.timestamp,
              session: data.session
            }
          }));
        }
      } catch (error) {
        console.error("SSE Parse Error", error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { realtimeStatus, connectionStatus };
};
