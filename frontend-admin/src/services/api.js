import { fetchClient, fetchClientDelete } from './fetchClient.js';

const API_BASE_URL = 'api/admin';

export const api = {
  // --- INVITATION LABELS ---
  fetchInvitationLabels: async () => {
    return fetchClient(`${API_BASE_URL}/invitation-labels/`);
  },

  createInvitationLabel: async (data) => {
    return fetchClient(`${API_BASE_URL}/invitation-labels/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateInvitationLabel: async (id, data) => {
    return fetchClient(`${API_BASE_URL}/invitation-labels/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteInvitationLabel: async (id) => {
    return fetchClientDelete(`${API_BASE_URL}/invitation-labels/${id}/`, {
      method: 'DELETE',
    });
  },

  // --- INVITATIONS ---
  fetchInvitations: async (filters = {}) => {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.label) queryParams.append('label', filters.label);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.ordering) queryParams.append('ordering', filters.ordering);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return fetchClient(`${API_BASE_URL}/invitations/${queryString}`);
  },

  getInvitation: async (id) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/`);
  },

  createInvitation: async (data) => {
    return fetchClient(`${API_BASE_URL}/invitations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateInvitation: async (id, data) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  markInvitationAsSent: async (id) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/mark-as-sent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body for action
    });
  },
  
  bulkSendInvitations: async (invitationIds) => {
    return fetchClient(`${API_BASE_URL}/invitations/bulk-send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_ids: invitationIds })
    });
  },

  bulkManageLabels: async (invitationIds, labelIds, action = 'add') => {
    return fetchClient(`${API_BASE_URL}/invitations/bulk-labels/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        invitation_ids: invitationIds,
        label_ids: labelIds,
        action: action
      })
    });
  },

  verifyContact: async (id) => {
    // Uses fallback option (PATCH to set state to not_valid which triggers backend task)
    return fetchClient(`${API_BASE_URL}/invitations/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_verified: 'not_valid' }),
    });
  },

  deleteInvitation: async (id) => {
    return fetchClientDelete(`${API_BASE_URL}/invitations/${id}/`, {
      method: 'DELETE',
    });
  },
  
  generateInvitationLink: async (id) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/generate_link/`);
  },

  // --- ANALYTICS ---
  getInvitationHeatmaps: async (id) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/heatmaps/`);
  },

  getInvitationInteractions: async (id) => {
    return fetchClient(`${API_BASE_URL}/invitations/${id}/interactions/`);
  },

  // --- DASHBOARD ---
  getDashboardStats: async () => {
    return fetchClient(`${API_BASE_URL}/dashboard/stats/`);
  },

  getDynamicDashboardStats: async (filters) => {
    const queryString = filters.join(',');
    return fetchClient(`${API_BASE_URL}/dashboard/dynamic-stats/?filters=${queryString}`);
  },

  // --- CONFIG (System) ---
  getConfig: async () => {
    return fetchClient(`${API_BASE_URL}/config/`);
  },

  updateConfig: async (data) => {
    return fetchClient(`${API_BASE_URL}/config/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // --- PUBLIC UTILS (i18n) ---
  fetchLanguages: async () => {
    return fetchClient(`${API_BASE_URL}/languages/`);
  },

  // --- GOOGLE FONTS PROXY (New) ---
  fetchGoogleFonts: async () => {
    return fetchClient(`${API_BASE_URL}/google-fonts/`);
  },

  // --- CONFIGURABLE TEXTS (Dynamic Content) ---
  fetchConfigurableTexts: async (lang = null) => {
    const url = lang ? `${API_BASE_URL}/texts/?lang=${lang}` : `${API_BASE_URL}/texts/`;
    return fetchClient(url);
  },

  getConfigurableText: async (key, lang = 'it') => {
    return fetchClient(`${API_BASE_URL}/texts/${key}/?lang=${lang}`);
  },
  
  createConfigurableText: async (data) => {
    return fetchClient(`${API_BASE_URL}/texts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
  },

  updateConfigurableText: async (key, data, lang = 'it') => {
    // Note: 'key' in URL must be handled correctly if it contains dots
    return fetchClient(`${API_BASE_URL}/texts/${key}/?lang=${lang}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteConfigurableText: async (key, lang = 'it') => {
    return fetchClientDelete(`${API_BASE_URL}/texts/${key}/?lang=${lang}`, {
      method: 'DELETE',
    });
  },

  // --- ACCOMMODATIONS ---
  fetchAccommodations: async () => {
    return fetchClient(`${API_BASE_URL}/accommodations/`);
  },

  createAccommodation: async (data) => {
    return fetchClient(`${API_BASE_URL}/accommodations/`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateAccommodation: async (id, data) => {
    return fetchClient(`${API_BASE_URL}/accommodations/${id}/`, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  
  deleteAccommodation: async (id) => {
    return fetchClientDelete(`${API_BASE_URL}/accommodations/${id}/`, { 
      method: 'DELETE' 
    });
  },

  triggerAutoAssign: async (resetPrevious = false, strategy = 'SIMULATION') => {
    return fetchClient(`${API_BASE_URL}/accommodations/auto-assign/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        reset_previous: resetPrevious,
        strategy: strategy 
      })
    });
  },

  fetchUnassignedInvitations: async () => {
      return fetchClient(`${API_BASE_URL}/accommodations/unassigned-invitations/`);
  },

  // --- WHATSAPP INTEGRATION ---
  getWhatsAppStatus: async (type) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${type}/status/`);
  },

  refreshWhatsAppSession: async (type) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${type}/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
  },

  logoutWhatsAppSession: async (type) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${type}/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
  },

  sendWhatsAppTest: async (type) => {
    return fetchClient(`${API_BASE_URL}/whatsapp/${type}/test/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
  },

  // --- WHATSAPP QUEUE ---
  fetchWhatsAppQueue: async () => {
    return fetchClient(`${API_BASE_URL}/whatsapp-queue/`);
  },

  enqueueWhatsAppMessage: async (data) => {
    return fetchClient(`${API_BASE_URL}/whatsapp-queue/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
  },

  // --- WHATSAPP TEMPLATES ---
  fetchWhatsAppTemplates: async () => {
      return fetchClient(`${API_BASE_URL}/whatsapp-templates/`);
  },

  createWhatsAppTemplate: async (data) => {
      return fetchClient(`${API_BASE_URL}/whatsapp-templates/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
  },

  updateWhatsAppTemplate: async (id, data) => {
      return fetchClient(`${API_BASE_URL}/whatsapp-templates/${id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
  },

  deleteWhatsAppTemplate: async (id) => {
      return fetchClientDelete(`${API_BASE_URL}/whatsapp-templates/${id}/`, {
          method: 'DELETE'
      });
  }
};
