const API_URL = '/api/accommodations';

const triggerGlobalError = (error) => {
  const event = new CustomEvent('api-error', { detail: error });
  window.dispatchEvent(event);
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorDetail = `HTTP Error ${response.status}`;
    
    try {
        if (contentType && contentType.includes("application/json")) {
            const json = await response.json();
            errorDetail = json.detail || json.message || JSON.stringify(json);
        } else {
            errorDetail = await response.text();
        }
    } catch (e) {
        // Fallback se il parsing fallisce
    }

    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const accommodationService = {
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/`);
      return await handleResponse(response);
    } catch (error) {
      triggerGlobalError(error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const response = await fetch(`${API_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(response);
    } catch (error) {
      triggerGlobalError(error);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await fetch(`${API_URL}/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(response);
    } catch (error) {
      triggerGlobalError(error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
          throw new Error('Impossibile eliminare l\'alloggio');
      }
      return true;
    } catch (error) {
      triggerGlobalError(error);
      throw error;
    }
  },

  autoAssign: async () => {
    try {
      const response = await fetch(`${API_URL}/auto-assign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await handleResponse(response);
    } catch (error) {
      triggerGlobalError(error);
      throw error;
    }
  }
};
