import { fetchClient, fetchClientDelete } from './fetchClient.js';

const API_BASE_URL = 'api/admin';

export const whatsappService = {
  // Queue Management
  getQueue: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/whatsapp-queue/${queryString ? '?' + queryString : ''}`;
    return fetchClient(url);
  },

  updateMessage: async (id, data) => {
    return fetchClient(`${API_BASE_URL}/whatsapp-queue/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
  },

  deleteMessage: async (id) => {
    return fetchClientDelete(`${API_BASE_URL}/whatsapp-queue/${id}/`, {
        method: 'DELETE',
    });
  },

  retryFailed: async () => {
    return fetchClient(`${API_BASE_URL}/whatsapp-queue/retry-failed/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  forceSend: async (messageId) => {
    return fetchClient(`${API_BASE_URL}/whatsapp-queue/${messageId}/force-send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getEvents: async (queueMessageId) => {
    return fetchClient(`${API_BASE_URL}/whatsapp-events/?queue_message=${queueMessageId}`);
  },

  // Session Management
  getStatus: async (sessionType) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${sessionType}/status/`);
  },

  logout: async (sessionType) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${sessionType}/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  refresh: async (sessionType) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${sessionType}/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
