# Guida Setup My-Wedding-App

## Prerequisiti

### Sistema Operativo

**Linux** è il sistema raccomandato per produzione e sviluppo.

**Windows**: È **obbligatorio** utilizzare **WSL 2** (Windows Subsystem for Linux).

### Software Richiesto

1. **Docker** (versione 20.10+)
2. **Docker Compose** (versione 2.0+)
3. **Git** (versione 2.30+)
4. **Node.js** (versione 18+ LTS) - solo per sviluppo locale senza Docker
5. **Python** (versione 3.10+) - solo per sviluppo locale senza Docker

## Installazione WSL 2 (Solo Windows)

### 1. Abilitare WSL 2

```powershell
# Apri PowerShell come Amministratore
wsl --install

# Riavvia il computer
```

### 2. Installare una distro Linux

```powershell
# Ubuntu è la distribuzione raccomandata
wsl --install -d Ubuntu-22.04
```

### 3. Configurare Docker Desktop

1. Scarica e installa [Docker Desktop per Windows](https://www.docker.com/products/docker-desktop/)
2. Nelle impostazioni, abilita "Use the WSL 2 based engine"
3. In "Resources → WSL Integration", abilita la tua distro Ubuntu

### 4. Installare Node.js in WSL

```bash
# Apri il terminale WSL
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

# Installa l'ultima versione LTS
nvm install --lts
nvm use --lts

# Verifica installazione
node -v
npm -v
```

### 5. Installare Docker in WSL (se necessario)

```bash
# Script automatico Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh ./get-docker.sh

# Avvia il servizio Docker
sudo systemctl enable --now docker.service

# Aggiungi utente al gruppo docker
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker

# Verifica installazione
docker --version
docker-compose --version
```

## Clonazione Repository

### Importante per Utenti Windows

**Clona il repository all'interno del filesystem WSL**, NON in `/mnt/c/...`:

```bash
# CORRETTO ✓
cd ~
mkdir projects
cd projects
git clone https://github.com/nemocrk/my-wedding-app.git
cd my-wedding-app

# SBAGLIATO ✗
cd /mnt/c/Users/TuoNome/Desktop
git clone ...  # Performance terribili!
```

### Linux

```bash
cd ~/projects
git clone https://github.com/nemocrk/my-wedding-app.git
cd my-wedding-app
```

## Configurazione Ambiente

### 1. Creare il file `.env`

```bash
cp .env.example .env
```

### 2. Modificare le variabili d'ambiente

```bash
# Usa nano, vim o VS Code
nano .env
```

### 3. Configurazione Minimale Sviluppo

```env
# .env per DEVELOPMENT
BUILD_TARGET=development
DEBUG=True
ALLOWED_HOSTS=*

# Database
DB_PASSWORD=dev_password_123

# Django
DJANGO_SECRET_KEY=dev-secret-key-non-usare-in-produzione

# Frontend User
REACT_APP_API_URL=http://localhost/api

# Frontend Admin
REACT_APP_ADMIN_API_URL=http://localhost:8080/api
```

### 4. Configurazione Produzione

```env
# .env per PRODUCTION
BUILD_TARGET=production
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database - CAMBIA QUESTA PASSWORD!
DB_PASSWORD=SuperSecurePassword123!@#

# Django Secret Key - Genera una nuova chiave!
DJANGO_SECRET_KEY=<genera-una-chiave-sicura>

# Frontend User
REACT_APP_API_URL=https://yourdomain.com/api

# Frontend Admin
REACT_APP_ADMIN_API_URL=http://localhost:8080/api
```

### Generare Django Secret Key

```bash
# Opzione 1: Python one-liner
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Opzione 2: Online generator
# https://djecrety.ir/
```

## Setup Certificati SSL (Opzionale)

### Per HTTPS in produzione

```bash
mkdir -p nginx/certs

# Se hai già un certificato
cp /path/to/cert.pem nginx/certs/
cp /path/to/key.pem nginx/certs/

# Oppure genera un certificato self-signed per test
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/key.pem \
  -out nginx/certs/cert.pem \
  -subj "/CN=localhost"
```

Poi decommentare le sezioni SSL in `nginx/public.conf`.

## Avvio Applicazione

### Modalità Development

```bash
# Assicurati che BUILD_TARGET=development in .env
docker-compose up --build
```

**Servizi disponibili**:

- **Frontend User**: http://localhost (porta 80)
- **Frontend Admin**: http://localhost:8080
- **Backend API**: http://localhost/api (via Nginx proxy)
- **Adminer (DB UI)**: http://localhost:8081
  - Sistema: `PostgreSQL`
  - Server: `db`
  - Utente: `wedding_user`
  - Password: (valore di `DB_PASSWORD` nel `.env`)
  - Database: `wedding_db`

### Modalità Production

```bash
# Assicurati che BUILD_TARGET=production in .env
docker-compose up --build -d

# Verifica log
docker-compose logs -f
```

**Nota**: In produzione, Adminer **non** è disponibile per sicurezza.

## Primo Avvio: Setup Database

### 1. Applicare le migrazioni

```bash
docker-compose exec backend python manage.py migrate
```

### 2. Creare un superuser admin

```bash
docker-compose exec backend python manage.py createsuperuser

# Segui le istruzioni interattive
# Username: admin
# Email: admin@example.com
# Password: ********
```

### 3. (Opzionale) Caricare dati di test

```bash
docker-compose exec backend python manage.py loaddata initial_data.json
```

## Accesso Admin Django

1. Vai su http://localhost/admin (o http://localhost:8080/admin per intranet)
2. Login con le credenziali superuser create
3. Puoi gestire:
   - Invitati (`Guests`)
   - Risposte (`Responses`)
   - Analytics (`PageView`, `EnvelopeInteraction`)

## Verifica Installazione

### Test Backend

```bash
# Verifica che il backend risponda
curl http://localhost/api/health/

# Output atteso:
# {"status": "ok", "database": "connected"}
```

### Test Frontend User

```bash
# Apri nel browser
xdg-open http://localhost  # Linux
open http://localhost      # macOS
start http://localhost     # Windows
```

### Test Frontend Admin

```bash
xdg-open http://localhost:8080
```

## Sviluppo con Hot-Reload

In modalità `BUILD_TARGET=development`, i frontend hanno hot-reload attivo:

```bash
# I file sono montati come volumi
# Modifica frontend-user/src/App.jsx → il browser si ricarica automaticamente
```

**Backend Django** usa il dev server con auto-reload:

```bash
# Modifica backend/core/views.py → il server si riavvia automaticamente
```

## Troubleshooting

### Errore: "Port already in use"

```bash
# Trova il processo sulla porta 80
sudo lsof -i :80

# Oppure fermalo con docker-compose
docker-compose down

# Se necessario, cambia le porte in docker-compose.yml
```

### Errore: "No space left on device"

```bash
# Pulisci immagini Docker non utilizzate
docker system prune -a --volumes
```

### Errore: "Permission denied" su WSL

```bash
# Assicurati di essere nel gruppo docker
sudo usermod -aG docker $USER
newgrp docker

# Verifica permessi
ls -la /var/run/docker.sock
```

### Frontend non si connette al backend

1. Verifica che `REACT_APP_API_URL` nel `.env` sia corretto
2. Ribuilda i container: `docker-compose up --build`
3. Controlla i log: `docker-compose logs frontend-user`

### Database non si connette

```bash
# Verifica che il container db sia running
docker-compose ps

# Se non parte, controlla i log
docker-compose logs db

# Rimuovi il volume e ricrea
docker-compose down -v
docker-compose up --build
```

## Comandi Utili

### Docker Compose

```bash
# Avvia tutti i servizi
docker-compose up

# Avvia in background (detached)
docker-compose up -d

# Ribuilds le immagini
docker-compose up --build

# Ferma tutti i servizi
docker-compose down

# Ferma e rimuovi volumi (ATTENZIONE: cancella il DB!)
docker-compose down -v

# Visualizza log
docker-compose logs -f

# Log di un servizio specifico
docker-compose logs -f backend

# Entra in un container
docker-compose exec backend bash
docker-compose exec frontend-user sh

# Riavvia un servizio
docker-compose restart backend
```

### Django Management

```bash
# Applica migrazioni
docker-compose exec backend python manage.py migrate

# Crea migrazioni
docker-compose exec backend python manage.py makemigrations

# Shell Django
docker-compose exec backend python manage.py shell

# Esegui test
docker-compose exec backend python manage.py test

# Crea superuser
docker-compose exec backend python manage.py createsuperuser

# Raccogli file statici (produzione)
docker-compose exec backend python manage.py collectstatic --noinput
```

### Node/NPM nei Frontend

```bash
# Installa dipendenze (già fatto in build)
docker-compose exec frontend-user npm install

# Esegui test Vitest
docker-compose exec frontend-user npm test

# Lint codice
docker-compose exec frontend-user npm run lint

# Build produzione (manuale)
docker-compose exec frontend-user npm run build
```

## Editor Consigliati

### VS Code con WSL

1. Installa l'estensione "Remote - WSL"
2. Apri VS Code dal terminale WSL:

```bash
cd ~/projects/my-wedding-app
code .
```

### Estensioni Consigliate

- **Python** (Microsoft)
- **Pylance** (Microsoft)
- **Django** (Baptiste Darthenay)
- **ES7+ React/Redux** (dsznajder)
- **Prettier** (Prettier)
- **ESLint** (Microsoft)
- **Docker** (Microsoft)

## Prossimi Passi

1. Leggi [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) per gli endpoint disponibili
2. Leggi [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) per customizzare l'interfaccia
3. Leggi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) per il deploy in produzione
4. Leggi [AI_RULES.md](../AI_RULES.md) per le regole di sviluppo con AI assistant
