# WhatsApp - Dashboard Coda (Frontend Admin)

Questa sezione descrive come funziona la dashboard di monitoraggio **real-time** dell'invio messaggi WhatsApp, integrata nel `frontend-admin`.

## Obiettivo

- Visualizzare lo stato persistito a DB della coda (`WhatsAppMessageQueue`).
- Visualizzare in **tempo reale** l'azione in corso su ciascun messaggio durante l'invio human-like (`reading`, `waiting_rate`, `typing`, `sending`).
- Persistere **timeline completa** degli eventi di invio nel modello `WhatsAppMessageEvent` per analisi e debugging.

## Architettura

### Modelli Django

#### `WhatsAppMessageQueue`
- Coda asincrona dei messaggi da inviare
- Stati: `pending`, `processing`, `sent`, `failed`, `skipped`
- Gestito dal worker Django (`run_whatsapp_worker`)

#### `WhatsAppMessageEvent` (Nuovo)
- Timeline granulare di ogni fase di invio
- Fasi tracciate:
  - **Worker Django:**
    - `queued`: messaggio prelevato dalla coda
    - `waiting_rate_limit`: in attesa per rate limit
    - `rate_limit_ok`: rate limit superato, procede
    - `skipped`: saltato per rate limit
  - **Integration Layer (Node.js):**
    - `reading`: invio sendSeen per marcare come letto
    - `waiting_human`: pausa umana casuale (2-4s)
    - `typing`: simulazione digitazione (basata su lunghezza testo)
    - `sending`: invio effettivo del messaggio
    - `sent`: messaggio inviato con successo
  - **Errori:**
    - `failed`: fallimento con dettagli in metadata

- Campi:
  - `queue_message`: FK a `WhatsAppMessageQueue`
  - `phase`: enum fase corrente
  - `timestamp`: timestamp automatico
  - `duration_ms`: durata fase (opzionale)
  - `metadata`: JSONField per dati extra (es. error_detail, typing_duration_ms, rate_limit_remaining)

### Flusso Completo

```
[Worker Django]
1. Preleva messaggio pending -> Log: QUEUED
2. Verifica rate limit
   - Se limite raggiunto -> Log: WAITING_RATE_LIMIT + SKIPPED
   - Altrimenti -> Log: RATE_LIMIT_OK
3. Chiama Integration Layer (HTTP POST) passando queue_id

[Integration Layer Node.js]
4. Riceve richiesta con queue_id
5. Log DB: READING -> sendSeen
6. Log DB: WAITING_HUMAN -> sleep(random 2-4s) + Emit SSE
7. Log DB: TYPING -> startTyping + sleep(calc) + Emit SSE
8. Log DB: SENDING -> sendText + Emit SSE
9. Log DB: SENT + duration totale + Emit SSE

[Frontend]
10. SSE stream aggiorna UI in realtime (badge dinamici)
11. Polling DB ogni 30s per sincronizzazione fallback
```

## Componenti Frontend

- `frontend-admin/src/pages/WhatsAppConfig.jsx`
  - Pagina di gestione WhatsApp (QR, logout, test message).
  - Integra la dashboard della coda in fondo pagina.

- `frontend-admin/src/components/whatsapp/WhatsAppQueueDashboard.jsx`
  - Polling della coda ogni 30s (fallback / sincronizzazione DB).
  - Mostra indicatore connessione SSE.

- `frontend-admin/src/components/whatsapp/QueueTable.jsx`
  - Tabella con badge stato.
  - **Priorità allo stato realtime (SSE)** se presente negli ultimi 2 minuti.
  - Fallback allo stato DB (`status` field).

- `frontend-admin/src/hooks/useWhatsAppSSE.js`
  - Connessione a SSE e mantenimento dello stato in memoria.
  - Gestisce eventi `message_status` e aggiorna mappa `chatId -> status`.

- `frontend-admin/src/services/whatsappService.js`
  - Client Axios per API Admin (queue + actions).

## API Utilizzate

### Django Backend

#### Coda Messaggi
- `GET /api/admin/whatsapp-queue/`
  - Lista messaggi coda con eventi correlati (prefetch)
  - Serializer include nested `events`

