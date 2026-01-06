const API_BASE_URL = '/api/admin';

const handleResponse = async (response) => {
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = { detail: await response.text() };
  }

  if (!response.ok) {
    const errorMessage = data.detail || data.error || `Errore ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
};

export const whatsappService = {
  // Queue Management
  getQueue: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/whatsapp-queue/${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  retryFailed: async () => {
    const response = await fetch(`${API_BASE_URL}/whatsapp-queue/retry-failed/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  forceSend: async (messageId) => {
    const response = await fetch(`${API_BASE_URL}/whatsapp-queue/${messageId}/force-send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  getEvents: async (queueMessageId) => {
    const response = await fetch(`${API_BASE_URL}/whatsapp-events/?queue_message=${queueMessageId}`);
    return handleResponse(response);
  },

  // Session Management
  getStatus: async (sessionType) => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/${sessionType}/status/`);
    return handleResponse(response);
  },

  logout: async (sessionType) => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/${sessionType}/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  refresh: async (sessionType) => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/${sessionType}/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },
};
