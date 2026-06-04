import { api } from './api.js';

/**
 * paymentService — thin wrapper su api.js per il modulo Payment Tracker (#146).
 * Centralizza tutta la logica di fetch/mutazione relativa ai pagamenti,
 * tenendo i componenti puliti da dettagli HTTP.
 */
export const paymentService = {
  // ---- Platforms ----
  getPlatforms: () => api.fetchPaymentPlatforms(),
  createPlatform: (data) => api.createPaymentPlatform(data),
  updatePlatform: (id, data) => api.updatePaymentPlatform(id, data),
  deletePlatform: (id) => api.deletePaymentPlatform(id),

  // ---- Events ----
  getEvents: (filters = {}) => api.fetchPaymentEvents(filters),
  createEvent: (data) => api.createPaymentEvent(data),
  updateEvent: (id, data) => api.updatePaymentEvent(id, data),
  deleteEvent: (id) => api.deletePaymentEvent(id),

  // ---- Aggregati ----
  getSummary: () => api.getPaymentSummary(),
  getPayables: () => api.getPayablesList(),
};

// Supporta sia `import paymentService from '...'` (default)
// che `import { paymentService } from '...'` (named)
export default paymentService;
