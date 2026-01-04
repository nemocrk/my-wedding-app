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

### Multi-Stage Build
Tutti i Dockerfile utilizzano pattern multi-stage per:
1. **Riduzione dimensioni immagini**: Layer finale production non contiene build tools
2. **Sicurezza**: Separazione netta dev/prod dependencies
3. **Caching efficace**: Dipendenze installate prima del codice sorgente

#### Backend Dockerfile
- **Stage Base**: Python slim + dipendenze sistema (gcc, libpq-dev, gosu)
- **Stage Development**: Pip install completo + hot-reload
- **Stage Production**: Gunicorn + utente non-root

**Gestione Permessi**:
- Container parte come `root` per fix permessi volumi
- `entrypoint.sh` esegue `chown` su `/app/staticfiles` e `/app/media`
- Processo finale (Gunicorn) gira come `appuser` via `gosu`

#### Frontend Dockerfile (User & Admin)
- **Stage Build**: Node alpine + `npm ci` (incluse devDeps per Vite)
- **Stage Production**: Nginx alpine + copia `dist/` compilato
- **Stage Development**: Node alpine + Vite dev server

**Ottimizzazione Build**:
- `.dockerignore` esclude `venv/`, `.git/`, `node_modules/` locali
- Cache npm/pip dependencies in layer separati

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

## 3. Continuous Integration/Continuous Deployment

### GitHub Actions Workflow
File: `.github/workflows/test-automation.yml`

**Trigger Events**:
- Push su branch `main`
- Pull Request verso `main`

**Pipeline Architecture**:
```
backend-tests ----\
                   \
frontend-user-tests --> e2e-tests --> deploy (future)
                   /
frontend-admin-tests
```

**Job Details**:

#### 1. Backend Tests
- **Runner**: `ubuntu-latest`
- **Database**: PostgreSQL 15 (GitHub service container)
- **Steps**:
  1. Checkout repository
  2. Setup Python 3.11 con cache pip
  3. Install dependencies (`requirements.txt`)
  4. Run `pytest --cov=core --cov-report=xml`
  5. Upload coverage artifact (retention: 7 giorni)

#### 2. Frontend User Tests
- **Runner**: `ubuntu-latest`
- **Node Version**: 20.x
- **Steps**:
  1. Checkout repository
  2. Setup Node.js con cache npm
  3. Install dependencies
  4. Run `npm test -- --coverage --watchAll=false`
  5. Upload coverage artifact

#### 3. Frontend Admin Tests
- Identico a Frontend User, diversa working directory

#### 4. E2E Tests (Playwright)
- **Runner**: `ubuntu-latest`
- **Prerequisites**: `needs: [backend-tests, frontend-user-tests, frontend-admin-tests]`
- **Docker**: Setup Buildx con cache layers
- **Steps**:
  1. Checkout repository
  2. Setup Docker Buildx
  3. Cache Docker layers per velocità
  4. Generate `.env` file per CI:
     ```bash
     BUILD_TARGET=production
     DB_PASSWORD=test_password_ci
     DJANGO_SECRET_KEY=test_secret_ci
     ALLOWED_HOSTS=localhost,127.0.0.1
     ```
  5. Build immagini: `docker compose build`
  6. Start stack: `docker compose up -d`
  7. Wait for healthy:
     ```bash
     timeout 120 bash -c 'until [ "$(docker compose ps --services --filter "health=healthy" | wc -l)" -eq 6 ]; do sleep 5; done'
     ```
  8. Install Playwright browsers
  9. Run E2E suite: `npx playwright test`
  10. Upload artifacts su failure:
      - Screenshots (retention: 3 giorni)
      - Video (retention: 3 giorni)
      - HTML report (retention: 7 giorni)
  11. Cleanup: `docker compose down -v`

**Optimizations**:
- **Parallelizzazione**: Backend e frontend tests girano simultaneamente
- **Fail Fast**: E2E non parte se unit tests falliscono
- **Caching Layers**:
  - Pip dependencies (cache key: `requirements.txt` hash)
  - Npm dependencies (cache key: `package-lock.json` hash)
  - Docker layers (cache key: `Dockerfile` hash)

### Monitoring & Alerts
- **GitHub Status Checks**: Richiesti per merge su `main`
- **Annotations**: Errori pytest/jest mostrati inline nel codice
- **Artifacts**: Downloadabili da Actions tab per 7 giorni

### Performance Metrics (Target)
- **Backend Unit Tests**: < 30s
- **Frontend Tests** (each): < 60s
- **E2E Suite**: < 10 minuti
- **Pipeline Totale**: < 15 minuti

## 4. Configurazione AI & Sviluppo

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

## 5. Variabili d'Ambiente (`.env`)

| Variabile | Descrizione | Default (Dev) | Produzione |
|---|---|---|---|
| `BUILD_TARGET` | Target build Docker (`development`/`production`) | `production` | `production` |
| `DB_PASSWORD` | Password PostgreSQL | `changeme` | **Secure Random** |
| `DJANGO_SECRET_KEY` | Chiave crittografica Django | `dev-key` | **Secure Random** |
| `ALLOWED_HOSTS` | Host header whitelist | `localhost` | `miodominio.com` |
| `REACT_APP_API_URL` | Base URL API Pubbliche | `http://localhost/api` | `https://...` |
| `DEBUG` | Modalità debug Django | `True` | `False` |

## 6. Deployment (Future)

### Pre-Production Checklist
- [ ] `.env` file con credenziali sicure
- [ ] `DEBUG=False` in production
- [ ] Certificati SSL validi in `/nginx/certs`
- [ ] Backup automatico database (cron job)
- [ ] Monitoring (Sentry, Prometheus)
- [ ] Rate limiting su API pubbliche

### Recommended Hosting
- **VPS**: DigitalOcean, AWS EC2, Hetzner
- **Container Orchestration**: Docker Compose (small scale) o Kubernetes (scale)
- **Database**: PostgreSQL gestito (AWS RDS, DigitalOcean Managed DB)
- **CDN**: Cloudflare per static assets

## 7. Troubleshooting DevOps

### "vite: not found" durante build
**Causa**: `npm ci --only=production` non installa devDependencies  
**Fix**: Rimosso flag `--only=production` nello stage build Dockerfile

### "Permission denied: /app/staticfiles"
**Causa**: Volume Docker creato come root  
**Fix**: `entrypoint.sh` esegue `chown` e usa `gosu` per drop privileges

### E2E tests timeout in CI
**Causa**: Servizi non healthy prima di avvio test  
**Fix**: Loop wait per `docker compose ps` con filtro `health=healthy`

### Docker build lento in CI
**Causa**: No cache layers  
**Fix**: Setup Docker Buildx con `cache-from` e `cache-to` su GitHub Actions cache

### Backend healthcheck fallisce
**Causa**: Endpoint `/health/` non risponde  
**Fix**: Verificare che Django sia avviato completamente, aumentare `start_period` a 40s
