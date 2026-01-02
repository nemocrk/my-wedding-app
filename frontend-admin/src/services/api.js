const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  // Invitations
  async fetchInvitations() {
    const response = await fetch(`${API_BASE_URL}/invitations/`);
    if (!response.ok) throw new Error('Failed to fetch invitations');
    return response.json();
  },

  async getInvitation(id) {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`);
    if (!response.ok) throw new Error('Failed to fetch invitation details');
    return response.json();
  },

  async createInvitation(data) {
    const response = await fetch(`${API_BASE_URL}/invitations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }
    return response.json();
  },

  async updateInvitation(id, data) {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }
    return response.json();
  },

  async deleteInvitation(id) {
    const response = await fetch(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete invitation');
    return true;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats/`);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  },

  // Configuration
  async getConfig() {
    // Il viewset usa 'list' di default per la root '/' del viewset, che è mappata a pk=1 get_or_create
    // Ma in router.register(r'config', ...), l'endpoint list è GET /config/
    const response = await fetch(`${API_BASE_URL}/config/`);
    if (!response.ok) throw new Error('Failed to fetch configuration');
    return response.json();
  },

  async updateConfig(data) {
    // Il create method nel viewset gestisce l'update. È una POST a /config/
    const response = await fetch(`${API_BASE_URL}/config/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
    }
    return response.json();
  }
};
