# Backend Documentation

Il backend è sviluppato in **Python** utilizzando il framework **Django** e **Django REST Framework (DRF)**.

## Stack Tecnologico
- **Linguaggio:** Python 3.12+
- **Framework:** Django 6.x (aggiornato Jan 2026 per security fix)
- **API:** Django REST Framework
- **Database:** PostgreSQL 16 (con pgBouncer)
- **Server WSGI:** Gunicorn
- **Task Async:** Celery + Redis (se necessario in futuro)

## Struttura Progetto `backend/`
```
backend/
├── core/                   # App principale
│   ├── models.py          # Modelli DB (Guest, Invitation, Analytics)
│   ├── views.py           # Business logic (DRF ViewSets)
│   ├── serializers.py     # Serializers JSON
│   ├── urls.py            # Routing API
│   └── tests.py           # Unit tests
├── wedding_project/        # Configurazione Django
│   ├── settings.py        # Settings (carica da env vars)
│   ├── urls.py            # Main routing
│   └── wsgi.py            # Entry point WSGI
├── Dockerfile             # Configurazione container
├── manage.py              # CLI Django
└── requirements.txt       # Dipendenze Python
```

## Setup & Running

### 1. Variabili d'Ambiente
Assicurati che il file `.env` nella root del progetto contenga le chiavi necessarie (vedi `.env.example`).
Il backend legge le configurazioni tramite `os.environ` o `python-decouple`.

### 2. Comandi Utili (via Docker)

**Creare una Migrazione (dopo modifiche a models.py):**
```bash
docker-compose exec backend python manage.py makemigrations
```

**Applicare Migrazioni:**
```bash
docker-compose exec backend python manage.py migrate
```

**Creare Superuser:**
```bash
docker-compose exec backend python manage.py createsuperuser
```

**Eseguire Test:**
```bash
docker-compose exec backend python manage.py test
```

**Shell Django:**
```bash
docker-compose exec backend python manage.py shell
```

## Convenzioni di Sviluppo

### Modelli (Models)
- Usare nomi in inglese, singolare per le classi (es. `Guest`, non `Guests`).
- Ogni modello deve avere `created_at` e `updated_at`.
- Usare `UUIDField` come primary key per maggiore sicurezza e portabilità.

### API (DRF)
- Endpoint RESTful: `/api/resource/` (lista/crea), `/api/resource/{uuid}/` (dettaglio/modifica).
- Usare `ModelViewSet` quando possibile per standardizzare CRUD.
- Autenticazione: `SessionAuthentication` per admin, `TokenAuthentication` o custom auth per guest (se necessario).

### Validazione
- La logica di validazione complessa va nei **Serializers** (`validate_fieldname` o `validate`).
- I modelli devono avere vincoli DB (`unique=True`, `null=False`).

## Dipendenze
Gestite tramite `requirements.txt`.
Per aggiornare una libreria:
1. Modificare `requirements.txt`
2. Rebuild del container: `docker-compose build backend`
3. Verificare compatibilità.

**Nota su Django 6.0:**
Il progetto supporta Django 6.0 (e versioni successive 5.x). Assicurarsi di verificare le deprecazioni ufficiali prima di utilizzare feature legacy.
