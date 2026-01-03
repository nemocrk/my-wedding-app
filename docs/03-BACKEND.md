# Backend Documentation (Django)

Il backend è sviluppato in Python/Django e utilizza Django REST Framework (DRF) per esporre le API.

## Struttura del Progetto
```text
backend/
├── api/                # App Django per gli endpoint API
│   ├── urls.py         # Routing API (/api/public, /api/admin)
│   ├── views/          # Logica delle viste (ViewSet)
│   └── serializers.py  # Trasformazione dati Model <-> JSON
├── core/               # App Django per i Modelli (DB)
│   ├── models.py       # Definizioni ORM (Invitation, Person, Logs)
│   └── admin.py        # Configurazione pannello admin standard
├── wedding/            # Configurazione principale progetto
│   ├── settings.py     # Settings Django (env vars)
│   └── wsgi.py         # Entrypoint per Gunicorn
└── Dockerfile          # Configurazione container
```

## API Endpoints

### Public API (`/api/public/`)
Accessibili dal Frontend User.
- `GET /api/public/invitation/{code}/`: Recupera dettagli invito tramite slug.
- `POST /api/public/rsvp/`: Invia/Aggiorna conferme RSVP (richiede token sessione o firma HMAC).
- `POST /api/public/log/`: Endpoint per inviare log di interazione (analytics).

### Admin API (`/api/admin/`)
Accessibili solo dalla Intranet (Frontend Admin).
- `GET/POST /api/admin/invitations/`: CRUD completo inviti.
- `GET /api/admin/dashboard/`: Statistiche aggregate (RSVP count, accommodation needs).
- `GET /api/admin/analytics/`: Dati grezzi per heatmaps.

## Sicurezza
1.  **HMAC Signing**: I link generati per gli inviti possono includere un parametro di firma per prevenire brute-forcing dei codici invito.
2.  **CORS**: Configurato strettamente tramite `ALLOWED_HOSTS` e whitelist CORS.
3.  **Environment Variables**: Nessun segreto (DB password, Secret Key) è hardcoded. Tutto passa da `.env`.

## Comandi Utili

```bash
# Creare migrazioni (dopo modifica models.py)
docker-compose exec backend python manage.py makemigrations

# Applicare migrazioni
docker-compose exec backend python manage.py migrate

# Creare superuser
docker-compose exec backend python manage.py createsuperuser

# Shell Python
docker-compose exec backend python manage.py shell
```
