/**
 * API Service Layer for Public User Frontend
 * Gestisce tutte le chiamate al backend con session-based auth
 */

const API_BASE = '/api/public';

/**
 * Configurazione fetch con credenziali (cookie sessione)
 */
const fetchWithCredentials = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // CRITICAL: invia/ricevi cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
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
