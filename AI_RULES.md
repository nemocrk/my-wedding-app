# AI Rules & Project Guidelines for "My-Wedding-App"

## 1. Architettura & Infrastruttura
- **Docker Compose Orchestration**: Ogni servizio (db, backend, frontend-user, frontend-admin, nginx) gira in container isolati.
- **Isolamento DB**: Il database `wedding_db` è accessibile SOLO dalla rete interna `db_network`.
- **Adminer**: Esposto su porta 8081, funge da GUI per il DB.
- **Backend API**: Django/Gunicorn su porta 8000 interna. Espone API su `/api/admin/` (intranet) e `/api/public/` (internet).
- **Frontend User**: React (Create React App), servito da Nginx Public su porta 80/443.
- **Frontend Admin**: React (Create React App), servito da Nginx Intranet su porta 8080 (bind `127.0.0.1`).

## 2. Environment Variables & Configuration
Le variabili d'ambiente critiche sono definite in `docker-compose.yml` o `.env`.

### Backend
- `DATABASE_URL`: Stringa di connessione PostgreSQL.
- `SECRET_KEY`: Chiave segreta Django (usare valore complesso in prod).
- `DEBUG`: `True` in dev, `False` in prod.
- `ALLOWED_HOSTS`: Lista host consentiti.
- `FRONTEND_PUBLIC_URL`: URL base del frontend pubblico (es. `https://miomatrimonio.com` o `http://localhost`). Usato per generare i link di invito.

### Frontend
- `REACT_APP_API_URL`: URL base per chiamate API (differente per User e Admin).

## 3. Workflow di Sviluppo (Strict)
1.  **Analisi**: Prima di modificare, leggere il codice esistente (`cat` file).
2.  **No-Rewrite**: Non riscrivere file da zero se non strettamente necessario. Applicare patch/diff.
3.  **Testing**: Ogni feature deve essere verificata (es. `curl`, unit test se possibile).
4.  **Sicurezza**:
    - Mai esporre il DB su Internet.
    - I link pubblici devono essere firmati con Token HMAC.
    - Validare sempre gli input API.

## 4. Struttura URL & Routing
- **Backend (Django)**:
    - `/admin/`: Pannello admin Django standard.
    - `/api/admin/`: API protette per frontend-admin.
    - `/api/public/`: API pubbliche per frontend-user (session-based).
- **Frontend Admin**:
    - `/dashboard`: Statistiche.
    - `/invitations`: Lista inviti.
    - `/accommodations`: Gestione alloggi.
    - `/config`: Configurazione globale (prezzi, testi, sicurezza).

## 5. Log delle Modifiche Recenti
- Aggiunto `FRONTEND_PUBLIC_URL` al backend per generare link corretti.
- Implementata generazione link sicuri (con token) in `InvitationList`.
- Aggiunta configurazione chiave segreta in `ConfigPage`.
- Fix routing DRF per action custom (`auto-assign`).
- Fix gestione errori API frontend-user (evita sovrascrittura errori 403).
