import { fetchClient, fetchClientDelete } from './fetchClient.js';

const API_URL = 'api/admin/accommodations';

export const accommodationService = {
  getAll: async () => {
    return fetchClient(`${API_URL}/`);
  },

  create: async (data) => {
    return fetchClient(`${API_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return fetchClient(`${API_URL}/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return fetchClientDelete(`${API_URL}/${id}/`, {
      method: 'DELETE',
    });
  },

  autoAssign: async () => {
    return fetchClient(`${API_URL}/auto-assign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
