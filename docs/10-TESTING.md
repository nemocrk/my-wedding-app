# 10 - Testing Guide

## Overview

Il progetto utilizza una suite di test a 4 livelli per garantire qualità e affidabilità:

1. **Unit Tests**: Test di unità per Backend (pytest) e Frontend (Jest/RTL per User e Admin).
2. **Integration Tests**: Test di integrazione per API Django REST Framework.
3. **E2E Tests**: Test end-to-end con Playwright su stack Docker completo.
4. **CI/CD Pipeline**: Automazione completa tramite GitHub Actions.

## Architettura Testing

### Backend Unit & Integration Tests
- **Framework**: `pytest` + `pytest-django`
- **Coverage Tool**: `pytest-cov`
- **Database**: SQLite in-memory per velocità
- **File**: `backend/core/tests/`
  - `test_models.py`: Test modelli Django (Guest, Accommodation, Analytics)
  - `test_serializers.py`: Test serializzatori DRF
  - `test_views.py`: Test API endpoints
  - `test_permissions.py`: Test autorizzazioni e CORS

### Frontend User Tests
- **Framework**: `Jest` + `React Testing Library`
- **File**: `frontend-user/src/__tests__/`
  - `App.test.jsx`: Test routing e struttura principale
  - `EnvelopeAnimation.test.jsx`: Test animazione apertura busta
  - `LetterContent.test.jsx`: Test rendering contenuti invito
- **Mock**: `msw` per simulazione API
- **Copertura**: Componenti critici (animazione busta, form RSVP)

### Frontend Admin Tests
- **Framework**: `Jest` + `React Testing Library`
- **File**: `frontend-admin/src/__tests__/`
  - `App.test.jsx`: Test dashboard principale
  - `GuestList.test.jsx`: Test gestione lista invitati
  - `AccommodationManager.test.jsx`: Test gestione alloggi
  - `HeatmapView.test.jsx`: Test visualizzazione analytics
- **Mock**: API calls simulati per dashboard interattiva

### E2E Tests (Playwright)
- **Framework**: `Playwright` (Chromium, Firefox, WebKit)
- **Orchestrazione**: Docker Compose con servizi isolati
- **File**: `tests/e2e/tests/`
  - `complex_flow.spec.ts`: Flusso completo Admin → User → Algoritmo
  - `concurrency.spec.ts`: Test concorrenza multi-invitato
  - `negative_auth.spec.ts`: Test sicurezza e accesso non autorizzato
  - `api_contract.spec.ts`: Test contratto API (status code, schema)

**Scenario Complex Flow**:
1. Admin genera 10 inviti via API
2. User simula apertura link e conferma/declino random
3. Admin crea 10 alloggi
4. Admin esegue algoritmo auto-assegnazione (UI)
5. Verifica dashboard analytics e heatmap

**Gestione Dati E2E**:
- Setup: Ogni test crea i propri dati (inviti/alloggi) tramite API
- Teardown: `try...finally` block per pulizia garantita anche su failure
- Isolation: Utilizzo di `unique_id` nei nomi per evitare collisioni

## Esecuzione Locale

### Backend Unit Tests
```bash
cd backend
pip install -r requirements.txt
pytest --cov=core --cov-report=html
```

**Output**: Report coverage in `htmlcov/index.html`

### Frontend User Tests
```bash
cd frontend-user
npm install
npm test -- --coverage --watchAll=false
```

**Output**: Report coverage in `coverage/lcov-report/index.html`

### Frontend Admin Tests
```bash
cd frontend-admin
npm install
npm test -- --coverage --watchAll=false
```

### E2E Tests Completo
Richiede Docker e stack avviato.

```bash
# 1. Avvia stack completo
docker compose up -d --build

# 2. Attendi healthcheck (30-40s)
docker compose ps  # Verifica che tutti i servizi siano "healthy"

# 3. Esegui test E2E
cd tests/e2e
npm install
npx playwright test

# 4. Visualizza report interattivo
npx playwright show-report
```

### Script Unificato
Il progetto include uno script bash per eseguire tutti i test in sequenza:

```bash
./run_all_tests.sh
```

**Fasi dello script**:
1. Backend tests (pytest con coverage)
2. Frontend User tests (Jest con coverage)
3. Frontend Admin tests (Jest con coverage)
4. Rebuild stack Docker
5. E2E tests (Playwright full suite)
6. Raccolta artifact (coverage reports, screenshots, video)

## CI/CD Pipeline (GitHub Actions)

### Workflow: `test-automation.yml`
File: `.github/workflows/test-automation.yml`

**Trigger**: Push su `main` e Pull Request verso `main`

**Jobs**:

#### 1. Backend Tests
- **Runner**: `ubuntu-latest`
- **Services**: PostgreSQL 15 (container GitHub)
- **Steps**:
  1. Checkout codice
  2. Setup Python 3.11
  3. Cache pip dependencies
  4. Install dependencies
  5. Run pytest con coverage
  6. Upload coverage report (artifact)

#### 2. Frontend User Tests
- **Runner**: `ubuntu-latest`
- **Steps**:
  1. Checkout codice
  2. Setup Node.js 20
  3. Cache npm dependencies
  4. Install dependencies
  5. Run Jest tests con coverage
  6. Upload coverage report (artifact)

