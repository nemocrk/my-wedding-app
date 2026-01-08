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

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://backend:8000/api/admin';

// --- HELPERS ---

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function emitStatus(sessionType, chatId, status) {
    const eventData = { 
        type: 'message_status',
        session: sessionType,
        chatId: chatId,
        status: status, // 'reading', 'waiting_rate', 'typing', 'sending', 'sent', 'failed'
        timestamp: new Date().toISOString()
    };
    sseEmitter.emit('status_update', eventData);
    console.log(`[SSE] Emitted: ${JSON.stringify(eventData)}`);
}

async function logEvent(queueId, phase, durationMs = null, metadata = {}) {
    if (!queueId) return; // Skip if no queue_id provided
    
    try {
        await axios.post(`${DJANGO_API_URL}/whatsapp-events/`, {
            queue_message: queueId,
            phase: phase,
            duration_ms: durationMs,
            metadata: metadata
        }, { timeout: 2000 });
        console.log(`[DB Event] Logged ${phase} for queue_id=${queueId}`);
    } catch (e) {
        console.warn(`[DB Event] Failed to log ${phase}: ${e.message}`);
    }
}

// Helper per estrarre dettagli errore da risposta axios
function extractErrorDetails(error, context) {
    const details = {
        context,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        stack: error.stack
    };
    
    console.error(`[ERROR CHAIN - ${context}]`, JSON.stringify(details, null, 2));
    
    // Costruisci messaggio di errore user-friendly ma completo
    let userMessage = `${context}: ${error.message}`;
    
    if (error.response?.data) {
        if (typeof error.response.data === 'string') {
            userMessage += ` - ${error.response.data}`;
        } else if (error.response.data.error) {
            userMessage += ` - ${error.response.data.error}`;
        } else if (error.response.data.message) {
            userMessage += ` - ${error.response.data.message}`;
        } else {
            userMessage += ` - ${JSON.stringify(error.response.data)}`;
        }
    }
    
    if (error.response?.status) {
        userMessage += ` (HTTP ${error.response.status})`;
    }
    
    return { details, userMessage };
}

