const API_BASE_URL = '/api/admin';

const triggerGlobalError = (error) => {
  const event = new CustomEvent('api-error', { detail: error });
  window.dispatchEvent(event);
};

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
    const error = new Error(errorMessage);
    error.status = response.status;
    triggerGlobalError(error);
    throw error;
  }
  
  return data;
};

// Wrapper per fetch
const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    const error = new Error("Impossibile contattare il server. Controlla la tua connessione.");
    triggerGlobalError(error);
    throw error;
  }
};

export const api = {
  // --- INVITATIONS ---
  fetchInvitations: async () => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/`);
    return handleResponse(response);
  },

  getInvitation: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/`);
    return handleResponse(response);
  },

  createInvitation: async (data) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateInvitation: async (id, data) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  markInvitationAsSent: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/mark-as-sent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body for action
    });
    return handleResponse(response);
  },

  deleteInvitation: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE',
    });
    if (response.status === 204) return true;
    return handleResponse(response);
  },
  
  generateInvitationLink: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/generate_link/`);
    return handleResponse(response);
  },

  // --- ANALYTICS ---
  getInvitationHeatmaps: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/heatmaps/`);
    return handleResponse(response);
  },

  getInvitationInteractions: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/interactions/`);
    return handleResponse(response);
  },

  // --- DASHBOARD ---
  getDashboardStats: async () => {
    const response = await safeFetch(`${API_BASE_URL}/dashboard/stats/`);
    return handleResponse(response);
  },

  // --- CONFIG ---
  getConfig: async () => {
    const response = await safeFetch(`${API_BASE_URL}/config/`);
    return handleResponse(response);
  },

  updateConfig: async (data) => {
    const response = await safeFetch(`${API_BASE_URL}/config/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // --- ACCOMMODATIONS ---
  fetchAccommodations: async () => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/`);
    return handleResponse(response);
  },

  createAccommodation: async (data) => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateAccommodation: async (id, data) => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/${id}/`, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  deleteAccommodation: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/${id}/`, { method: 'DELETE' });
    if (response.status === 204) return true;
    return handleResponse(response);
  },

  triggerAutoAssign: async (resetPrevious = false, strategy = 'SIMULATION') => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/auto-assign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        reset_previous: resetPrevious,
        strategy: strategy 
      })
    });
    return handleResponse(response);
  },

  fetchUnassignedInvitations: async () => {
      const response = await safeFetch(`${API_BASE_URL}/accommodations/unassigned-invitations/`);
      return handleResponse(response);
  },

  // --- WHATSAPP INTEGRATION ---
  getWhatsAppStatus: async (type) => {
    const response = await safeFetch(`${API_BASE_URL}/whatsapp/${type}/status/`);
    return handleResponse(response);
  },

  refreshWhatsAppSession: async (type) => {
    const response = await safeFetch(`${API_BASE_URL}/whatsapp/${type}/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  logoutWhatsAppSession: async (type) => {
    const response = await safeFetch(`${API_BASE_URL}/whatsapp/${type}/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  sendWhatsAppTest: async (type) => {
    const response = await safeFetch(`${API_BASE_URL}/whatsapp/${type}/test/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  }
};