#### 3. Frontend Admin Tests
- **Runner**: `ubuntu-latest`
- **Steps**: Identiche a Frontend User

#### 4. E2E Tests
- **Runner**: `ubuntu-latest`
- **Requisiti**: Jobs 1-3 devono passare (`needs: [backend-tests, frontend-user-tests, frontend-admin-tests]`)
- **Steps**:
  1. Checkout codice
  2. Setup Docker Buildx
  3. Cache Docker layers
  4. Crea `.env` file per CI
  5. Build immagini Docker (tutti i servizi)
  6. Start stack con healthcheck wait
  7. Install Playwright + browsers
  8. Run E2E suite completa
  9. Upload artifacts:
     - Screenshots su failure
     - Video delle esecuzioni
     - Playwright HTML report
  10. Cleanup: Stop e rimozione container

**Optimizations CI**:
- **Caching**: Pip, npm e Docker layers cachati per velocità
- **Parallelizzazione**: Backend e Frontend tests girano in parallelo
- **Fail Fast**: E2E non parte se unit tests falliscono
- **Artifact Retention**: 7 giorni per coverage reports, 3 giorni per video E2E

### Visualizzazione Risultati

Dopo ogni run:
1. **Actions Tab**: Overview stato pipeline
2. **Annotations**: Errori inline nel codice
3. **Artifacts**: Download coverage reports e video
4. **Summary**: Statistiche test passati/falliti

## Strategie Testing

### Snapshot Tests (Frontend)
**Status**: Rimossi per fragilità in CI

Gli snapshot tests (`expect(component).toMatchSnapshot()`) sono stati **deprecati** per i seguenti motivi:
- Fallimenti spurii su modifiche CSS/whitespace
- Difficoltà di review in PR (diff binari)
- Ridondanza con test funzionali espliciti

**Replacement**: Test basati su asserzioni esplicite (es. `expect(screen.getByText('Testo')).toBeInTheDocument()`)

### Permission Tests (Backend)
Ogni endpoint API include test specifici per:
- Accesso anonimo (public endpoints)
- Accesso autenticato (admin endpoints)
- CORS headers corretti
- Rate limiting (se implementato)

### Concurrency Tests (E2E)
Il test `concurrency.spec.ts` simula:
- Apertura simultanea dello stesso invito da 5 browser
- Verifica integrità dati (no race conditions)
- Verifica atomicità update RSVP

### Negative Tests (E2E)
Il test `negative_auth.spec.ts` verifica:
- Blocco accesso admin senza autenticazione
- Validazione UUID inviti (format errato → 404)
- Gestione errori API (500, 404, 403)

## Debugging

### Debug E2E Locale
```bash
# Esegui Playwright in modalità UI (passo-passo)
cd tests/e2e
npx playwright test --ui

# Esegui singolo test con debug
npx playwright test complex_flow.spec.ts --debug

# Visualizza trace di un test fallito
npx playwright show-trace trace.zip
```

### Debug Frontend Tests
```bash
cd frontend-user
# Modalità watch per sviluppo
npm test -- --watch

# Debug singolo file
npm test -- EnvelopeAnimation.test.jsx --watch
```

### Debug Backend Tests
```bash
cd backend
# Esegui singolo test con output verbose
pytest core/tests/test_models.py::TestGuestModel::test_guest_creation -v -s

# Debug con breakpoint (usa ipdb)
pip install ipdb
# Aggiungi `import ipdb; ipdb.set_trace()` nel codice
pytest
```

## Metriche Qualità

### Coverage Target
- **Backend**: ≥ 85% line coverage
- **Frontend User**: ≥ 75% (focus su componenti critici)
- **Frontend Admin**: ≥ 75%
- **E2E**: 100% happy paths + principali edge cases

### Performance Benchmark
- **Backend Unit Tests**: < 30s
- **Frontend Tests**: < 60s (each)
- **E2E Suite Completa**: < 10 minuti
- **CI Pipeline Totale**: < 15 minuti

## Manutenzione

### Aggiornamento Snapshot (se reintrodotti)
```bash
cd frontend-user
npm test -- -u  # Update all snapshots
```

### Aggiornamento Playwright
```bash
cd tests/e2e
npm install @playwright/test@latest
npx playwright install  # Re-download browsers
```

### Pulizia Artifact Locale
```bash
# Rimuovi coverage reports
rm -rf backend/htmlcov frontend-user/coverage frontend-admin/coverage

# Rimuovi video/screenshots E2E
rm -rf tests/e2e/test-results tests/e2e/playwright-report
```

## Troubleshooting

### "vite: not found" durante build CI
**Causa**: `npm ci --only=production` non installa devDependencies (Vite)  
**Fix**: Usare `npm ci` (senza flag) nello stage build del Dockerfile

### "Permission denied: /app/staticfiles" (Backend)
**Causa**: Volume Docker creato come root, ma processo gira come `appuser`  
**Fix**: Entrypoint.sh esegue `chown` prima di switch a `appuser` tramite `gosu`

### E2E tests timeout in CI
**Causa**: Servizi non healthy prima di avvio test  
**Fix**: Usare `docker compose ps` con loop wait per verificare stato `healthy`

### Frontend tests falliscono con "Snapshot mismatch"
**Causa**: Snapshot tests fragili (deprecati)  
**Fix**: Rimuovere snapshot tests, sostituire con asserzioni esplicite
