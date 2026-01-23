# Architettura My-Wedding-App

## Panoramica

**My-Wedding-App** è un'applicazione monorepo dockerizzata per la gestione delle partecipazioni di matrimonio. L'architettura è basata su microservizi orchestrati con Docker Compose, con una netta separazione tra frontend pubblico (Internet), frontend amministrativo (Intranet) e backend API.

## Stack Tecnologico

### Backend

- **Framework**: Django 5.1.4 + Django REST Framework (DRF) 3.15.2
- **Database**: PostgreSQL (ultima versione stabile)
- **Connection Pooler**: pgBouncer (transaction mode)
- **WSGI Server**: Gunicorn (produzione) / Django dev server (sviluppo)
- **Linguaggio**: Python 3.x

### Frontend User (Pubblico)

- **Framework**: React 18+ con Vite
- **UI Library**: Material-UI (MUI)
- **Animazioni**: GSAP, React Spring
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Server**: Nginx (produzione) / Vite dev server (sviluppo)

### Frontend Admin (Intranet)

- **Framework**: React 18+ con Vite
- **UI Library**: Material-UI (MUI)
- **Charts**: Recharts per analytics e heatmap
- **Server**: Nginx (produzione) / Vite dev server (sviluppo)

### Infrastructure

- **Orchestrazione**: Docker Compose
- **Gateway**: Nginx (dual configuration: public + intranet)
- **Networking**: Rete Docker isolata con esposizione selettiva delle porte
- **SSL/TLS**: Supporto certificati personalizzati

## Design Pattern e Principi

### Architettura a Microservizi

L'applicazione è suddivisa in servizi indipendenti:

```
┌─────────────────────────────────────────────────────────────┐
│                      INTERNET                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Nginx Public      │  Porta 80/443
         │  (Gateway)         │
         └─────────┬──────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
 ┌─────▼──────┐         ┌─────▼──────┐
 │ Frontend   │         │  Backend   │
 │ User       │◄────────┤  Django    │
 │ (React)    │   API   │  + DRF     │
 └────────────┘         └─────┬──────┘
                              │
                       ┌──────▼────────┐
                       │  pgBouncer    │  Connection Pooler
                       │ (25 → 200)    │  Transaction Mode
                       └──────┬────────┘
                              │
                       ┌──────▼──────┐
                       │ PostgreSQL  │
                       │ (Database)  │
                       └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      INTRANET                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Nginx Intranet    │  Porta 8080
         │  (Gateway Admin)   │
         └─────────┬──────────┘
                   │
                   │
            ┌──────▼──────┐
            │ Frontend    │
            │ Admin       │
            │ (React)     │
            └─────────────┘
```

### Database Layer: Connection Pooling con pgBouncer

**Problema risolto**: L'errore `FATAL: sorry, too many clients already` di PostgreSQL si verifica quando il numero di connessioni concorrenti supera il limite `max_connections` (default: 100). Con Gunicorn multi-worker (4 worker × N connessioni), il limite veniva raggiunto facilmente sotto carico.

**Soluzione**: pgBouncer agisce come intermediario tra Django e PostgreSQL, gestendo un pool di connessioni riutilizzabili:

```
Django Workers (4×50=200 connessioni client)
          ↓
    pgBouncer Pool
    (max_client_conn: 200)
    (default_pool_size: 25)
          ↓
   PostgreSQL Server
   (max_connections: 100)
   Utilizza solo 25 connessioni attive
```

**Configurazione pgBouncer**:

- **Pool Mode**: `transaction` - rilascia connessioni DB dopo ogni transazione SQL
- **Max Client Connections**: 200 - limite client (worker Gunicorn + overhead)
- **Default Pool Size**: 25 - connessioni effettive verso PostgreSQL
- **Reserve Pool**: 5 - connessioni di emergenza per burst traffic
- **Server Idle Timeout**: 600s - chiusura connessioni idle dopo 10min

**Vantaggi**:

1. Riduce il carico su PostgreSQL (25 vs 200 connessioni)
2. Elimina l'errore "too many clients"
3. Migliora le performance sotto carico (connection reuse)
4. Isola completamente il database nella rete `db_network`

**Integrazione Django**:

```python
# backend/wedding/settings.py
DATABASES = {
    'default': dj_database_url.config(
        default='postgres://postgres:password@pgbouncer:5432/wedding_db',
        conn_max_age=60,  # Ridotto da 600s - pgBouncer gestisce la persistenza
        conn_health_checks=True,  # Django 4.1+ valida connessioni prima del riuso
    )
}

# Development: CONN_MAX_AGE=0 (delega pooling a pgBouncer)
# Production: CONN_MAX_AGE=60 (connessioni riutilizzabili brevi)
```

