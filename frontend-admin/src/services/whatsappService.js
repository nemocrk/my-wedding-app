import axios from 'axios';

const API_BASE_URL = '/api/admin';

export const whatsappService = {
  // Queue Management
  getQueue: async () => {
    const response = await axios.get(`${API_BASE_URL}/whatsapp-queue/`);
    return response.data;
  },

  retryFailed: async () => {
    const response = await axios.post(`${API_BASE_URL}/whatsapp-queue/retry-failed/`);
    return response.data;
  },

  forceSend: async (id) => {
    const response = await axios.post(`${API_BASE_URL}/whatsapp-queue/${id}/force-send/`);
    return response.data;
  },

  // Session Management
  getStatus: async (sessionType) => {
    const response = await axios.get(`${API_BASE_URL}/whatsapp/${sessionType}/status/`);
    return response.data;
  },

  logout: async (sessionType) => {
    const response = await axios.post(`${API_BASE_URL}/whatsapp/${sessionType}/logout/`);
    return response.data;
  },

  refresh: async (sessionType) => {
    const response = await axios.post(`${API_BASE_URL}/whatsapp/${sessionType}/refresh/`);
    return response.data;
  }
};