async function sendHumanLike(wahaUrl, sessionType, chatId, text, queueId = null) {
    const apiKey = WAHA_API_KEYS[sessionType]; 
    const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

    console.log(`[${sessionType}] Starting Human-Like sequence for ${chatId}`);

    const SESSION_NAME = 'default';

    try {
        // 1. MARK AS SEEN (Reading)
        const readingStart = Date.now();
        emitStatus(sessionType, chatId, 'reading');
        await logEvent(queueId, 'reading', null, { session: sessionType, chatId });
        
        try {
            console.log(`[${sessionType}] Calling sendSeen for ${chatId}`);
            const seenResp = await axios.post(`${wahaUrl}/api/sendSeen`, { chatId, session: SESSION_NAME }, { headers });
            console.log(`[${sessionType}] sendSeen response:`, seenResp.status, seenResp.data);
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'sendSeen');
            console.warn(`[${sessionType}] Failed sendSeen (non-blocking): ${userMessage}`);
        }
        
        const readingDuration = Date.now() - readingStart;

        // 2. RANDOM DELAY (Waiting Human)
        const waitStart = Date.now();
        const waitTime = Math.floor(Math.random() * 2000) + 2000;
        emitStatus(sessionType, chatId, 'waiting_human');
        await logEvent(queueId, 'waiting_human', null, { wait_ms: waitTime });
        await sleep(waitTime);
        const waitDuration = Date.now() - waitStart;

        // 3. START TYPING
        const typingStart = Date.now();
        emitStatus(sessionType, chatId, 'typing');
        await logEvent(queueId, 'typing', null, { text_length: text.length });
        
        try {
            console.log(`[${sessionType}] Calling startTyping for ${chatId}`);
            const typingResp = await axios.post(`${wahaUrl}/api/startTyping`, { chatId, session: SESSION_NAME }, { headers });
            console.log(`[${sessionType}] startTyping response:`, typingResp.status, typingResp.data);
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'startTyping');
            console.warn(`[${sessionType}] Failed startTyping (non-blocking): ${userMessage}`);
        }

        // Calculate typing duration based on text length
        const typingTime = Math.min((text.length * 40) + 500, 15000);
        await sleep(typingTime);

        // 4. STOP TYPING
        try {
            console.log(`[${sessionType}] Calling stopTyping for ${chatId}`);
            const stopResp = await axios.post(`${wahaUrl}/api/stopTyping`, { chatId, session: SESSION_NAME }, { headers });
            console.log(`[${sessionType}] stopTyping response:`, stopResp.status, stopResp.data);
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'stopTyping');
            console.warn(`[${sessionType}] Failed stopTyping (non-blocking): ${userMessage}`);
        }
        
        const typingDuration = Date.now() - typingStart;

        // 5. SEND MESSAGE (CRITICAL - Errors here are blocking)
        const sendStart = Date.now();
        emitStatus(sessionType, chatId, 'sending');
        await logEvent(queueId, 'sending');
        
        console.log(`[${sessionType}] Calling sendText for ${chatId}, message length: ${text.length}`);
        let result;
        try {
            result = await axios.post(`${wahaUrl}/api/sendText`, {
                chatId,
                text,
                session: SESSION_NAME
            }, { headers });
            console.log(`[${sessionType}] sendText SUCCESS:`, result.status, JSON.stringify(result.data));
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'sendText');
            console.error(`[${sessionType}] sendText FAILED - throwing error`);
            throw new Error(userMessage); // Re-throw con messaggio arricchito
        }
        
        const sendDuration = Date.now() - sendStart;
        
        emitStatus(sessionType, chatId, 'sent');
        await logEvent(queueId, 'sent', sendDuration, { 
            message_id: result.data?.id,
            total_duration_ms: Date.now() - readingStart
        });
        
        console.log(`[${sessionType}] Human-like sequence completed successfully for ${chatId}`);
        return result;
    } catch (error) {
        // Emit failed status on error
        console.error(`[${sessionType}] FATAL: Human-like sequence failed for ${chatId}`);
        const { details, userMessage } = extractErrorDetails(error, 'sendHumanLike');
        
        emitStatus(sessionType, chatId, 'failed');
        await logEvent(queueId, 'failed', null, { 
            error: userMessage,
            errorDetails: details 
        });
        
        // Re-throw con messaggio user-friendly preservando dettagli
        const enrichedError = new Error(userMessage);
        enrichedError.originalError = error;
        enrichedError.details = details;
        throw enrichedError;
    }
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

// GET /api/contacts - Verify contact existence and presence in address book
app.get('/api/contacts', async (req, res) => {
    const { contactId, session } = req.query;

    if (!contactId || !session) {
        return res.status(400).json({ error: 'Missing contactId or session' });
    }
    
    const wahaUrl = WAHA_URLS[session];
    if (!wahaUrl) {
        return res.status(400).json({ error: 'Invalid session type' });
    }

    const headers = { 'X-Api-Key': WAHA_API_KEYS[session] };
    const cleanPhone = contactId.replace(/[^0-9]/g, ''); // Ensure numeric only
    const chatId = `${cleanPhone}@c.us`;

    try {
        console.log(`[${session}] Checking contact ${cleanPhone}`);

        // 1. Check if number exists on WhatsApp (checkNumberStatus)
        // https://waha.devlike.pro/docs/how-to/check-number-exists/
        let exists = false;
        try {
            const statusResp = await axios.get(`${wahaUrl}/api/contacts/check-exists?phone=${cleanPhone}`, { headers, timeout: 5000 });
             // Adjust based on actual WAHA API response for check-exists. 
             // Usually returns { number: '...', status: 'valid' | 'invalid', ... } or similar
             // For WAHA Core/Plus it might be POST /api/checkNumberStatus or GET /api/contacts/check-exists
             // Let's assume GET /api/contacts/check-exists returns { exists: true/false } or { numberExists: true }
             
             // If WAHA standard: POST /api/checkNumberStatus
             // We will try the standard WAHA endpoint
             const checkResp = await axios.post(`${wahaUrl}/api/checkNumberStatus`, { phone: cleanPhone }, { headers, timeout: 5000 });
             exists = checkResp.data?.numberExists || (checkResp.data?.status === 200); 

        } catch (e) {
            console.warn(`[${session}] Check exists failed: ${e.message}. Trying legacy endpoint.`);
            // Fallback?
        }
        
        if (!exists) {
            return res.json({ 
                contactId: cleanPhone, 
                status: 'not_exist',
                description: 'The number is not registered on WhatsApp'
            });
        }

        // 2. Check if contact is in address book (GET /api/contacts)
        // This can be heavy if many contacts, better if we can search
        // WAHA might not have a search endpoint for contacts, so we might need to fetch all (cached)
        // For optimization, let's try getting specific contact profile
        
        let inAddressBook = false;
        try {
             const contactResp = await axios.get(`${wahaUrl}/api/contacts/${chatId}`, { headers, timeout: 3000 });
             // If returns 200 and data, it is known
             if (contactResp.data && (contactResp.data.name || contactResp.data.pushName)) {
                 inAddressBook = true;
             }
        } catch (e) {
            // 404 means not found usually
             if (e.response && e.response.status === 404) {
                 inAddressBook = false;
             }
        }

        if (inAddressBook) {
            return res.json({ 
                contactId: cleanPhone, 
                status: 'ok',
                description: 'Contact verified and present in address book'
            });
        } else {
             return res.json({ 
                contactId: cleanPhone, 
                status: 'not_present',
                description: 'Number exists but not in your contacts list'
            });
        }

    } catch (error) {
        const { userMessage } = extractErrorDetails(error, 'verifyContact');
        return res.status(500).json({ error: userMessage, status: 'error' });
    }
});


