/**
 * API Service Layer for Public User Frontend
 * Gestisce tutte le chiamate al backend con session-based auth
 */

const API_BASE = '/api/public';

const triggerGlobalError = (error) => {
  const event = new CustomEvent('api-error', { detail: error });
  window.dispatchEvent(event);
};

/**
 * Configurazione fetch con credenziali (cookie sessione)
 */
const fetchWithCredentials = async (url, options = {}) => {
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
      const error = new Error(errorData.message || `HTTP ${response.status}`);
      triggerGlobalError(error);
      throw error;
    }

    return response.json();
  } catch (err) {
    // Se l'errore è già stato gestito (lanciato sopra), lo rilanciamo e basta.
    // Se è un errore di rete (fetch fallito), lo intercettiamo.
    if (err.message && err.message.startsWith("HTTP")) {
      throw err;
    }
    
    // Errore di rete / fetch failed
    const networkError = new Error("Errore di connessione al server.");
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
 */
export const submitRSVP = async (status, accommodationRequested = false, transferRequested = false) => {
  return fetchWithCredentials(`${API_BASE}/rsvp/`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      accommodation_requested: accommodationRequested,
      transfer_requested: transferRequested,
    }),
  });
};
