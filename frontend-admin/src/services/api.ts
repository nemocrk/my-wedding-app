import { Invitation, GlobalConfig, LoginResponse, DashboardStats, GuestInteraction, GuestHeatmap, Accommodation, WhatsAppStatus, WhatsAppTemplate, WhatsAppQueueItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API request failed');
  }
  if (response.status === 204) {
      return null;
  }
  return response.json();
};

export const api = {
  login: async (password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/admin/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return handleResponse(response);
  },

  verifyToken: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/admin/auth/verify/`, {
        headers: getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  getStats: async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_URL}/admin/dashboard/stats/`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- INVITATIONS ---

  fetchInvitations: async (): Promise<Invitation[]> => {
    const response = await fetch(`${API_URL}/invitations/`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getInvitation: async (id: number): Promise<Invitation> => {
    const response = await fetch(`${API_URL}/invitations/${id}/`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createInvitation: async (data: Partial<Invitation>): Promise<Invitation> => {
    const response = await fetch(`${API_URL}/invitations/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateInvitation: async (id: number, data: Partial<Invitation>): Promise<Invitation> => {
    const response = await fetch(`${API_URL}/invitations/${id}/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteInvitation: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/invitations/${id}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  generateInvitationLink: async (id: number): Promise<{url: string}> => {
      const response = await fetch(`${API_URL}/invitations/${id}/generate_link/`, {
          method: 'POST',
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  markInvitationAsSent: async (id: number): Promise<Invitation> => {
      const response = await fetch(`${API_URL}/invitations/${id}/mark_sent/`, {
          method: 'POST',
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  verifyContact: async (id: number): Promise<void> => {
    // Usiamo Opzione A (endpoint dedicato) se disponibile, oppure Opzione B (PATCH)
    // Per ora usiamo Opzione B (set to NOT_VALID) per triggerare il backend
    // Idealmente: POST /api/invitations/{id}/verify-contact/
    
    /* 
    OPZIONE A (Endpoint dedicato - Preferita):
    const response = await fetch(`${API_URL}/invitations/${id}/verify_contact/`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
    */

    // OPZIONE B (Fallback su update field):
    const response = await fetch(`${API_URL}/invitations/${id}/`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ contact_verified: 'not_valid' }),
    });
    return handleResponse(response);
  },

  // --- ACCOMMODATIONS ---

  fetchAccommodations: async (): Promise<Accommodation[]> => {
      const response = await fetch(`${API_URL}/accommodations/`, {
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  createAccommodation: async (data: Partial<Accommodation>): Promise<Accommodation> => {
      const response = await fetch(`${API_URL}/accommodations/`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
      });
      return handleResponse(response);
  },

  updateAccommodation: async (id: number, data: Partial<Accommodation>): Promise<Accommodation> => {
      const response = await fetch(`${API_URL}/accommodations/${id}/`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
      });
      return handleResponse(response);
  },

  deleteAccommodation: async (id: number): Promise<void> => {
      const response = await fetch(`${API_URL}/accommodations/${id}/`, {
          method: 'DELETE',
          headers: getHeaders(),
      });
      return handleResponse(response);
  },
  
  autoAssignRooms: async (mode: 'simulation' | 'execution', strategy: string): Promise<any> => {
      const response = await fetch(`${API_URL}/accommodations/auto_assign/?mode=${mode}&strategy=${strategy}`, {
          method: 'POST',
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  // --- CONFIG ---

  fetchConfig: async (): Promise<GlobalConfig> => {
    const response = await fetch(`${API_URL}/config/`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  updateConfig: async (data: Partial<GlobalConfig>): Promise<GlobalConfig> => {
    const response = await fetch(`${API_URL}/config/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  // --- ANALYTICS ---
  
  getGuestInteractions: async (invitationId: number): Promise<GuestInteraction[]> => {
      const response = await fetch(`${API_URL}/analytics/interactions/?invitation_id=${invitationId}`, {
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  getGuestHeatmap: async (invitationId: number): Promise<GuestHeatmap[]> => {
      const response = await fetch(`${API_URL}/analytics/heatmaps/?invitation_id=${invitationId}`, {
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  // --- WHATSAPP ---

  getWhatsAppStatus: async (): Promise<WhatsAppStatus[]> => {
    const response = await fetch(`${API_URL}/whatsapp/status/`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getWhatsAppTemplates: async (): Promise<WhatsAppTemplate[]> => {
      const response = await fetch(`${API_URL}/whatsapp/templates/`, {
          headers: getHeaders(),
      });
      return handleResponse(response);
  },

  sendWhatsAppMessage: async (invitationId: number, templateId?: number, customMessage?: string): Promise<any> => {
      const response = await fetch(`${API_URL}/whatsapp/send/`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ invitation_id: invitationId, template_id: templateId, message: customMessage }),
      });
      return handleResponse(response);
  },
  
  getWhatsAppQueue: async (): Promise<WhatsAppQueueItem[]> => {
      const response = await fetch(`${API_URL}/whatsapp/queue/`, {
          headers: getHeaders(),
      });
      return handleResponse(response);
  }
};
