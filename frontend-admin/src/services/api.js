// frontend-admin/src/services/api.js

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

  getInvitation: async (id) => {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`);
    return handleResponse(response);
  }
};
