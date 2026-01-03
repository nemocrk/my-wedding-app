const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.detail || error.error || 'API Error');
    }
    return response.json();
};

export const accommodationService = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/accommodations/`);
        return handleResponse(response);
    },

    create: async (data) => {
        const response = await fetch(`${API_URL}/accommodations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async (id) => {
        const response = await fetch(`${API_URL}/accommodations/${id}/`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete accommodation');
        }
        return true;
    },

    autoAssign: async (resetPrevious = false) => {
        const response = await fetch(`${API_URL}/accommodations/auto_assign/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_previous: resetPrevious }),
        });
        return handleResponse(response);
    }
};
