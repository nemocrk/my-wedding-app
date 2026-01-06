# WhatsApp - Dashboard Coda (Frontend Admin)

Questa sezione descrive come funziona la dashboard di monitoraggio **real-time** dell'invio messaggi WhatsApp, integrata nel `frontend-admin`.

## Obiettivo

- Visualizzare lo stato persistito a DB della coda (`WhatsAppMessageQueue`).
- Visualizzare in **tempo reale** l'azione in corso su ciascun messaggio durante l'invio human-like (`reading`, `waiting_rate`, `typing`, `sending`).

## Componenti Frontend

- `frontend-admin/src/pages/WhatsAppConfig.jsx`
  - Pagina di gestione WhatsApp (QR, logout, test message).
  - Integra la dashboard della coda in fondo pagina.

- `frontend-admin/src/components/whatsapp/WhatsAppQueueDashboard.jsx`
  - Polling della coda ogni 30s (fallback / sincronizzazione DB).

- `frontend-admin/src/components/whatsapp/QueueTable.jsx`
  - Tabella con badge stato.
  - Priorità allo stato realtime (SSE) se presente.

- `frontend-admin/src/hooks/useWhatsAppSSE.js`
  - Connessione a SSE e mantenimento dello stato in memoria.

- `frontend-admin/src/services/whatsappService.js`
  - Client Axios per API Admin (queue + actions).

## API Utilizzate

### Django (DB)

- `GET /api/admin/whatsapp-queue/`
- `POST /api/admin/whatsapp-queue/retry-failed/`
- `POST /api/admin/whatsapp-queue/{id}/force-send/`

### Node (Real-time)

- `GET /api/whatsapp-service/events`
  - Server-Sent Events.
  - Event payload:
    - `{ type: 'message_status', session, chatId, status, timestamp }`

## Nginx / Proxy

Per permettere la connessione SSE dal browser (intranet), Nginx espone il service node attraverso:

- `location /api/whatsapp-service/ { proxy_pass http://whatsapp-integration:3000/; ... }`

## Note sui due wait

- **Wait Rate-Limit (DB / Worker):** gestito dal worker Django (stato DB `pending`/`skipped`).
- **Wait Human-Like (Node / sendHumanLike):** gestito dall'integration layer ed emesso su SSE con `waiting_rate`.
