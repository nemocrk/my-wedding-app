/**
 * API Service Layer for Public User Frontend
 * Gestisce tutte le chiamate al backend con session-based auth
 */

export const API_BASE = 'api/public';

/**
 * Helper to get session ID from storage (same logic as analytics.js)
 */
const getSessionId = () => {
  return sessionStorage.getItem('wedding_analytics_sid') || null;
};

const triggerGlobalError = (error) => {
  const event = new CustomEvent('api-error', { detail: error });
  window.dispatchEvent(event);
};

/**
 * Configurazione fetch con credenziali (cookie sessione)
 */
export const fetchWithCredentials = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // CRITICAL: invia/ricevi cookie
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
      // Crea un errore custom con flag per evitare double-handling
      const error = new Error(`${errorData.message}: HTTP ${response.status}`);
      error.isHandled = true;
      triggerGlobalError(error);
      throw error;
    }

    return response.json();
  } catch (err) {
    // Se l'errore è già stato gestito (lanciato sopra con isHandled), lo rilanciamo senza fare altro.
    if (err.isHandled) {
      throw err;
    }

    // Se è un errore di rete (fetch fallito) o altro imprevisto
    const networkError = new Error("Errore di connessione al server.");
    networkError.isHandled = true;
    triggerGlobalError(networkError);
    throw networkError;
  }
};

/**
 * Autenticazione iniziale: valida code + token e crea sessione
 */
export const authenticateInvitation = async (code, token) => {
  return fetchWithCredentials(`${API_BASE}/auth/`, {
    method: 'POST',
    body: JSON.stringify({ code, token }),
  });
};

/**
 * Recupera dettagli invito (richiede sessione attiva)
 */
export const getInvitationDetails = async () => {
  return fetchWithCredentials(`${API_BASE}/invitation/`);
};

/**
 * Invia RSVP (conferma/declino)
 * Supporta ora payload esteso per dettagli viaggio, telefono e modifiche ospiti
 */
export const submitRSVP = async (status, accommodationRequested = false, transferRequested = false, extraData = {}) => {
  return fetchWithCredentials(`${API_BASE}/rsvp/`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      accommodation_requested: accommodationRequested,
      transfer_requested: transferRequested,
      session_id: getSessionId(),
      ...extraData // Include guest_changes, phone, travel_details, etc.
    }),
  });
};

export const fetchLanguages = async () => {
  return fetchWithCredentials(`${API_BASE}/languages/`);
};