Per dettagli completi sulla configurazione e monitoring, vedi [docs/PGBOUNCER.md](./PGBOUNCER.md).

### Isolamento di Rete

**Principio Zero-Trust**: Il database PostgreSQL è accessibile **SOLO** dal backend Django e da pgBouncer all'interno della rete Docker interna. Nessun frontend può accedere direttamente al database.

```yaml
networks:
  db_network:
    internal: true  # Isolamento totale da Internet
    driver: bridge

services:
  db:
    networks:
      - db_network
    # NO port mapping → isolamento totale
  
  pgbouncer:
    networks:
      - db_network  # Accesso esclusivo a PostgreSQL
  
  backend:
    networks:
      - db_network      # Per comunicare con pgBouncer
      - backend_network # Per comunicare con nginx
```

### Multi-Stage Build

Ogni Dockerfile supporta due target:

1. **development**: Hot-reload, debug attivo, volumi montati
2. **production**: Build ottimizzato, file statici compilati, niente volumi

Controllo tramite variabile `BUILD_TARGET` nel file `.env`.

### API-First Design

Il backend espone un'API RESTful documentata (DRF Browsable API) con:

- **Autenticazione**: Token-based (DRF Token Auth)
- **Serialization**: JSON standard
- **Validazione**: Django Forms + DRF Serializers
- **Paginazione**: Configurabile per liste grandi
- **CORS**: Configurato per separare frontend da backend

## Struttura Directory

```
my-wedding-app/
├── .continue/              # Configurazione Continue.dev (AI assistant)
├── .github/                # GitHub Actions CI/CD workflows
├── .env.example            # Template variabili ambiente
├── .gitignore              # File ignorati da Git
├── AI_RULES.md             # Regole obbligatorie sviluppo AI
├── README.md               # Documentazione principale
├── docker-compose.yml      # Orchestrazione servizi
│
├── backend/                # Django Backend
│   ├── Dockerfile          # Multi-stage: dev/prod
│   ├── entrypoint.sh       # Script avvio container
│   ├── manage.py           # CLI Django
│   ├── requirements.txt    # Dipendenze Python
│   ├── DB-Structure.md     # Schema database
│   ├── api/                # Settings Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/               # App principale Django
│   │   ├── models.py       # Modelli DB (Guest, Response, Analytics)
│   │   ├── serializers.py  # Serializzatori DRF
│   │   ├── views.py        # Logica API endpoint
│   │   ├── middleware.py   # Middleware personalizzati
│   │   ├── migrations/     # Migrazioni DB
│   │   └── tests/          # Unit test
│   └── wedding/            # App secondaria (se presente)
│
├── frontend-user/          # React Frontend Pubblico
│   ├── Dockerfile          # Multi-stage build
│   ├── nginx.conf          # Config Nginx produzione
│   ├── vite.config.js      # Config Vite bundler
│   ├── package.json        # Dipendenze Node
│   ├── src/
│   │   ├── App.jsx         # Componente root
│   │   ├── main.jsx        # Entry point
│   │   ├── components/     # Componenti React
│   │   ├── pages/          # Pagine routing
│   │   ├── services/       # API client (axios)
│   │   └── styles/         # CSS/SCSS
│   └── public/             # Asset statici
│
├── frontend-admin/         # React Frontend Amministrativo
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── pages/
│       │   ├── Dashboard.jsx     # Analytics principale
│       │   ├── GuestList.jsx     # Gestione invitati
│       │   └── Heatmap.jsx       # Visualizzazione traffico
│       └── services/
│
├── nginx/                  # Configurazioni Nginx Gateway
│   ├── public.conf         # Gateway Internet (porta 80/443)
│   ├── intranet.conf       # Gateway Admin (porta 8080)
│   └── certs/              # Certificati SSL (gitignored)
│       ├── cert.pem
│       └── key.pem
│
├── tests/                  # Test suite monorepo
│   └── load_test_connections.py  # Test pgBouncer connection pooling
│
└── docs/                   # Documentazione estesa
    ├── ARCHITECTURE.md     # Questo file
    ├── API_DOCUMENTATION.md
    ├── SETUP_GUIDE.md
    ├── PGBOUNCER.md        # Guida pgBouncer connection pooling
    └── TESTING_GUIDE.md
```

