const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const bodyParser = require('body-parser');
const events = require('events');

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

// SSE Event Emitter
const sseEmitter = new events.EventEmitter();

app.use(bodyParser.json());

// CORS headers per SSE
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Configurazione Ambiente
const WAHA_URLS = {
  groom: process.env.WAHA_GROOM_URL || 'http://waha-groom:3000',
  bride: process.env.WAHA_BRIDE_URL || 'http://waha-bride:3000'
};

const WAHA_API_KEYS = {
  groom: process.env.WAHA_API_KEY_GROOM,
  bride: process.env.WAHA_API_KEY_BRIDE
};

// --- HELPERS ---

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function emitStatus(sessionType, chatId, status) {
    const eventData = { 
        type: 'message_status',
        session: sessionType,
        chatId: chatId,
        status: status, // 'reading', 'waiting_rate', 'typing', 'sending'
        timestamp: new Date().toISOString()
    };
    sseEmitter.emit('status_update', eventData);
    console.log(`[SSE] Emitted: ${JSON.stringify(eventData)}`);
}

async function sendHumanLike(wahaUrl, sessionType, chatId, text) {
    const apiKey = WAHA_API_KEYS[sessionType]; 
    const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

    console.log(`[${sessionType}] Starting Human-Like sequence for ${chatId}`);

    const SESSION_NAME = 'default';

    // 1. MARK AS SEEN (New Step)
    emitStatus(sessionType, chatId, 'reading');
    try {
        // WAHA endpoint: POST /api/sendSeen
        await axios.post(`${wahaUrl}/api/sendSeen`, { chatId, session: SESSION_NAME }, { headers });
        console.log(`[${sessionType}] Marked as seen for ${chatId}`);
    } catch (e) {
        console.warn(`[${sessionType}] Failed sendSeen: ${e.message}`);
    }

    // 2. RANDOM DELAY (Waiting Rate)
    emitStatus(sessionType, chatId, 'waiting_rate');
    await sleep(Math.floor(Math.random() * 2000) + 2000);

    // 3. START TYPING
    emitStatus(sessionType, chatId, 'typing');
    try {
        await axios.post(`${wahaUrl}/api/startTyping`, { chatId, session: SESSION_NAME }, { headers });
    } catch (e) {
        console.warn(`[${sessionType}] Failed startTyping: ${e.message}`);
    }

    // Calculate typing duration based on text length
    const typingTime = Math.min((text.length * 40) + 500, 15000);
    await sleep(typingTime);

    // 4. STOP TYPING
    try {
        await axios.post(`${wahaUrl}/api/stopTyping`, { chatId, session: SESSION_NAME }, { headers });
    } catch (e) {
        console.warn(`[${sessionType}] Failed stopTyping: ${e.message}`);
    }

    // 5. SEND MESSAGE
    emitStatus(sessionType, chatId, 'sending');
    const result = await axios.post(`${wahaUrl}/api/sendText`, {
        chatId,
        text,
        session: SESSION_NAME
    }, { headers });
    
    emitStatus(sessionType, chatId, 'sent');
    return result;
}

// --- ENDPOINTS ---

// SSE Stream Endpoint
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    res.write('retry: 10000\n\n'); // Reconnect every 10s

    const listener = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sseEmitter.on('status_update', listener);

    req.on('close', () => {
        sseEmitter.removeListener('status_update', listener);
    });
});

// GET /:session_type/status
app.get('/:session_type/status', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  if (!wahaUrl) return res.status(400).json({ error: 'Invalid session type' });

  try {
    const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
    const response = await axios.get(`${wahaUrl}/api/sessions/default`, {
      headers,
      timeout: 5000
    });
    
    const data = response.data;
    let state = 'disconnected';
    if (data.status === 'WORKING') state = 'connected';
    else if (data.status === 'SCAN_QR_CODE') state = 'waiting_qr';
    else if (data.status === 'STARTING') state = 'connecting';
    else if (data.status === 'STOPPED') state = 'disconnected';
    
    // FETCH PROFILE INFO (incluso picture) se connesso
    if (state === 'connected') {
        try {
            // WAHA API ufficiale: GET /api/{session}/profile
            const profileResp = await axios.get(`${wahaUrl}/api/default/profile`, { 
                headers, 
                timeout: 3000 
            });
            
            if (profileResp.data) {
                data.me = { 
                    ...data.me, 
                    ...profileResp.data,
                    pushName: profileResp.data.name || data.me?.pushName 
                };
            }
        } catch (e) {
            console.warn(`Failed to fetch profile: ${e.message}`);
        }
    }

    res.json({ state, raw: data });
  } catch (error) {
    res.json({ state: 'error', error: error.message });
  }
});

