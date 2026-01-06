const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

// Configurazione Ambiente
const WAHA_URLS = {
  groom: process.env.WAHA_GROOM_URL || 'http://waha-groom:3000',
  bride: process.env.WAHA_BRIDE_URL || 'http://waha-bride:3000'
};

const WAHA_API_KEYS = {
  groom: process.env.WAHA_API_KEY_GROOM,
  bride: process.env.WAHA_API_KEY_BRIDE
};

app.use(express.json());

// --- HELPERS ---

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendHumanLike(wahaUrl, sessionType, chatId, text) {
    const apiKey = WAHA_API_KEYS[sessionType]; // FIX: Corrected variable name
    const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

    console.log(`[${sessionType}] Starting Human-Like sequence for ${chatId}`);

    // 1. Initial Human Pause (Random 2-4s)
    await sleep(Math.floor(Math.random() * 2000) + 2000);

    // 2. Start Typing
    try {
        await axios.post(`${wahaUrl}/api/startTyping`, { chatId }, { headers });
    } catch (e) {
        console.warn(`[${sessionType}] Failed startTyping: ${e.message}`);
    }

    // 3. Typing Simulation Time
    // ~5 chars per 200ms + random variance. Max 15s.
    const typingTime = Math.min((text.length * 40) + 500, 15000);
    await sleep(typingTime);

    // 4. Stop Typing
    try {
        await axios.post(`${wahaUrl}/api/stopTyping`, { chatId }, { headers });
    } catch (e) {
        console.warn(`[${sessionType}] Failed stopTyping: ${e.message}`);
    }

    // 5. Send Message
    return await axios.post(`${wahaUrl}/api/sendText`, {
        chatId,
        text,
        session: sessionType
    }, { headers });
}

// --- ENDPOINTS ---

// GET /:session_type/status
// Proxy status check to WAHA
app.get('/:session_type/status', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  if (!wahaUrl) return res.status(400).json({ error: 'Invalid session type' });

  try {
    // FIX: sessionType -> session_type
    const response = await axios.get(`${wahaUrl}/api/sessions/${session_type}`, {
      headers: { 'X-Api-Key': WAHA_API_KEYS[session_type] },
      timeout: 5000
    });
    
    // Normalize status for Dashboard
    const data = response.data;
    // WAHA returns status in various formats depending on version, adapting generally:
    // status: 'WORKING' | 'SCAN_QR_CODE' | 'STARTING' | 'FAILED'
    let state = 'disconnected';
    if (data.status === 'WORKING') state = 'connected';
    else if (data.status === 'SCAN_QR_CODE') state = 'waiting_qr';
    else if (data.status === 'STARTING') state = 'connecting';
    
    res.json({ state, raw: data });
  } catch (error) {
    // If WAHA is unreachable or returns error
    res.json({ state: 'error', error: error.message });
  }
});

// GET /:session_type/qr
// Proxy QR code image
app.get('/:session_type/qr', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  try {
    // FIX: sessionType -> session_type
    const response = await axios.get(`${wahaUrl}/api/${session_type}/auth/qr`, {
      headers: { 'X-Api-Key': WAHA_API_KEYS[session_type] },
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    res.json({ qr_code: `data:image/png;base64,${base64Image}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:session_type/refresh
// Force session check or restart
app.post('/:session_type/refresh', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  try {
    // 1. Check current status
    const statusUrl = `${wahaUrl}/api/sessions/${session_type}`;
    const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
    
    let status = 'UNKNOWN';
    try {
        const s = await axios.get(statusUrl, { headers, timeout: 5000 });
        status = s.data.status;
    } catch (e) {
        // If 404/Error, assume stopped/not exists
        status = 'STOPPED';
    }

    if (status === 'WORKING') {
      return res.json({ state: 'connected' });
    }
    
    if (status === 'SCAN_QR_CODE') {
       // Get QR
       const qrResp = await axios.get(`${wahaUrl}/api/${session_type}/auth/qr`, {
          headers, responseType: 'arraybuffer' 
       });
       const b64 = Buffer.from(qrResp.data, 'binary').toString('base64');
       return res.json({ state: 'waiting_qr', qr_code: `data:image/png;base64,${b64}` });
    }

    // Try to Start session if stopped
    try {
        await axios.post(`${wahaUrl}/api/sessions/${session_type}/start`, {}, { headers });
        return res.json({ state: 'connecting', message: 'Session start triggered' });
    } catch (e) {
        return res.json({ state: 'error', error: 'Failed to start session: ' + e.message });
    }

  } catch (error) {
    res.status(500).json({ state: 'error', error: error.message });
  }
});

// POST /:session_type/send
// Worker entry point for sending messages safely
app.post('/:session_type/send', async (req, res) => {
    const { session_type } = req.params;
    const { phone, message } = req.body;
    const wahaUrl = WAHA_URLS[session_type];

    if (!wahaUrl) return res.status(400).json({ error: 'Invalid session' });
    if (!phone || !message) return res.status(400).json({ error: 'Missing params' });

    try {
        // Normalize phone to chatId
        // Remove +, spaces, dashes
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const chatId = `${cleanPhone}@c.us`;
        
        // Execute Human-Like Send
        await sendHumanLike(wahaUrl, session_type, chatId, message);
        
        res.json({ status: 'sent', timestamp: new Date() });
    } catch (error) {
        console.error(`Error sending to ${phone}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`WhatsApp Integration Layer listening on port ${PORT}`);
});
