# Strategia di Testing

## Filosofia
Il progetto adotta un approccio "Test Pyramid" ma pragmatico, con forte enfasi sugli Integration Test per il backend e Component Test per il frontend.

## 1. Backend Testing (Django)
Utilizziamo `pytest` con `pytest-django`.

### Struttura
- **Unit Tests**: Test isolati di singoli metodi o funzioni helper.
- **Integration Tests**: Test completi delle API ViewSet (DB -> Serializer -> Response).
- **Security Tests**: Verifica permessi e autenticazione.

### Esecuzione
```bash
# Esegui tutti i test
docker compose exec backend pytest

# Esegui con coverage
docker compose exec backend pytest --cov=core --cov-report=term-missing

# Esegui test specifici per WhatsApp
docker compose exec backend pytest whatsapp/tests.py
```

### Key Test Cases
- **RSVP Flow**: Creazione invito -> Accesso pubblico -> Submit RSVP -> Verifica persistenza DB.
- **Auth**: Token invalido -> 403 Forbidden.
- **WhatsApp**:
  - `test_rate_limiting_logic`: Verifica che il worker non invii più messaggi del limite orario.
  - `test_get_status_success`: Verifica integrazione corretta con API interne WAHA.

## 2. Frontend Testing (React)
Utilizziamo `Vitest` (compatibile Jest) e `React Testing Library`.

### Frontend User
```bash
# Esegui test
cd frontend-user
npm test

# Coverage
npm test -- --coverage
```
**Focus**:
- Animazione apertura busta (`EnvelopeAnimation`).
- Flip card lettera.
- Validazione form RSVP.

### Frontend Admin
```bash
cd frontend-admin
npm test
```
**Focus**:
- Login flow.
- CRUD tabelle (Invitations).
- Dashboard Charts.
- WhatsApp Config Page (mocking API responses).

## 3. End-to-End Testing (Playwright)
Testiamo il flusso utente completo in un ambiente simile alla produzione.

### Scenari
1.  **Happy Path Guest**:
    - Apre link invito.
    - Vede animazione.
    - Conferma presenza.
    - Riceve conferma visiva.

2.  **Admin Workflow**:
    - Login dashboard.
    - Creazione nuovo invito.
    - Verifica statistiche aggiornate.

3.  **WhatsApp Integration**:
    - (Mocked) Verifica presenza bottoni contatti nel retro lettera.

## 4. Continuous Integration
Vedi `.github/workflows/test-automation.yml` per dettagli sulla pipeline automatica.
