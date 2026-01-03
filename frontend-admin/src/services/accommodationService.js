import { api } from './api';

export const accommodationService = {
  getAccommodations: async () => {
    try {
      const response = await fetch('/api/accommodations/');
      if (!response.ok) {
        // Usa lo standard di gestione errori di api.js se possibile, altrimenti lancia errore manuale
        // Ma per coerenza globale, proviamo a usare la logica di api.js
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // Dispatch global error
      const event = new CustomEvent('api-error', { detail: error });
      window.dispatchEvent(event);
      throw error;
    }
  },

  createAccommodation: async (data) => {
    try {
      const response = await fetch('/api/accommodations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ detail: response.statusText }));
         throw new Error(errorData.detail || errorData.message || 'Error creating accommodation');
      }
      return await response.json();
    } catch (error) {
      const event = new CustomEvent('api-error', { detail: error });
      window.dispatchEvent(event);
      throw error;
    }
  },

  updateAccommodation: async (id, data) => {
    try {
      const response = await fetch(`/api/accommodations/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ detail: response.statusText }));
         throw new Error(errorData.detail || errorData.message || 'Error updating accommodation');
      }
      return await response.json();
    } catch (error) {
       const event = new CustomEvent('api-error', { detail: error });
       window.dispatchEvent(event);
       throw error;
    }
  },

  deleteAccommodation: async (id) => {
    try {
      const response = await fetch(`/api/accommodations/${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
         throw new Error(`Failed to delete accommodation: ${response.status}`);
      }
      return true;
    } catch (error) {
       const event = new CustomEvent('api-error', { detail: error });
       window.dispatchEvent(event);
       throw error;
    }
  }
};
