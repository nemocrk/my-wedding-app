[![Full Stack Test Suite](https://github.com/nemocrk/my-wedding-app/actions/workflows/test-automation.yml/badge.svg)](https://github.com/nemocrk/my-wedding-app/actions/workflows/test-automation.yml)
# Wedding Invitation & RSVP Tracking System

## Panoramica
Applicazione web a microservizi per la gestione delle partecipazioni di matrimonio digitali.
Il sistema offre un'esperienza utente unica (apertura busta animata) e una console di amministrazione avanzata per il monitoraggio degli invitati e l'analisi comportamentale (heatmap).

**Novità**: Supporto multilingua (i18n) e CMS per la personalizzazione dei testi.

## 📚 Documentazione Tecnica Completa

**OBBLIGATORIA PER SVILUPPATORI E AI:** Consultare `/docs` prima di ogni modifica.

| File | Descrizione |
|---|---|
| [**01-ARCHITECTURE.md**](docs/01-ARCHITECTURE.md) | Panoramica del sistema, Docker, Reti e Flusso Dati |
| [**02-DATABASE.md**](docs/02-DATABASE.md) | Schema ER, Modelli e Relazioni SQL |
| [**03-BACKEND.md**](docs/03-BACKEND.md) | Struttura progetto Django e convenzioni |
| [**04-FRONTEND.md**](docs/04-FRONTEND.md) | Overview tecnologica React (User & Admin) |
| [**05-DEVOPS.md**](docs/05-DEVOPS.md) | Configurazione Nginx, Docker Compose e CI/CD |
| [**06-BACKEND-CORE.md**](docs/06-BACKEND-CORE.md) | Deep Dive su Business Logic e Models |
| [**07-BACKEND-API.md**](docs/07-BACKEND-API.md) | Serializers, Views e Autenticazione API |
| [**08-FRONTEND-USER.md**](docs/08-FRONTEND-USER-COMPONENTS.md) | Componenti e Logica App Pubblica |
| [**09-FRONTEND-ADMIN.md**](docs/09-FRONTEND-ADMIN-COMPONENTS.md) | Componenti e Logica Dashboard Gestionale |
| [**USER_GUIDE_TEXT.md**](docs/USER_GUIDE_TEXT_CUSTOMIZATION.md) | **NUOVO**: Guida utente per modifica testi |
| [**I18N_GUIDE.md**](docs/I18N_GUIDE.md) | **NUOVO**: Guida sviluppatori per traduzioni |
| [**REMOTE_DEBUGGING.md**](docs/REMOTE_DEBUGGING.md) | **🔥 NUOVO**: Debug remoto Python con VS Code |
| [**PGBOUNCER.md**](docs/PGBOUNCER.md) | Connection Pooling PostgreSQL con pgBouncer |
| [**CHECKLIST.md**](docs/CHECKLIST_TEXT_CUSTOMIZATION_I18N.md) | Tracking feature i18n |

**Regola d'oro**: Ogni modifica al codice richiede l'aggiornamento della documentazione corrispondente.

## Architettura
Il progetto è strutturato come monorepo dockerizzato con i seguenti servizi:

1.  **Database (PostgreSQL):** Persistenza dati (invitati, RSVP, tracking analytics). **Isolato da Internet** tramite rete `db_network` interna.
2.  **pgBouncer (Connection Pooler):** Gestisce il pool di connessioni tra Backend Django e PostgreSQL (25 connessioni pool vs 200 client). Previene l'errore "too many clients" di PostgreSQL.
3.  **Adminer (DB GUI):** Interfaccia web leggera per gestione database PostgreSQL. Accessibile su porta 8081.
4.  **Backend (Django + DRF):** API REST. Gestisce logica di business, autenticazione e raccolta dati di tracking. **Non accessibile direttamente dall'esterno** - solo tramite nginx.
5.  **Frontend User (React):** Esposto su **Internet** tramite `nginx-public`. Mostra l'invito animato. Accesso tramite query param univoco.
    - **Features**: i18n (IT/EN), CMS dinamico, Animazione busta.
6.  **Frontend Admin (React):** Esposto **SOLO su localhost:8080** tramite `nginx-intranet`. Dashboard per gestione adesioni e visualizzazione Heatmap/Navigazione. **Richiede SSH tunnel o VPN per accesso remoto**.
    - **Features**: Gestione CMS, Grafici, Logistica, WhatsApp integration.
7.  **Nginx Public:** Gateway Internet che espone solo frontend-user e API pubbliche su porta 80/443.
8.  **Nginx Intranet:** Gateway amministrativo che espone frontend-admin su `127.0.0.1:8080`.

### Isolamento di Rete

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                            │
└───────────────┬─────────────────────────────────────────┘
              │ :80/:443
              ▼
      ┌───────────────┐
      │ nginx-public  │
      └───────┬────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌────────────┐    ┌────────────┐          ┌────────────┐
│ frontend-  │    │  backend   │◄─────────┤ adminer    │
│   user     │    │   (API)    │          │ :8081      │
└────────────┘    └─────┬───────┘          └─────┬───────┘
                        │                       │
                        ▼                       │
                  ┌─────────────┐               │
                  │ pgBouncer  │               │
                  │ (Pooler)  │               │
                  └─────┬───────┘               │
                        │                       │
                        ▼                       │
                  ┌──────────┐        ┌──────┬───────┘
                  │    DB    │◄───────┤ db_network   │
                  │ (isolato)│        │ (internal)   │
                  └──────────┘        └──────────────┘
                                      │
┌────────────────────────────────┐ │
│  INTRANET (localhost only)     │ │
└────────┬───────────────────────┘ │
         │ :8080                      │
         ▼                            │
   ┌─────────────┐                   │
   │nginx-intra  │                   │
   └──────┬───────┘                   │
          │                            │
          ▼                            │
    ┌──────────┐                     │
    │frontend- │─────────────────────┘
    │  admin   │
    └──────────┘
```

## Regole di Sviluppo (STRICT)
Vedi **[AI_RULES.md](./AI_RULES.md)** per le regole obbligatorie di sviluppo AI.

In sintesi:
1.  **Unit Tests:** Test isolati per la singola funzione/componente.
2.  **Smoke Tests:** Verifica base che l'applicazione si avvii e gli endpoint critici rispondano.
3.  **Non-Regression Tests:** Verifica che le nuove modifiche non rompano funzionalità esistenti.
4.  **Logging:** Log parlanti e strutturati su stdout.
5.  **Gestione Errori:** Modali frontend per errori API, niente `alert()`.
6.  **Documentazione:** Aggiornamento obbligatorio dei file `/docs` per ogni modifica al codice.
7.  **i18n:** Tutti i testi UI devono usare chiavi di traduzione (no hardcoded strings).

## Prerequisiti & Ambiente di Sviluppo

Il progetto è ottimizzato per il deployment su Linux.
**Per sviluppatori Windows:**
È **obbligatorio** utilizzare **WSL 2** (Windows Subsystem for Linux).
1.  Assicurati che Docker Desktop sia configurato con il backend WSL 2.
2.  Clona ed esegui il progetto all'interno del file system di WSL (es. `~/projects/wedding-app`), NON nel file system di Windows (`/mnt/c/...`).
3.  Usa VS Code con l'estensione "WSL" per editare il codice.
4.  Installa NodeJS: 
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm list-remote
nvm install <CHOOSEN VERSION>
```
5. Installa Docker su WSL:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh ./get-docker.sh
sudo systemctl enable --now docker.service
```
6. Aggiungi l'utente al gruppo docker:
```bash
sudo groupadd docker
sudo usermod -aG docker $USER
```
N.B. Riavvia la WSL se il seguente comando non funziona
```bash
docker run hello-world
```

## Quick Start

### 1. Configurazione Ambiente

```bash
# Clona il repository
git clone https://github.com/nemocrk/my-wedding-app.git
cd my-wedding-app

# Copia e configura le variabili d'ambiente
cp .env.example .env

# Modifica .env con i tuoi parametri
nano .env
```

### 2. Avvio Sviluppo (Development)

```bash
# Imposta BUILD_TARGET=development nel .env
echo "BUILD_TARGET=development" >> .env

# Avvia i servizi con hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# I servizi saranno disponibili su:
# - Frontend User: http://localhost (porta 80)
# - Frontend Admin: http://localhost:8080
# - Adminer (DB): http://localhost:8081
# - Backend API: accessibile tramite nginx (hot-reload attivo)
```

### 3. Avvio Produzione (Production)

```bash
# Imposta BUILD_TARGET=production nel .env
echo "BUILD_TARGET=production" >> .env

# Build e avvio ottimizzato
docker-compose up -d --build

# Verifica stato servizi
docker-compose ps

# Visualizza logs
docker-compose logs -f
```

## 🐞 Debug Remoto (VS Code)

Per eseguire il debug step-by-step del backend Python in esecuzione dentro Docker:

### Quick Start Debug

```bash
# 1. Rendi eseguibile lo script helper
chmod +x debug.sh

# 2. Avvia lo stack in modalità debug
./debug.sh start

# 3. In VS Code, premi F5 e seleziona "Python: Remote Attach (Backend Container)"
```

Lo script `debug.sh` gestisce automaticamente:
- Avvio Docker Compose con configurazione debug
- Esposizione porta debugger (5678)
- Lancio di `debugpy` in modalità wait-for-client

### Comandi Helper Disponibili

```bash
./debug.sh start      # Avvia debug stack
./debug.sh stop       # Ferma debug stack
./debug.sh restart    # Riavvia backend
./debug.sh logs       # Mostra logs backend
./debug.sh rebuild    # Rebuilda backend (dopo cambio requirements)
./debug.sh shell      # Apri shell nel container
./debug.sh test       # Esegui test Django
./debug.sh migrate    # Esegui migrazioni
./debug.sh status     # Mostra stato stack e porte
```

### Debugging Workflow Completo

1. **Inserisci Breakpoint**: Clicca sulla linea desiderata in un file `.py` dentro `backend/`
2. **Avvia Debug**: Premi `F5` in VS Code
3. **Triggera l'Endpoint**: Fai una richiesta HTTP all'API
4. **Step Through**: Usa `F10` (step over), `F11` (step into), `Shift+F11` (step out)

Per una guida completa, consulta [**docs/REMOTE_DEBUGGING.md**](docs/REMOTE_DEBUGGING.md).

## Accesso Database (Adminer)

Adminer è disponibile su `http://localhost:8081`.
- **Sistema:** PostgreSQL
- **Server:** `db` (NON localhost)
- **Utente:** `postgres`
- **Password:** Vedi `.env` (default: `changeme_in_prod`)
- **Database:** `wedding_db`

## Accesso Admin Remoto

Il frontend admin è accessibile **SOLO** su `127.0.0.1:8080` per sicurezza.

### Opzione 1: SSH Tunnel (Raccomandato)

```bash
# Dal tuo computer locale, crea un tunnel SSH verso il server
# Mappa anche la porta 8081 per Adminer se necessario
ssh -L 8080:localhost:8080 -L 8081:localhost:8081 user@your-server.com

# Ora puoi accedere all'admin dal tuo browser:
# Admin: http://localhost:8080
# Adminer: http://localhost:8081
```

### Opzione 2: VPN

Configura una VPN per accedere alla rete interna del server.

### Opzione 3: IP Whitelist

Decommenta e configura la sezione whitelist in `nginx/intranet.conf`:

```nginx
allow 192.168.1.0/24;    # La tua subnet
allow 10.0.0.0/8;        # VPN range
deny all;
```

## Gestione Servizi

```bash
# Stop tutti i servizi
docker-compose down

# Stop con rimozione volumi (ATTENZIONE: cancella il database!)
docker-compose down -v

# Rebuild singolo servizio
docker-compose up -d --build backend

# Accesso shell container
docker-compose exec backend bash
docker-compose exec frontend-user sh

# Visualizza logs specifico servizio
docker-compose logs -f backend

# Esegui migrazioni Django (in caso di problemi automatici)
docker-compose exec backend python manage.py makemigrations core
docker-compose exec backend python manage.py migrate

# Crea superuser Django
docker-compose exec backend python manage.py createsuperuser
```

## Testing

```bash
# Backend tests (Unit & Smoke)
docker-compose exec backend python manage.py test core

# Frontend user tests
docker-compose exec frontend-user npm test

# Frontend admin tests
docker-compose exec frontend-admin npm test

# Coverage report
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report

# pgBouncer connection pooling load test
python tests/load_test_connections.py
```

## Struttura Directory

```
my-wedding-app/
├── backend/                # Django backend
│   ├── Dockerfile         # Multi-stage: development/production
│   ├── requirements.txt   # Python dependencies
│   └── ...
├── frontend-user/         # React invito pubblico
│   ├── Dockerfile         # Multi-stage build
│   ├── src/
│   └── ...
├── frontend-admin/        # React dashboard admin
│   ├── Dockerfile         # Multi-stage build
│   ├── src/
│   └── ...
├── nginx/                 # Configurazioni nginx
│   ├── public.conf        # Gateway Internet
│   ├── intranet.conf      # Gateway Admin
│   └── certs/             # Certificati SSL
├── docs/                  # Documentazione tecnica completa
│   ├── 01-ARCHITECTURE.md
│   ├── 02-DATABASE.md
│   ├── PGBOUNCER.md       # Connection pooling guide
│   ├── REMOTE_DEBUGGING.md # Debug remoto Python
│   └── ...
├── .vscode/               # Configurazioni VS Code
│   ├── launch.json        # Debug configurations
│   ├── tasks.json         # Automated tasks
│   └── settings.json      # Workspace settings
├── tests/                 # Test suite monorepo
│   └── load_test_connections.py  # pgBouncer load test
├── docker-compose.yml     # Orchestrazione servizi
├── docker-compose.dev.yml # Override per sviluppo locale
├── docker-compose.debug.yml # Override per debug remoto
├── debug.sh               # Helper script per debug workflow
├── .env.example           # Template variabili ambiente
├── AI_RULES.md            # Regole sviluppo AI (Test, Log, Errori)
└── README.md             # Questo file
```

## Deployment Produzione

### 1. Preparazione Server

```bash
# Installa Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configurazione SSL (Let's Encrypt)

```bash
# Installa certbot
sudo apt-get update
sudo apt-get install certbot

# Ottieni certificato
sudo certbot certonly --standalone -d yourdomain.com

# Copia certificati in nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/
```

### 3. Variabili Produzione

Modifica `.env` con valori produzione:

```env
BUILD_TARGET=production
DJANGO_SECRET_KEY=<genera-random-key>
DB_PASSWORD=<password-forte>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
REACT_APP_API_URL=https://yourdomain.com/api
```

### 4. Deploy

```bash
docker-compose up -d --build

# Setup iniziale database
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic --noinput
```

## Troubleshooting

### PostgreSQL "too many clients already"

Se vedi errori `psycopg2.OperationalError: sorry, too many clients already`:

```bash
# Verifica connessioni attive PostgreSQL
docker exec my-wedding-app-db-1 psql -U postgres -d wedding_db \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Verifica pool pgBouncer
docker exec my-wedding-app-pgbouncer-1 psql -h 127.0.0.1 -p 5432 -U postgres -d pgbouncer \
  -c "SHOW POOLS;"

# Controlla log pgBouncer
docker logs my-wedding-app-pgbouncer-1

# Se il problema persiste, aumenta DEFAULT_POOL_SIZE in docker-compose.yml:
# PGBOUNCER_DEFAULT_POOL_SIZE: 50  # da 25

# Riavvia il servizio
docker-compose restart pgbouncer backend
```

**Soluzione permanente**: Il progetto ora utilizza pgBouncer per il connection pooling. Vedi [docs/PGBOUNCER.md](docs/PGBOUNCER.md) per dettagli.

### DB Relation does not exist
Se vedi errori `relation "core_invitation" does not exist`:
```bash
docker-compose exec backend python manage.py makemigrations core
docker-compose exec backend python manage.py migrate
```

### Adminer/Admin non raggiungibile

```bash
# Verifica porte aperte
netstat -tlnp | grep 8080
netstat -tlnp | grep 8081

# Controlla log container
docker-compose logs adminer
```

### Backend non risponde

```bash
# Verifica healthcheck
docker-compose ps backend

# Accedi ai logs
docker-compose logs backend

# Testa endpoint direttamente
docker-compose exec backend curl http://localhost:8000/health/
```

### Problemi permessi file

```bash
# Fix permessi (da WSL)
sudo chown -R $USER:$USER .
```

## Contribuire

1. Fork il progetto
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. **Scrivi i test** per le nuove funzionalità
4. **Aggiorna la documentazione** in `/docs` se modifichi logica
5. Commit con messaggi descrittivi (`git commit -m 'feat: Add amazing feature'`)
6. Push al branch (`git push origin feature/AmazingFeature`)
7. Apri una Pull Request

## Licenza

TBD

## HOWTO

1. Per pulire l'ambiente docker lanciare:
```bash
# Pulire tutti i container docker
docker kill $(docker ps -q)
docker rm $(docker ps -a -q)
docker volume rm $(docker volume ls -q)
```
