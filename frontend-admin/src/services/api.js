// frontend-admin/src/services/api.js

const API_BASE_URL = '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Errore nella richiesta API');
  }
  return response.json();
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
