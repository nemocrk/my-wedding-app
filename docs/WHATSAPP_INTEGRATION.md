# WhatsApp Integration Architecture

## Overview
L'integrazione WhatsApp permette di inviare notifiche transazionali agli invitati (es. link invito, conferma RSVP).
Il sistema utilizza un approccio a microservizi basato su code per gestire l'invio asincrono e rispettare i limiti imposti da WhatsApp (Rate Limiting).

## Architettura Tecnica

### Componenti
1. **Frontend Admin**: Interfaccia di gestione sessioni (QR Code) e monitoraggio code.
2. **Backend Django**: 
   - `WhatsAppMessageQueue`: Tabella di staging per i messaggi.
   - `WhatsAppWorker`: Processo background (Celery/Cron) che processa la coda.
3. **Integration Layer (WAHA)**:
   - Container Docker `devlikeapro/waha` (WhatsApp HTTP API).
   - Gestisce l'automazione browser (Puppeteer) per inviare messaggi reali.

### Configurazione Rate Limit
Il sistema implementa un meccanismo di protezione "Anti-Ban" configurabile.
Il rate limit definisce quanti messaggi possono essere inviati per ora da una singola sessione.

- **Configurazione**: Pagina `Configuration` nel Frontend Admin.
- **Campo**: `whatsapp_rate_limit`.
- **Valore Default**: 10 messaggi/ora.
- **Logica**: Il worker controlla il numero di messaggi inviati nell'ultima ora (`WhatsAppMessageEvent`) prima di processare nuovi messaggi dalla coda.

### Flusso di Invio
1. **Trigger**: Admin clicca "Invia Invito" o evento automatico.
2. **Queueing**: Messaggio salvato in `WhatsAppMessageQueue` (stato: `PENDING`).
3. **Processing**: 
   - Worker preleva messaggi `PENDING`.
   - Verifica `whatsapp_rate_limit` globale.
   - Se OK: Invia a WAHA -> Aggiorna stato `SENT`.
   - Se Rate Limit superato: Lascia in coda (o stato `SKIPPED`) e riprova al prossimo ciclo.

## API Endpoints (Admin)
- `GET /api/admin/whatsapp/{type}/status/`: Stato sessione (CONNECTED, WAITING_QR).
- `POST /api/admin/whatsapp/{type}/refresh/`: Richiede nuovo QR Code.
- `POST /api/admin/whatsapp/{type}/logout/`: Disconnette sessione.
- `POST /api/admin/whatsapp/{type}/test/`: Invia messaggio di test.

## Sicurezza
- **Nessuna esposizione pubblica**: Le API di invio sono accessibili solo dalla Intranet Admin.
- **Token**: I messaggi contengono link firmati con HMAC (`invitation_link_secret`).

## Troubleshooting
- **Sessione Disconnessa**: Usare pulsante "Verifica Stato" o "Refresh" nella dashboard.
- **Messaggi non partono**: Controllare `WhatsAppQueueDashboard` per errori o blocchi rate limit.
- **QR Code non appare**: Verificare log container `waha`.
