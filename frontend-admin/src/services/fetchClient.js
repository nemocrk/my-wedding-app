/**
 * Unified Fetch Client
 * 
 * Centralizes HTTP request logic across all frontend-admin services:
 * - Network error handling (failed fetch)
 * - Response parsing (JSON with text fallback)
 * - HTTP error mapping (4xx/5xx) to Error objects
 * - Global error event emission ('api-error')
 * 
 * This module eliminates duplicate error handling in api.js and accommodationService.js,
 * ensuring consistent UX for network failures and backend errors.
 * 
 * @see Issue #82
 */

/**
 * Emits a global 'api-error' event for centralized error handling.
 * Consumed by ErrorBoundary or global listeners in the app.
 * 
 * @param {Error} error - Error object with optional `status` property
 */
const triggerGlobalError = (error) => {
  const event = new CustomEvent('api-error', { detail: error });
  window.dispatchEvent(event);
};

/**
 * Parses HTTP response body as JSON or falls back to text.
 * Throws an Error for non-2xx responses after emitting global event.
 * 
 * @param {Response} response - Fetch API Response object
 * @returns {Promise<any>} Parsed JSON data or { detail: text }
 * @throws {Error} Enhanced error with `status` property for HTTP errors
 */
const handleResponse = async (response) => {
  let data;
  const contentType = response.headers.get("content-type");
  
  // Parse response body based on Content-Type
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // Fallback for non-JSON responses (e.g., plain text errors)
    data = { detail: await response.text() };
  }

  // Handle HTTP errors (4xx, 5xx)
  if (!response.ok) {
    const errorMessage = 
      data.detail || 
      data.error || 
      data.message || 
      data.name || 
      JSON.stringify(data) || 
      `HTTP Error ${response.status}: ${response.statusText}`;
    
    const error = new Error(errorMessage);
    error.status = response.status;
    
    // Emit global error event BEFORE throwing
    triggerGlobalError(error);
    throw error;
  }
  
  return data;
};

/**
 * Wrapper around native fetch with network error handling.
 * Catches fetch failures (e.g., DNS errors, CORS, timeouts) and emits global event.
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} Fetch Response object
 * @throws {Error} Enhanced error for network failures
 */
const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    // Network-level error (not HTTP error)
    const error = new Error(
      "Impossibile contattare il server. Controlla la tua connessione."
    );
    error.originalError = err;
    
    // Emit global error event BEFORE throwing
    triggerGlobalError(error);
    throw error;
  }
};

/**
 * High-level fetch client that combines safeFetch + handleResponse.
 * Use this in services to avoid repetitive error handling.
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Parsed response data
 * @throws {Error} Network or HTTP errors (already emitted globally)
 * 
 * @example
 * // GET request
 * const data = await fetchClient('/api/admin/invitations/');
 * 
 * @example
 * // POST request
 * const result = await fetchClient('/api/admin/invitations/', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'Wedding', code: 'W123' })
 * });
 */
export const fetchClient = async (url, options = {}) => {
  const response = await safeFetch(url, options);
  return handleResponse(response);
};

/**
 * Specialized fetch for DELETE requests returning 204 No Content.
 * Returns `true` for successful deletion instead of trying to parse empty body.
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options (should include method: 'DELETE')
 * @returns {Promise<boolean|any>} true for 204, parsed data otherwise
 * @throws {Error} Network or HTTP errors
 * 
 * @example
 * const deleted = await fetchClientDelete('/api/admin/accommodations/5/', { method: 'DELETE' });
 * // deleted === true
 */
export const fetchClientDelete = async (url, options = {}) => {
  const response = await safeFetch(url, options);
  
  // Handle 204 No Content (successful deletion)
  if (response.status === 204) {
    return true;
  }
  
  return handleResponse(response);
};

/**
 * Export internal helpers for testing purposes.
 * Services should NOT import these directly - use fetchClient instead.
 */
export const _internal = {
  triggerGlobalError,
  handleResponse,
  safeFetch,
};
