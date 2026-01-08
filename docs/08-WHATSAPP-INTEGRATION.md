# WhatsApp Integration Strategy & Architecture

## 1. Overview
Questa integrazione permette la comunicazione bidirezionale (in scenario "Broadcast Light") tra gli sposi e gli invitati tramite WhatsApp, utilizzando [WAHA (WhatsApp HTTP API)](https://waha.devlike.pro/).

L'architettura è progettata per rispettare rigorosamente le politiche anti-spam di WhatsApp ed evitare il ban dei numeri personali, utilizzando una versione Free di WAHA che richiede container separati per sessione.

## 2. Anti-Blocking Strategy (Strict Compliance)
Seguendo le linee guida [WAHA Avoid Blocking](https://waha.devlike.pro/docs/overview/%EF%B8%8F-how-to-avoid-blocking/), abbiamo implementato le seguenti misure:

### A. Architettura "Queue-Worker" Asincrona
Per disaccoppiare la richiesta di invio dall'effettiva esecuzione e gestire i ritmi:
- I messaggi non vengono inviati immediatamente.
- Vengono salvati in una coda database (`WhatsAppMessageQueue`).
- Un worker background processa la coda rispettando i limiti temporali.

### B. Human-Like Behavior Simulation (Automatic)
Il layer di integrazione Node.js esegue questa sequenza per OGNI messaggio:
1. **Mark as Seen**: Conferma lettura se si sta rispondendo.
2. **Initial Delay**: Pausa casuale (2-5 secondi).
3. **Typing Simulation**: Invia evento "Sta scrivendo..." per una durata variabile basata sulla lunghezza del testo (es. 0.3s per carattere).
4. **Final Pause**: Breve pausa post-typing.
5. **Send Message**: Invio effettivo.

### C. Rate Limiting Intelligente
- **Soft Limit**: Configurazione in Backend per "Messaggi per Ora" (es. 10 msg/h).
- **Hard Limit**: Il worker verifica il timestamp dell'ultimo invio al destinatario.
- **Cool-down**: Se il limite è raggiunto, il messaggio resta in coda "Pending" fino allo slot successivo.

### D. Activation Flow
- **Nessun primo contatto**: Il sistema non invia mai messaggi a freddo.
- **Frontend Button**: Nella pagina invito (lato posteriore lettera), un bottone "Contatta su WhatsApp" apre `wa.me/` per far iniziare la conversazione all'invitato.

## 3. Architettura Tecnica

### Docker Containers
| Servizio | Immagine | Ruolo |
|----------|----------|-------|
| `waha-groom` | `devlikeapro/waha:latest` | Sessione WhatsApp Sposo (Core Free) |
| `waha-bride` | `devlikeapro/waha:latest` | Sessione WhatsApp Sposa (Core Free) |
| `whatsapp-worker` | `backend` (Django Command) | Processa la coda messaggi |
| `whatsapp-integration` | Node.js | Proxy unificato + Typing Simulation Logic |

### Database Schema (Nuovi Modelli)
- `WhatsAppSessionStatus`: Monitoraggio stato connessione (Connected/Disconnected/QR).
- `WhatsAppMessageQueue`: Coda invii con priorità e scheduling.
- `GlobalConfig`: Aggiunta campi per numeri telefono e configurazione rate limits.

### Flusso Dati
1. **Admin** scrive messaggio -> Django salva in `WhatsAppMessageQueue` (Status: PENDING).
2. **Worker** (cron/loop) controlla coda -> Se rate limit OK -> POST a `whatsapp-integration`.
3. **Integration** simula typing -> POST a `waha-X` -> WAHA invia a WhatsApp Server.

## 4. Configurazione Environment
Nel file `.env` aggiungere:
```env
WAHA_API_KEY_GROOM=generated_secure_key_1
WAHA_API_KEY_BRIDE=generated_secure_key_2
WAHA_WORKER_INTERVAL=60  # Secondi tra check coda
```
