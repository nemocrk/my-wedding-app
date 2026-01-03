const API_BASE = '/api/public';

/**
 * Helper to get session ID from storage (same logic as analytics.js)
 */
const getSessionId = () => {
    return sessionStorage.getItem('wedding_analytics_sid') || null;
};

export const api = {
  authenticate: async (code, token) => {
    const response = await fetch(`${API_BASE}/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, token }),
    });
    return response.json();
  },

  getInvitation: async () => {
    const response = await fetch(`${API_BASE}/invitation/`, {
      method: 'GET',
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Session expired");
    }
    return response.json();
  },

  submitRSVP: async (data) => {
    // Inject session_id into payload for backend tracking
    const payload = {
        ...data,
        session_id: getSessionId()
    };

    const response = await fetch(`${API_BASE}/rsvp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  }
};