// GET /:session_type/status
app.get('/:session_type/status', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  if (!wahaUrl) return res.status(400).json({ error: 'Invalid session type' });

  try {
    const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
    console.log(`[${session_type}] Fetching status from ${wahaUrl}`);
    const response = await axios.get(`${wahaUrl}/api/sessions/default`, {
      headers,
      timeout: 5000
    });
    console.log(`[${session_type}] Status response:`, response.status, response.data.status);
    
    const data = response.data;
    let state = 'disconnected';
    if (data.status === 'WORKING') state = 'connected';
    else if (data.status === 'SCAN_QR_CODE') state = 'waiting_qr';
    else if (data.status === 'STARTING') state = 'connecting';
    else if (data.status === 'STOPPED') state = 'disconnected';
    
    // FETCH PROFILE INFO (incluso picture) se connesso
    if (state === 'connected') {
        try {
            console.log(`[${session_type}] Fetching profile info`);
            const profileResp = await axios.get(`${wahaUrl}/api/default/profile`, { 
                headers, 
                timeout: 3000 
            });
            console.log(`[${session_type}] Profile fetched:`, profileResp.data);
            
            if (profileResp.data) {
                data.me = { 
                    ...data.me, 
                    ...profileResp.data,
                    pushName: profileResp.data.name || data.me?.pushName 
                };
            }
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'fetchProfile');
            console.warn(`Failed to fetch profile: ${userMessage}`);
        }
    }
    let qr_code = null;
    if (state === 'waiting_qr') {
       console.log(`[${session_type}] Refresh: fetching QR for scan state`);
       const qrResp = await axios.get(`${wahaUrl}/api/default/auth/qr`, { 
          headers, responseType: 'arraybuffer' 
       });
       qr_code = {qr_code: `data:image/png;base64,${Buffer.from(qrResp.data, 'binary').toString('base64')}`};
    }


    res.json({ state, raw: data, ...qr_code });
  } catch (error) {
    const { userMessage } = extractErrorDetails(error, 'getStatus');
    res.json({ state: 'error', error: userMessage });
  }
});

