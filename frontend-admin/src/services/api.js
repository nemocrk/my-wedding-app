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
    // Add additional info for debugging if needed
    error.status = response.status;
    triggerGlobalError(error);
    throw error;
  }
  
  return data;
};

// Wrapper per fetch per catturare errori di rete (es. 502 dal proxy quando il backend è giù)
const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    // Network error (es. server irraggiungibile)
    const error = new Error("Impossibile contattare il server. Controlla la tua connessione.");
    triggerGlobalError(error);
    throw error;
  }
};

export const api = {
  // Invitations
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateInvitation: async (id, data) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteInvitation: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE',
    });
    if (response.status === 204) {
      return true;
    }
    return handleResponse(response);
  },
  
  generateInvitationLink: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/generate_link/`);
    return handleResponse(response);
  },

  // Analytics
  getInvitationHeatmaps: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/heatmaps/`);
    return handleResponse(response);
  },

  getInvitationInteractions: async (id) => {
    const response = await safeFetch(`${API_BASE_URL}/invitations/${id}/interactions/`);
    return handleResponse(response);
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const response = await safeFetch(`${API_BASE_URL}/dashboard/stats/`);
    return handleResponse(response);
  },

  // Configuration
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

  // Accommodations
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

  triggerAutoAssign: async (resetPrevious = false) => {
    const response = await safeFetch(`${API_BASE_URL}/accommodations/auto-assign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_previous: resetPrevious })
    });
    return handleResponse(response);
  },

  fetchUnassignedInvitations: async () => {
      const response = await safeFetch(`${API_BASE_URL}/accommodations/unassigned-invitations/`);
      return handleResponse(response);
  }
};