## Flusso Dati

### Frontend User → Backend → Database

1. **Utente** apre `http://yourdomain.com` (o `localhost` in dev)
2. **Nginx Public** serve il React build da `frontend-user`
3. React effettua chiamate API a `http://yourdomain.com/api/*`
4. **Nginx Public** proxy reverse verso `backend:8000`
5. **Django/Gunicorn** accetta la richiesta (worker pool)
6. **Django ORM** richiede connessione DB a `pgbouncer:5432`
7. **pgBouncer** assegna una connessione dal pool (o la riutilizza)
8. **PostgreSQL** esegue la query SQL
9. pgBouncer rilascia la connessione al pool dopo il COMMIT
10. Django serializza i dati in JSON
11. Risposta ritorna attraverso nginx → React frontend

### Frontend Admin → Backend

1. **Admin** accede via SSH tunnel o VPN a `http://localhost:8080`
2. **Nginx Intranet** serve il React build da `frontend-admin`
3. React effettua chiamate API a `http://localhost:8080/api/*`
4. **Nginx Intranet** proxy reverse verso `backend:8000`
5. Django processa (con autenticazione admin) attraverso pgBouncer
6. Dati analytics/heatmap restituiti in JSON

## Sicurezza

### Livelli di Protezione

1. **Network Isolation**: Database + pgBouncer isolati in `db_network` (internal: true)
2. **Connection Pooling**: pgBouncer limita le connessioni dirette al DB (DoS mitigation)
3. **Authentication**: Token DRF per admin API
4. **HTTPS**: Certificati SSL configurabili
5. **CORS**: Configurazione restrittiva per origini consentite
6. **Environment Variables**: Secrets mai committati (`.env` gitignored)
7. **Input Validation**: Django Forms + DRF Serializers

### Configurazione ALLOWED_HOSTS

In produzione, `ALLOWED_HOSTS` deve contenere **solo** i domini reali:

```env
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DEBUG=False
```

## Scalabilità

### Orizzontale

- **Frontend**: Build statici serviti da CDN (es. Cloudflare)
- **Backend**: Replicas Gunicorn workers (configurabile)
- **pgBouncer**: Pool size scalabile in base al traffico
- **Database**: PostgreSQL replica set con read replicas

### Verticale

- Risorse Docker Compose limitabili con `deploy.resources`
- Caching con Redis (aggiungibile)
- Query optimization con Django Debug Toolbar (dev)

## Monitoraggio

### Logging

**Strutturato JSON su stdout**:

```python
LOGGING = {
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        },
    },
}
```

### Metriche

- **Django Admin**: Pannello `/admin/` per analytics base
- **Adminer**: Tool DB UI accessibile in dev (`http://localhost:8081`)
- **pgBouncer Stats**: Query diretta `SHOW POOLS;` per monitoring pool
- **Custom Dashboard**: Frontend Admin con Recharts

### Monitoring pgBouncer

```bash
# Connessioni attive PostgreSQL
docker exec my-wedding-app-db-1 psql -U postgres -d wedding_db \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Statistiche pool pgBouncer
docker exec my-wedding-app-pgbouncer-1 psql -h 127.0.0.1 -p 5432 -U postgres -d pgbouncer \
  -c "SHOW POOLS;"
```

## Performance

### Ottimizzazioni Backend

- **select_related/prefetch_related**: Riduzione query N+1
- **Database indexes**: Campi ricercati frequentemente
- **pgBouncer pooling**: Riutilizzo connessioni DB (riduce overhead)
- **Pagination**: Liste grandi spezzate

### Ottimizzazioni Frontend

- **Code splitting**: Lazy loading componenti React
- **Image optimization**: WebP + lazy loading
- **Bundle size**: Vite tree-shaking automatico
- **Caching**: Service Workers (configurabile)

## Estendibilità

### Aggiungere una nuova feature

1. **Backend**: Creare model → serializer → view → URL
2. **Frontend**: Creare service API → componente → routing
3. **Tests**: Unit test backend + Vitest/RTL frontend
4. **Docs**: Aggiornare `API_DOCUMENTATION.md`

### Integrazioni Future

- **Email notifications**: Django + Celery + Redis
- **SMS reminders**: Twilio integration
- **Payment gateway**: Stripe per gift list
- **Analytics avanzate**: Google Analytics 4
- **Read Replicas**: PostgreSQL streaming replication con pgBouncer multi-pool

## Riferimenti

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [pgBouncer Documentation](https://www.pgbouncer.org/)
