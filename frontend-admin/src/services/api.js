const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const getHeaders = () => {
    // In Intranet mode no auth needed, but we keep content-type
    return {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Removed for intranet
    };
};

export const api = {
    // ... existing methods ...
    getDashboardStats: async () => {
        const res = await fetch(`${API_URL}/admin/dashboard/stats/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    },

    // WhatsApp Methods
    getWhatsAppStatus: async (type) => {
        const res = await fetch(`${API_URL}/admin/whatsapp/${type}/status/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    },

    refreshWhatsAppSession: async (type) => {
        const res = await fetch(`${API_URL}/admin/whatsapp/${type}/refresh/`, { 
            method: 'POST',
            headers: getHeaders() 
        });
        if (!res.ok) throw new Error('Refresh failed');
        return res.json();
    },

    logoutWhatsAppSession: async (type) => {
        const res = await fetch(`${API_URL}/admin/whatsapp/${type}/logout/`, { 
            method: 'POST',
            headers: getHeaders() 
        });
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
    },

    sendWhatsAppTest: async (type) => {
        const res = await fetch(`${API_URL}/admin/whatsapp/${type}/test/`, { 
            method: 'POST',
            headers: getHeaders() 
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Test failed');
        }
        return res.json();
    }
};