- `POST /api/admin/whatsapp-queue/retry-failed/`
  - Riprova tutti i messaggi failed

- `POST /api/admin/whatsapp-queue/{id}/force-send/`
  - Forza invio immediato (bypassa rate limit)

#### Eventi
- `POST /api/admin/whatsapp-events/`
  - Crea nuovo evento (chiamato da Integration Layer)
  - Body: `{ queue_message, phase, duration_ms, metadata }`

- `GET /api/admin/whatsapp-events/?queue_message={id}`
  - Lista eventi per messaggio specifico

### Node.js Integration Layer

- `GET /api/whatsapp-service/events`
  - Server-Sent Events stream
  - Event payload:
    ```json
    {
      "type": "message_status",
      "session": "groom",
      "chatId": "39333111222@c.us",
      "status": "typing",
      "timestamp": "2026-01-06T12:00:00Z"
    }
    ```

- `POST /api/whatsapp-service/{session}/send`
  - Invio messaggio human-like
  - Body: `{ phone, message, queue_id }`
  - Logga eventi su DB durante l'esecuzione

## Nginx / Proxy

Per permettere la connessione SSE dal browser (intranet), Nginx espone il service node attraverso:

```nginx
location /api/whatsapp-service/ {
    proxy_pass http://whatsapp-integration:3000/;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
}
```

## Deployment / Migration

### 1. Creare Migration Django

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

Questo creerà la tabella `core_whatsappmessageevent` con:
- FK a `core_whatsappmessagequeue`
- Campo `phase` (VARCHAR 30)
- Indici su `queue_message` + `timestamp` e `phase`

### 2. Riavviare Servizi

```bash
docker-compose restart backend whatsapp-integration
```

### 3. Verificare Log

Worker Django:
```bash
docker-compose logs -f backend
# Deve mostrare: "[DB Event] Logged queued for queue_id=X"
```

Integration Layer:
```bash
docker-compose logs -f whatsapp-integration
# Deve mostrare: "[DB Event] Logged reading for queue_id=X"
```

## Testing

### Unit Test Backend (Pytest)

```bash
docker-compose exec backend pytest whatsapp/tests.py -v
```

Test coperti:
- Creazione eventi durante worker loop
- Verifica persistenza timeline completa
- Rate limit logging

### Unit Test Frontend (Jest)

```bash
cd frontend-admin
npm test -- --coverage whatsapp
```

Test coperti:
- `useWhatsAppSSE.test.jsx`: connessione SSE e parsing eventi
- `QueueTable.test.jsx`: rendering badge (realtime vs DB)
- `WhatsAppQueueDashboard.test.jsx`: azioni e polling

## Note sui Due Wait

### Wait #1: Rate-Limit (Worker Django)
- **Dove:** Worker Django prima di chiamare Integration
- **Durata:** Variabile (fino al prossimo slot disponibile)
- **Log DB:** `WAITING_RATE_LIMIT` + `SKIPPED` se bloccato
- **Metadata:** `sent_count`, `limit`, `reason`

### Wait #2: Human-Like (Node.js)
- **Dove:** Function `sendHumanLike` in Integration Layer
- **Durata:** 2-4s random
- **Log DB:** `WAITING_HUMAN`
- **SSE:** Emette `waiting_human` per UI realtime
- **Metadata:** `wait_ms`

## Troubleshooting

### SSE Non Si Connette
1. Verifica Nginx: `docker-compose logs nginx`
2. Check proxy pass: `curl http://localhost:8080/api/whatsapp-service/health`
3. Firewall: assicurati che porta 8080 sia accessibile da rete intranet

### Eventi Non Persistono
1. Verifica migration: `docker-compose exec backend python manage.py showmigrations`
2. Check permission API: endpoint `/api/admin/whatsapp-events/` deve essere `AllowAny`
3. Log Integration: `docker-compose logs whatsapp-integration | grep "DB Event"`

### Badge Realtime Non Aggiornano
1. Console browser: verifica stream SSE attivo
2. Check `useWhatsAppSSE` hook: stato `connectionStatus` deve essere `connected`
3. Verifica chatId format: deve essere `{numero}@c.us`