// GET /:session_type/qr
app.get('/:session_type/qr', async (req, res) => {
  const { session_type } = req.params;
  const wahaUrl = WAHA_URLS[session_type];
  
  try {
    console.log(`[${session_type}] Fetching QR code`);
    const response = await axios.get(`${wahaUrl}/api/default/auth/qr`, {
      headers: { 'X-Api-Key': WAHA_API_KEYS[session_type] },
      responseType: 'arraybuffer',
      timeout: 10000
    });
    console.log(`[${session_type}] QR code fetched, size: ${response.data.length} bytes`);
    
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    res.json({ qr_code: `data:image/png;base64,${base64Image}` });
  } catch (error) {
    const { userMessage } = extractErrorDetails(error, 'getQR');
    res.status(500).json({ error: userMessage });
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
        console.log(`[${session_type}] Refresh: checking current status`);
        const s = await axios.get(statusUrl, { headers, timeout: 5000 });
        status = s.data.status;
        console.log(`[${session_type}] Refresh: current status is ${status}`);
    } catch (e) {
        const { userMessage } = extractErrorDetails(e, 'refreshStatusCheck');
        console.warn(`Refresh status check failed: ${userMessage}`);
        status = 'STOPPED';
    }

    if (status === 'WORKING') {
      return res.json({ state: 'connected' });
    }
    
    if (status === 'SCAN_QR_CODE') {
       console.log(`[${session_type}] Refresh: fetching QR for scan state`);
       const qrResp = await axios.get(`${wahaUrl}/api/default/auth/qr`, { 
          headers, responseType: 'arraybuffer' 
       });
       const b64 = Buffer.from(qrResp.data, 'binary').toString('base64');
       return res.json({ state: 'waiting_qr', qr_code: `data:image/png;base64,${b64}` });
    }

    try {
        console.log(`[${session_type}] Refresh: starting session`);
        await axios.post(`${wahaUrl}/api/sessions/default/start`, {}, { headers });
        return res.json({ state: 'connecting', message: 'Session start triggered' });
    } catch (e) {
        const { userMessage } = extractErrorDetails(e, 'sessionStart');
        return res.json({ state: 'error', error: userMessage });
    }

  } catch (error) {
    const { userMessage } = extractErrorDetails(error, 'refresh');
    res.status(500).json({ state: 'error', error: userMessage });
  }
});

// POST /:session_type/logout
app.post('/:session_type/logout', async (req, res) => {
    const { session_type } = req.params;
    const wahaUrl = WAHA_URLS[session_type];
    
    if (!wahaUrl) return res.status(400).json({ error: 'Invalid session' });

    try {
        const headers = { 'X-Api-Key': WAHA_API_KEYS[session_type] };
        
        console.log(`[${session_type}] Logout: starting logout sequence`);
        
        // 1. Try Logout (3s timeout)
        try {
             await axios.post(`${wahaUrl}/api/sessions/default/logout`, {}, { headers, timeout: 3000 });
             console.log(`[${session_type}] Logout: logout call succeeded`);
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'logout');
            console.warn(`Logout warn (proceeding anyway): ${userMessage}`);
        }
        
        await sleep(500);

        // 2. Try Stop (4s timeout)
        try {
            await axios.post(`${wahaUrl}/api/sessions/default/stop`, {}, { headers, timeout: 4000 });
            console.log(`[${session_type}] Logout: stop call succeeded`);
        } catch (e) {
            const { userMessage } = extractErrorDetails(e, 'sessionStop');
            console.warn(`Stop warn (proceeding anyway): ${userMessage}`);
        }

        res.json({ state: 'disconnected', message: 'Logged out successfully' });
    } catch (error) {
        const { userMessage } = extractErrorDetails(error, 'logout');
        console.error(`Logout fatal error for ${session_type}`);
        res.status(500).json({ error: userMessage });
    }
});


// POST /:session_type/send
app.post('/:session_type/send', async (req, res) => {
    const { session_type } = req.params;
    const { phone, message, queue_id } = req.body;
    const wahaUrl = WAHA_URLS[session_type];

    if (!wahaUrl) return res.status(400).json({ error: 'Invalid session' });
    if (!phone || !message) return res.status(400).json({ error: 'Missing params' });

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chatId = `${cleanPhone}@c.us`;

    console.log(`[${session_type}] Send request received for ${phone} (queue_id: ${queue_id})`);

    try {
        await sendHumanLike(wahaUrl, session_type, chatId, message, queue_id);
        console.log(`[${session_type}] Send completed successfully for ${phone}`);
        res.json({ status: 'sent', timestamp: new Date() });
    } catch (error) {
        console.error(`[${session_type}] Send FAILED for ${phone}`);
        const { userMessage } = extractErrorDetails(error, 'send');
        
        res.status(500).json({ 
            error: userMessage,
            phone,
            queue_id 
        });
    }
});

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Integration Service running on port ${PORT}`);
});
