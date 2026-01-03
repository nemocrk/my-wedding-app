# DevOps & Configuration Guide

Questa sezione documenta l'infrastruttura DevOps, le configurazioni dei gateway e le regole operative per l'assistenza AI.

## 1. Orchestrazione Docker

L'infrastruttura è definita in `docker-compose.yml` e orchestra 6 servizi interconnessi ma isolati.

### Gestione Reti (Network Isolation)
Il sistema utilizza 4 reti bridge per garantire il principio del minimo privilegio:

| Network Name | Tipologia | Scopo | Servizi Connessi |
|---|---|---|---|
| `db_network` | **Internal** | Isolamento Database | `db`, `backend`, `adminer` |
| `backend_network` | **Internal** | API Communication | `backend`, `nginx-public`, `nginx-intranet` |
| `frontend_public_network` | Public | Traffico Internet | `nginx-public`, `frontend-user` |
| `frontend_intranet_network` | Localhost | Traffico Admin | `nginx-intranet`, `frontend-admin`, `adminer` |

**Nota:** Le reti `internal: true` non hanno accesso a Internet in uscita (outbound), garantendo che il DB non possa "chiamare casa" o essere esposto accidentalmente.

### Healthchecks
Ogni servizio critico implementa healthchecks nativi per garantire un avvio ordinato (`depends_on: condition: service_healthy`).
- **Backend**: Verifica `curl http://localhost:8000/health/`.
- **Database**: Verifica `pg_isready`.
- **Frontend**: Verifica disponibilità server statico (Nginx interno al container).

## 2. Gateway Configuration (Nginx)

### Nginx Public (`nginx/public.conf`)
- **Ruolo**: Reverse Proxy per traffico internet.
- **Porte**: 80 (HTTP), 443 (HTTPS - se certs presenti).
- **Routing**:
    - `/` → `frontend-user` (React App).
    - `/api/public/` → `backend` (Django API).
    - `/static/`, `/media/` → Volumi condivisi.
- **Sicurezza**: Non espone mai `/admin` o `/api/admin/`.

### Nginx Intranet (`nginx/intranet.conf`)
- **Ruolo**: Gateway amministrativo.
- **Binding**: Solo su `127.0.0.1` (Localhost).
- **Accesso Remoto**: Richiede Tunnel SSH o VPN.
- **Routing**:
    - `/` → `frontend-admin` (React Dashboard).
    - `/api/admin/` → `backend` (Django API private).
    - `/admin/` → `backend` (Django Admin classico).
    - `:8081` (via Docker) → `adminer`.

## 3. Configurazione AI & Sviluppo

Il repository include configurazioni specifiche per guidare gli assistenti AI (Copilot, Continue) verso gli standard di qualità del progetto.

### Regole Globali (`AI_RULES.md`)
Definisce i 5 pilastri inviolabili:
1.  **Assessment**: Leggere prima di scrivere.
2.  **No-Rewriting**: Evoluzione incrementale.
3.  **Documentation**: Aggiornamento contestuale dei file `/docs`.
4.  **Testing**: Unit, Smoke e Non-Regression test obbligatori.
5.  **DB Governance**: Migrazioni esplicite.

### GitHub Copilot (`.github/copilot-instructions.md`)
Istruzioni specifiche per l'autocompletamento:
- Stile Python (PEP8, Type Hints).
- Stile React (Functional Components, Hooks).
- Focus sulla sicurezza (mai hardcodare password).

### Continue (`.continue/system_prompt.md`)
Prompt di sistema per l'IDE Assistant locale:
- **Environment**: WSL 2 (Ubuntu).
- **Workflow**: Analisi -> Implementazione -> **TESTING OBBLIGATORIO**.
- **Tech Stack**: DRF, React + Framer Motion/Heatmap.js.

## 4. Variabili d'Ambiente (`.env`)

| Variabile | Descrizione | Default (Dev) | Produzione |
|---|---|---|---|
| `BUILD_TARGET` | Target build Docker (`development`/`production`) | `production` | `production` |
| `DB_PASSWORD` | Password PostgreSQL | `changeme` | **Secure Random** |
| `DJANGO_SECRET_KEY` | Chiave crittografica Django | `dev-key` | **Secure Random** |
| `ALLOWED_HOSTS` | Host header whitelist | `localhost` | `miodominio.com` |
| `REACT_APP_API_URL` | Base URL API Pubbliche | `http://localhost/api` | `https://...` |
