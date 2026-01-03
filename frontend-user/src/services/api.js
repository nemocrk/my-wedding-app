const API_BASE = '/api/public';

/**
 * Helper to get session ID from storage
 */
const getSessionId = () => {
    return sessionStorage.getItem('wedding_analytics_sid') || null;
};

export const authenticateInvitation = async (code, token) => {
  try {
    const response = await fetch(`${API_BASE}/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, token }),
    });
    return await response.json();
  } catch (error) {
    console.error("Auth error", error);
    return { valid: false, message: "Errore di connessione" };
  }
};

export const getInvitation = async () => {
  try {
    const response = await fetch(`${API_BASE}/invitation/`, {
      method: 'GET',
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Session expired");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const submitRSVP = async (status, accommodation_requested, transfer_requested) => {
  const session_id = getSessionId();
  
  const payload = {
      status,
      accommodation_requested,
      transfer_requested,
      session_id
  };

  try {
    const response = await fetch(`${API_BASE}/rsvp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("RSVP error", error);
    return { success: false, message: "Errore durante l'invio della risposta" };
  }
};
