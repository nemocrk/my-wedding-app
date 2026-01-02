# Wedding Invitation & RSVP Tracking System

## Panoramica
Applicazione web a microservizi per la gestione delle partecipazioni di matrimonio digitali.
Il sistema offre un'esperienza utente unica (apertura busta animata) e una console di amministrazione avanzata per il monitoraggio degli invitati e l'analisi comportamentale (heatmap).

## Architettura
Il progetto è strutturato come monorepo dockerizzato con i seguenti servizi:

1.  **Database (PostgreSQL):** Persistenza dati (invitati, RSVP, tracking analytics). **Isolato da Internet** tramite rete `db_network` interna.
2.  **Adminer (DB GUI):** Interfaccia web leggera per gestione database PostgreSQL. Accessibile su porta 8081.
3.  **Backend (Django + DRF):** API REST. Gestisce logica di business, autenticazione e raccolta dati di tracking. **Non accessibile direttamente dall'esterno** - solo tramite nginx.
4.  **Frontend User (React):** Esposto su **Internet** tramite `nginx-public`. Mostra l'invito animato. Accesso tramite query param univoco.
5.  **Frontend Admin (React):** Esposto **SOLO su localhost:8080** tramite `nginx-intranet`. Dashboard per gestione adesioni e visualizzazione Heatmap/Navigazione. **Richiede SSH tunnel o VPN per accesso remoto**.
6.  **Nginx Public:** Gateway Internet che espone solo frontend-user e API pubbliche su porta 80/443.
7.  **Nginx Intranet:** Gateway amministrativo che espone frontend-admin su `127.0.0.1:8080`.

### Isolamento di Rete

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                            │
└─────────────┬───────────────────────────────────────────┘
              │ :80/:443
              ▼
      ┌───────────────┐
      │ nginx-public  │
      └───────┬───────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌────────────┐    ┌────────────┐          ┌────────────┐
│ frontend-  │    │  backend   │◄─────────┤ adminer    │
│   user     │    │   (API)    │          │ :8081      │
└────────────┘    └─────┬──────┘          └─────┬──────┘
                        │                       │
                        ▼                       ▼
                  ┌──────────┐        ┌──────────────┐
                  │    DB    │◄───────┤ db_network   │
                  │ (isolato)│        │ (internal)   │
                  └──────────┘        └──────────────┘
                                      │
┌────────────────────────────────┐   │
│  INTRANET (localhost only)     │   │
└────────┬───────────────────────┘   │
         │ :8080                      │
         ▼                            │
   ┌─────────────┐                   │
   │nginx-intra  │                   │
   └──────┬──────┘                   │
          │                          │
          ▼                          │
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
docker-compose up --build

# I servizi saranno disponibili su:
# - Frontend User: http://localhost (porta 80)
# - Frontend Admin: http://localhost:8080
# - Adminer (DB): http://localhost:8081
# - Backend API: accessibile tramite nginx
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
├── docker-compose.yml     # Orchestrazione servizi
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
4. Commit con messaggi descrittivi (`git commit -m 'feat: Add amazing feature'`)
5. Push al branch (`git push origin feature/AmazingFeature`)
6. Apri una Pull Request

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
