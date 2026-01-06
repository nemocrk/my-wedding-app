const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const GROOM_URL = process.env.WAHA_GROOM_URL || 'http://waha-groom:3000';
const BRIDE_URL = process.env.WAHA_BRIDE_URL || 'http://waha-bride:3000';
const API_KEYS = {
    groom: process.env.WAHA_API_KEY_GROOM,
    bride: process.env.WAHA_API_KEY_BRIDE
};

// Middleware per Basic Auth interna
const authMiddleware = (req, res, next) => {
    // In produzione implementare check auth token dal backend Django
    // Per ora ci fidiamo della rete interna docker
    next();
};

const getSessionUrl = (session) => {
    return session === 'groom' ? GROOM_URL : BRIDE_URL;
};

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Proxy Status
app.get('/status/:session', async (req, res) => {
    const { session } = req.params;
    const baseUrl = getSessionUrl(session);
    try {
        const response = await axios.get(`${baseUrl}/api/sessions?all=true`);
        // WAHA returns array of sessions. We assume 'default' or session name matches
        const sessionData = response.data.find(s => s.name === 'default') || response.data[0];
        
        // Normalize state
        let state = 'disconnected';
        if (sessionData?.status === 'WORKING') state = 'connected';
        if (sessionData?.status === 'SCAN_QR_CODE') state = 'waiting_qr';
        
        res.json({ state, details: sessionData });
    } catch (error) {
        console.error(`Error fetching status for ${session}:`, error.message);
        res.status(502).json({ state: 'error', error: error.message });
    }
});

// Proxy Screenshot (QR Code)
app.get('/screenshot/:session', async (req, res) => {
    const { session } = req.params;
    const baseUrl = getSessionUrl(session);
    try {
        const response = await axios.get(`${baseUrl}/api/screenshot?session=default`, {
            responseType: 'arraybuffer'
        });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        res.json({ data: `data:image/png;base64,${base64}` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch QR' });
    }
});

// Send Message with Human Behavior
app.post('/send', async (req, res) => {
    const { session, number, message } = req.body;
    
    if (!session || !number || !message) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const baseUrl = getSessionUrl(session);
    const chatId = `${number}@c.us`;

    try {
        // 1. Simulate Typing
        await axios.post(`${baseUrl}/api/sendSeen`, {
            session: 'default',
            chatId: chatId
        });
        
        await axios.post(`${baseUrl}/api/startTyping`, {
            session: 'default',
            chatId: chatId
        });

        // Calculate delay based on message length (approx 50ms per char, min 1s, max 5s)
        const typingDelay = Math.min(Math.max(message.length * 50, 1000), 5000);
        await new Promise(r => setTimeout(r, typingDelay));

        await axios.post(`${baseUrl}/api/stopTyping`, {
            session: 'default',
            chatId: chatId
        });

        // 2. Send Message
        const sendResponse = await axios.post(`${baseUrl}/api/sendText`, {
            session: 'default',
            chatId: chatId,
            text: message
        });

        res.json({ success: true, id: sendResponse.data.id });

    } catch (error) {
        console.error(`Error sending message via ${session}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Integration Service running on port ${PORT}`);
});
