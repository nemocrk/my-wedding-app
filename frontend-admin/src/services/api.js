const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Token ${token}` } : {})
    };
};

export const api = {
    // Auth
    login: async (username, password) => {
        const res = await fetch(`${BASE_URL}/token-auth/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },
    
    // Core Config
    fetchLanguages: async () => {
        // Endpoint pubblico, non richiede auth header necessariamente, ma non fa male
        const res = await fetch(`${BASE_URL}/public/languages/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch languages');
        return res.json();
    },

    // Dashboard
    fetchStats: async () => {
        const res = await fetch(`${BASE_URL}/admin/dashboard/stats/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    // Global Config
    fetchGlobalConfig: async () => {
        const res = await fetch(`${BASE_URL}/admin/config/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch config');
        return res.json();
    },
    updateGlobalConfig: async (data) => {
        const res = await fetch(`${BASE_URL}/admin/config/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update config');
        return res.json();
    },

    // Texts Config
    fetchConfigurableTexts: async (lang = 'it') => {
        const url = lang ? `${BASE_URL}/admin/texts/?lang=${lang}` : `${BASE_URL}/admin/texts/`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch texts');
        return res.json();
    },
    updateConfigurableText: async (key, data, lang = 'it') => {
        // Usa PUT con chiave + lang nell'URL non è standard REST se la chiave è nell'URL
        // Ma il backend ViewSet usa 'key' come lookup.
        // Passiamo ?lang=xx anche in update per indicare quale variante aggiornare/creare
        const res = await fetch(`${BASE_URL}/admin/texts/${key}/?lang=${lang}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update text');
        return res.json();
    },

    // Accommodations
    fetchAccommodations: async () => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch accommodations');
        return res.json();
    },
    createAccommodation: async (data) => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create accommodation');
        return res.json();
    },
    updateAccommodation: async (id, data) => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/${id}/`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update accommodation');
        return res.json();
    },
    deleteAccommodation: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/${id}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete accommodation');
        return true;
    },
    
    // Rooms
    createRoom: async (data) => {
        const res = await fetch(`${BASE_URL}/admin/rooms/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create room');
        return res.json();
    },
    deleteRoom: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/rooms/${id}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete room');
        return true;
    },

    // Invitations
    fetchInvitations: async () => {
        const res = await fetch(`${BASE_URL}/admin/invitations/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch invitations');
        return res.json();
    },
    fetchInvitation: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch invitation');
        return res.json();
    },
    createInvitation: async (data) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create invitation');
        return res.json();
    },
    updateInvitation: async (id, data) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update invitation');
        return res.json();
    },
    deleteInvitation: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete invitation');
        return true;
    },
    
    // Actions
    generateLink: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/generate_link/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to generate link');
        return res.json();
    },
    markAsSent: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/mark-as-sent/`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to mark as sent');
        return res.json();
    },
    
    // Assignment
    fetchUnassignedInvitations: async () => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/unassigned-invitations/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch unassigned invitations');
        return res.json();
    },
    assignGuest: async (guestId, roomId) => {
        // Implementazione specifica se esiste endpoint dedicato, 
        // altrimenti si usa updateInvitation o updateGuest (se esistesse)
        // Per ora simuliamo logica complessa via custom action o patch
        throw new Error("Not implemented directly - use drag&drop specific endpoint");
    },
    unassignGuest: async (guestId) => {
        throw new Error("Not implemented");
    },
    autoAssign: async (strategy, resetPrevious = false) => {
        const res = await fetch(`${BASE_URL}/admin/accommodations/auto-assign/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ strategy, reset_previous: resetPrevious })
        });
        if (!res.ok) throw new Error('Auto-assign failed');
        return res.json();
    },

    // Analytics
    fetchInvitationHeatmaps: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/heatmaps/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch heatmaps');
        return res.json();
    },
    fetchInvitationInteractions: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/invitations/${id}/interactions/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch interactions');
        return res.json();
    },
    
    // WhatsApp
    fetchWhatsAppTemplates: async () => {
        const res = await fetch(`${BASE_URL}/admin/whatsapp/templates/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
    },
    createWhatsAppTemplate: async (data) => {
        const res = await fetch(`${BASE_URL}/admin/whatsapp/templates/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create template');
        return res.json();
    },
    updateWhatsAppTemplate: async (id, data) => {
        const res = await fetch(`${BASE_URL}/admin/whatsapp/templates/${id}/`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update template');
        return res.json();
    },
    deleteWhatsAppTemplate: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/whatsapp/templates/${id}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete template');
        return true;
    }
};
