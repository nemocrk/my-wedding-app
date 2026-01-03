const API_BASE_URL = '/api';

const handleResponse = async (response) => {
  // Try to parse JSON regardless of status code to get error details
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // Fallback for non-JSON errors (like standard Nginx 500 html if middleware fails)
    data = { detail: await response.text() }; 
  }

  if (!response.ok) {
    // Prefer "detail" field (DRF standard), then "error", then generic message
    const errorMessage = data.detail || data.error || `Errore ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  
  return data;
};

export const api = {
  // Invitations
  fetchInvitations: async () => {
    const response = await fetch(`${API_BASE_URL}/invitations/`);
    return handleResponse(response);
  },

  getInvitation: async (id) => {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`);
    return handleResponse(response);
  },

  createInvitation: async (data) => {
    const response = await fetch(`${API_BASE_URL}/invitations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateInvitation: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteInvitation: async (id) => {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE',
    });
    // DELETE often returns 204 No Content, so we might check response.ok directly
    if (response.status === 204) {
      return true;
    }
    return handleResponse(response);
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats/`);
    return handleResponse(response);
  },

  // Configuration
  getConfig: async () => {
    const response = await fetch(`${API_BASE_URL}/config/`);
    return handleResponse(response);
  },

  updateConfig: async (data) => {
    const response = await fetch(`${API_BASE_URL}/config/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  }
};
