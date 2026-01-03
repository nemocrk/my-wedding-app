# 10 - Testing Guide

## Overview

Il progetto utilizza una suite di test a 4 livelli:
1. **Unit Tests**: Backend (pytest) e Frontend (Vitest).
2. **Smoke Tests**: Build e avvio servizi.
3. **Non-Regression Tests**: Verifiche mirate su funzionalità critiche (es. animazione busta, heatmap).
4. **Functional E2E Tests**: Playwright su stack Docker completo.

## Esecuzione Locale

### Backend Unit Tests
```bash
cd backend
pip install -r requirements.txt
pytest
```

### Frontend Unit Tests
```bash
cd frontend-user
npm install
npm test
```
(Idem per `frontend-admin`)

### E2E Functional Tests
Richiede Docker in esecuzione.

1. Avvia lo stack:
   ```bash
   docker compose up -d --build
   ```
2. Esegui i test Playwright:
   ```bash
   cd tests/e2e
   npm install
   npx playwright test
   ```

## Workflow GitHub Actions
Il file `.github/workflows/test-automation.yml` esegue automaticamente tutti i livelli ad ogni push su `main`.

### E2E Scenario
Il test E2E `complex_flow.spec.ts` copre il seguente scenario:
1. **Admin**: Generazione 10 inviti (API).
2. **User**: Simulazione apertura link, conferma/declino random (API Public).
3. **Admin**: Creazione 10 alloggi (API).
4. **Admin**: Esecuzione algoritmo auto-assegnazione (UI).
5. **Admin**: Verifica risultati dashboard (UI).