// GET /:session_type/qr
app.get('/:session_type/qr', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  try {
    const response = await axios.get(`${wahaUrl}/api/default/auth/qr`, {
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
app.post('/:session_type/refresh', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  try {
    const statusUrl = `${wahaUrl}/api/sessions/default`; 
    const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
    
    let status = 'UNKNOWN';
    try {
        const s = await axios.get(statusUrl, { headers, timeout: 5000 });
        status = s.data.status;
    } catch (e) {
        status = 'STOPPED';
    }

    if (status === 'WORKING') {
      return res.json({ state: 'connected' });
    }
    
    if (status === 'SCAN_QR_CODE') {
       const qrResp = await axios.get(`${wahaUrl}/api/default/auth/qr`, { 
          headers, responseType: 'arraybuffer' 
       });
       const b64 = Buffer.from(qrResp.data, 'binary').toString('base64');
       return res.json({ state: 'waiting_qr', qr_code: `data:image/png;base64,${b64}` });
    }

    try {
        await axios.post(`${wahaUrl}/api/sessions/default/start`, {}, { headers });
        return res.json({ state: 'connecting', message: 'Session start triggered' });
    } catch (e) {
        return res.json({ state: 'error', error: 'Failed to start session: ' + e.message });
    }

  } catch (error) {
    res.status(500).json({ state: 'error', error: error.message });
  }
});

// POST /:session_type/logout
app.post('/:session_type/logout', async (req, res) => {
    const { session_type } = req.params;
    const wahaUrl = WAHA_URLS[session_type];
    
    if (!wahaUrl) return res.status(400).json({ error: 'Invalid session' });

    try {
        const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
        
        // Timeout aggressivi per evitare che la richiesta si impalli lato Django
        
        // 1. Try Logout (3s timeout)
        try {
             await axios.post(`${wahaUrl}/api/sessions/default/logout`, {}, { headers, timeout: 3000 });
        } catch (e) {
            console.warn(`Logout warn (proceeding anyway): ${e.message}`);
        }
        
        await sleep(500); // Ridotto sleep a 0.5s

        // 2. Try Stop (4s timeout)
        try {
            await axios.post(`${wahaUrl}/api/sessions/default/stop`, {}, { headers, timeout: 4000 });
        } catch (e) {
             console.warn(`Stop warn (proceeding anyway): ${e.message}`);
        }

        // Restituisce sempre successo per permettere all'utente di resettare lo stato lato UI
        res.json({ state: 'disconnected', message: 'Logged out successfully' });
    } catch (error) {
        console.error(`Logout fatal error for ${session_type}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});


// POST /:session_type/send
app.post('/:session_type/send', async (req, res) => {
    const { session_type } = req.params;
    const { phone, message } = req.body;
    const wahaUrl = WAHA_URLS[session_type];

    if (!wahaUrl) return res.status(400).json({ error: 'Invalid session' });
    if (!phone || !message) return res.status(400).json({ error: 'Missing params' });

    try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const chatId = `${cleanPhone}@c.us`;
        
        // Send asynchronously to not block response? 
        // No, we want to await to confirm 'sent' status, but statuses are streamed.
        
        await sendHumanLike(wahaUrl, session_type, chatId, message);
        
        res.json({ status: 'sent', timestamp: new Date() });
    } catch (error) {
        console.error(`Error sending to ${phone}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Integration Service running on port ${PORT}`);
});
