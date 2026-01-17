# DevOps & Configuration Guide

Questa sezione documenta l'infrastruttura DevOps, le configurazioni dei gateway e le regole operative per l'assistenza AI.

## 1. Orchestrazione Docker

L'infrastruttura è definita in `docker-compose.yml` e orchestra 10 servizi interconnessi ma isolati.

### Gestione Reti (Network Isolation)
Il sistema utilizza 5 reti bridge per garantire il principio del minimo privilegio:

| Network Name | Tipologia | Scopo | Servizi Connessi |
|---|---|---|---|
| `db_network` | **Internal** | Isolamento Database | `db`, `backend`, `adminer`, `backend-worker` |
| `backend_network` | **Internal** | API Communication | `backend`, `nginx-public`, `nginx-intranet`, `whatsapp-integration` |
| `frontend_public_network` | Public | Traffico Internet | `nginx-public`, `frontend-user` |
| `frontend_intranet_network` | Localhost | Traffico Admin | `nginx-intranet`, `frontend-admin`, `adminer` |
| `whatsapp_intranet_network` | **Internal** | Isolamento WhatsApp | `waha-groom`, `waha-bride`, `whatsapp-integration`, `backend-worker` |

**Nota:** Le reti `internal: true` non hanno accesso a Internet in uscita (outbound), garantendo che il DB non possa "chiamare casa" o essere esposto accidentalmente.

### Healthchecks
Ogni servizio critico implementa healthchecks nativi per garantire un avvio ordinato (`depends_on: condition: service_healthy`).
- **Backend**: Verifica `curl http://localhost:8000/health/`.
- **Database**: Verifica `pg_isready`.
- **Frontend**: Verifica disponibilità server statico (Nginx interno al container).
- **WAHA**: Utilizza check interno API.

### Multi-Stage Build
Tutti i Dockerfile utilizzano pattern multi-stage per:
1. **Riduzione dimensioni immagini**: Layer finale production non contiene build tools
2. **Sicurezza**: Separazione netta dev/prod dependencies
3. **Caching efficace**: Dipendenze installate prima del codice sorgente

## 1.1 Sviluppo Locale (Hot Reload)

Per sviluppare con ricaricamento automatico (Hot Reload) senza dover ricostruire i container ad ogni modifica, utilizzare la configurazione override `docker-compose.dev.yml`.

### Avvio in modalità Development
Eseguire il comando combinando i due file di configurazione:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Cosa cambia rispetto alla Produzione?
1.  **Backend**: Passa da `gunicorn` a `manage.py runserver`.
2.  **WhatsApp Integration**: Server Node.js con volume montato per modifiche live.
3.  **WAHA Dashboard**: Esposte le dashboard di debug su porte 3001/3002.

## 5. Variabili d'Ambiente (`.env`)

| Variabile | Descrizione | Default (Dev) | Produzione |
|---|---|---|---|
| `BUILD_TARGET` | Target build Docker (`development`/`production`) | `production` | `production` |
| `DB_PASSWORD` | Password PostgreSQL | `changeme` | **Secure Random** |
| `DJANGO_SECRET_KEY` | Chiave crittografica Django | `dev-key` | **Secure Random** |
| `ALLOWED_HOSTS` | Host header whitelist | `localhost` | `miodominio.com` |
| `VITE_GOOGLE_FONTS_API_KEY` | Google Web Fonts API key (Font Picker Admin) | *(empty)* | **Restricted Key** |
| `WAHA_API_KEY_GROOM` | API Key per sessione Sposo | `secret` | **Secure Random** |
| `WAHA_API_KEY_BRIDE` | API Key per sessione Sposa | `secret` | **Secure Random** |
| `WAHA_WORKER_INTERVAL` | Intervallo check coda messaggi (sec) | `60` | `60` |
