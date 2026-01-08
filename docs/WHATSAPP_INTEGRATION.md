# Integrazione WhatsApp - Guida Completa

Questa documentazione copre l'intera architettura dell'integrazione WhatsApp per l'invio automatizzato di inviti di matrimonio, con dashboard real-time e persistenza completa degli eventi.

## Indice

1. [Architettura Generale](#architettura-generale)
2. [Componenti](#componenti)
3. [Setup e Configurazione](#setup-e-configurazione)
4. [Dashboard e Monitoraggio](#dashboard-e-monitoraggio)
5. [Testing](#testing)
6. [Anti-Ban & Sicurezza](#anti-ban--sicurezza)
7. [Troubleshooting](#troubleshooting)

---

## Architettura Generale

```
┌────────────────────────┐
│   Frontend Admin (React) │
│  - WhatsApp Config UI    │
│  - Queue Dashboard       │
│  - SSE Real-time         │
└───────┬─────────────────┘
        │
        │ (Nginx Intranet :8080)
        │
┌───────┼─────────────────────────────────┐
│   │                                       │
│   v                                       v
│ ┌────────────────────┐    ┌─────────────────────┐
│ │  Django Backend     │    │ Integration Layer  │
│ │  (DRF API)          │    │ (Node.js Express)  │
│ │                    │    │                    │
│ │  - Queue API        │    │  - sendHumanLike()  │
│ │  - Event API        │    │  - SSE Stream       │
│ │  - Session Status   │    │  - WAHA Proxy       │
│ └────────┬───────────┘    └────────┬────────────┘
│         │                          │
│         v                          v
│ ┌───────────────┐    ┌──────────────────┐
│ │  PostgreSQL   │    │  WAHA Groom     │
│ │  - Queue      │    │  (WhatsApp API) │
│ │  - Events     │    └──────────────────┘
│ └───────────────┘    ┌──────────────────┐
│                         │  WAHA Bride     │
│                         │  (WhatsApp API) │
│                         └──────────────────┘
│
│ ┌─────────────────────────────┐
└── Worker Process (Django)     │
   - Polling Coda (60s)         │
   - Rate Limiting              │
   - Event Logging              │
   └─────────────────────────────┘
```

---

## Componenti

### 1. Backend Django

**Modelli (backend/core/models.py):**
- `WhatsAppSessionStatus`: stato connessione sessioni sposo/sposa
- `WhatsAppMessageQueue`: coda messaggi da inviare
- `WhatsAppMessageEvent`: timeline granulare eventi invio

**API (backend/whatsapp/):**
- `GET/POST /api/admin/whatsapp/{session}/status/`
- `GET /api/admin/whatsapp/{session}/qr/`
- `POST /api/admin/whatsapp/{session}/refresh/`
- `POST /api/admin/whatsapp/{session}/logout/`
- `POST /api/admin/whatsapp/{session}/test/`
- `GET /api/admin/whatsapp-queue/`
- `POST /api/admin/whatsapp-events/`

**Worker (backend/whatsapp/management/commands/run_whatsapp_worker.py):**
- Polling coda ogni 60s
- Rate limiting (10 msg/ora default)
- Log eventi DB (queued, waiting_rate_limit, rate_limit_ok, skipped, failed)

### 2. Integration Layer (Node.js)

**File: whatsapp-integration/server.js**

Funzioni principali:
- `sendHumanLike()`: sequenza invio con simulazione umana
  - sendSeen (reading)
  - Random wait 2-4s (waiting_human)
  - startTyping (typing)
  - sendText (sending)
- `emitStatus()`: emit SSE per frontend real-time
- `logEvent()`: persiste eventi su DB Django via HTTP POST

**Endpoints:**
- `GET /events` - SSE stream
- `GET /{session}/status` - proxy WAHA
- `POST /{session}/send` - invio human-like
- `POST /{session}/refresh` - QR/reconnect
- `POST /{session}/logout`

### 3. Frontend Admin (React)

**Pagina: frontend-admin/src/pages/WhatsAppConfig.jsx**
- Gestione QR code
- Logout sessioni
- Test message
- Dashboard coda integrata

**Componenti:**
- `WhatsAppQueueDashboard`: wrapper con polling 30s
- `QueueTable`: tabella messaggi con badge realtime
- Hook `useWhatsAppSSE`: connessione SSE
- Service `whatsappService`: API client

### 4. WAHA Containers

- `waha-groom`: istanza WhatsApp Web API per sposo
- `waha-bride`: istanza WhatsApp Web API per sposa
- Isolamento rete interna (`wedding-internal-network`)
- Persistenza sessioni in volume Docker

---

## Setup e Configurazione

### 1. Variabili Ambiente

**.env (root):**
```env
# WAHA API Keys
WAHA_API_KEY_GROOM=your-secret-key-groom
WAHA_API_KEY_BRIDE=your-secret-key-bride

# Integration Layer
WA_INTEGRATION_URL=http://whatsapp-integration:3000
DJANGO_API_URL=http://backend:8000/api/admin

# Worker
WAHA_WORKER_INTERVAL=60
```

### 2. Django Migrations

```bash
# Genera migration per WhatsAppMessageEvent
docker-compose exec backend python manage.py makemigrations

# Applica migrations
docker-compose exec backend python manage.py migrate

# Verifica
docker-compose exec backend python manage.py showmigrations whatsapp
```

### 3. Avvio Servizi

```bash
# Build e start completo
docker-compose up -d --build

# Start worker separato (se non in docker-compose)
docker-compose exec backend python manage.py run_whatsapp_worker
```

### 4. Configurazione GlobalConfig

Accedi al Django Admin (`http://localhost:8080/admin/`) e configura:
- `whatsapp_groom_number`: numero telefono sposo (es. 39333111222)
- `whatsapp_bride_number`: numero telefono sposa
- `whatsapp_rate_limit`: messaggi/ora (default: 10)
- `whatsapp_typing_simulation`: true/false

### 5. QR Code Pairing

1. Vai su `http://localhost:8080/whatsapp`
2. Click "Collega Account" per sposo/sposa
3. Scansiona QR code con WhatsApp mobile
4. Attendi stato "Connesso"

---

## Dashboard e Monitoraggio

Vedi documentazione dettagliata: [whatsapp-queue-dashboard.md](./whatsapp-queue-dashboard.md)

**Funzionalità chiave:**
- Badge real-time (reading, typing, sending) via SSE
- Fallback stato DB (pending, sent, failed)
- Retry messaggi falliti
- Force send (bypass rate limit)
- Visualizzazione tentativi ed errori

**Indicatori UI:**
- 👀 Reading... (blu)
- ⏳ Human Wait (indaco)
- ⌨️ Typing... (viola)
- 🚀 Sending... (arancione)
- ✅ Sent (verde)
- ❌ Failed (rosso)

---

## Testing

### Backend (Pytest)

```bash
# Run all WhatsApp tests
docker-compose exec backend pytest whatsapp/tests.py -v

# Test specifici
docker-compose exec backend pytest whatsapp/tests.py::TestWhatsAppWorker -v
```

**Copertura:**
- Worker rate limiting logic
- Event persistence
- API endpoints (status, queue, events)

### Frontend (Jest/RTL)

```bash
cd frontend-admin

# Run tutti i test WhatsApp
npm test -- whatsapp

# Con coverage
npm test -- --coverage whatsapp
```

**File di test:**
- `useWhatsAppSSE.test.jsx`: SSE connection e parsing
- `QueueTable.test.jsx`: rendering badge e stati
- `WhatsAppQueueDashboard.test.jsx`: azioni e polling

### Test Manuale End-to-End

1. Crea messaggio test:
   ```bash
   curl -X POST http://localhost:8080/api/admin/whatsapp/groom/test/
   ```

2. Verifica worker logs:
   ```bash
   docker-compose logs -f backend | grep "WhatsApp Worker"
   ```

3. Verifica integration logs:
   ```bash
   docker-compose logs -f whatsapp-integration | grep "DB Event"
   ```

4. Verifica SSE stream (browser DevTools > Network > events)

5. Controlla DB:
   ```sql
   SELECT * FROM core_whatsappmessageevent ORDER BY timestamp DESC LIMIT 20;
   ```

---

## Anti-Ban & Sicurezza

### Strategie Anti-Ban

1. **Rate Limiting Aggressivo**
   - Max 10 messaggi/ora per sessione (configurabile)
   - Tracking su finestra mobile di 60 minuti
   - Skip automatico se limite raggiunto

2. **Simulazione Umana**
   - `sendSeen` prima di rispondere
   - Random wait 2-4s tra azioni
   - Typing duration proporzionale a lunghezza testo
   - `startTyping` / `stopTyping` naturali

3. **Best Practices**
   - Invia solo a contatti che hanno scritto per primi
   - Evita messaggi bulk identici
   - Usa template personalizzati con placeholder
   - Non superare 50 messaggi/giorno per numero

### Sicurezza di Rete

1. **Isolamento WAHA**
   - Container su rete interna isolata
   - Nessuna esposizione pubblica diretta
   - Comunicazione solo via Integration Layer

2. **Nginx Reverse Proxy**
   - Intranet-only (porta 8080)
   - No CORS su endpoint admin
   - Rate limiting Nginx (opzionale)

3. **API Keys**
   - WAHA protetto con X-Api-Key header
   - Keys in environment variables
   - Mai committate in git

---

## Troubleshooting

### Problema: Worker non parte

**Sintomi:** Messaggi pending non processati

**Soluzioni:**
1. Verifica worker running:
   ```bash
   docker-compose ps | grep backend
   ```

2. Check logs:
   ```bash
   docker-compose logs backend | tail -50
   ```

3. Restart worker:
   ```bash
   docker-compose restart backend
   ```

### Problema: SSE non si connette

**Sintomi:** Badge non aggiornano, "disconnected" in UI

**Soluzioni:**
1. Verifica Nginx config:
   ```bash
   docker-compose exec nginx cat /etc/nginx/nginx.conf | grep whatsapp-service
   ```

2. Test endpoint diretto:
   ```bash
   curl http://localhost:8080/api/whatsapp-service/health
   ```

3. Check browser console (CORS errors?)

4. Verifica porta 8080 accessibile da rete intranet

### Problema: Eventi non persistono

**Sintomi:** Timeline vuota, no eventi in DB

**Soluzioni:**
1. Verifica migration:
   ```bash
   docker-compose exec backend python manage.py showmigrations
   ```

2. Check API events:
   ```bash
   curl -X POST http://localhost:8000/api/admin/whatsapp-events/ \
     -H "Content-Type: application/json" \
     -d '{"queue_message": 1, "phase": "sent"}'
   ```

3. Logs Integration Layer:
   ```bash
   docker-compose logs whatsapp-integration | grep "Failed to log"
   ```

### Problema: QR Code non si genera

**Sintomi:** Modal vuoto o spinner infinito

**Soluzioni:**
1. Verifica container WAHA:
   ```bash
   docker-compose ps waha-groom waha-bride
   ```

2. Restart WAHA:
   ```bash
   docker-compose restart waha-groom waha-bride
   ```

3. Check API direct:
   ```bash
   curl http://whatsapp-integration:3000/groom/qr
   ```

4. Volume permissions:
   ```bash
   docker-compose exec waha-groom ls -la /app/.waha-sessions
   ```

### Problema: Messaggi stuck in "processing"

**Sintomi:** Stato rimane "processing" senza mai completare

**Soluzioni:**
1. Check timeout HTTP:
   - Worker timeout: aumenta a 60s in `run_whatsapp_worker.py`
   - Integration timeout: verifica axios timeout in `server.js`

2. Verifica Integration Layer risponde:
   ```bash
   docker-compose logs whatsapp-integration --tail=100
   ```

3. Force retry:
   ```bash
   curl -X POST http://localhost:8080/api/admin/whatsapp-queue/{id}/force-send/
   ```

---

## Risorse Aggiuntive

- [WAHA Documentation](https://waha.devlike.pro/)
- [whatsapp-queue-dashboard.md](./whatsapp-queue-dashboard.md) - Dashboard dettagli
- [AI_RULES.md](../AI_RULES.md) - Linee guida sviluppo AI
- [README.md](../README.md) - Setup progetto generale

---

## Changelog Feature

### v1.0.0 (2026-01-06)
- ✅ Dual session support (groom/bride)
- ✅ Human-like sending simulation
- ✅ Rate limiting (10 msg/h)
- ✅ Queue management con retry
- ✅ Real-time SSE dashboard
- ✅ Event persistence (timeline granulare)
- ✅ Unit tests (backend + frontend)
- ✅ Comprehensive documentation
