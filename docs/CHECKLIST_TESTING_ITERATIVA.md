# Checklist Iterativa per Test Automation

Questa checklist guida l'implementazione incrementale della test suite per coprire tutti i livelli richiesti (Unit, Smoke, Non-Regression, Functional).

## Backend (`backend/`)

- [ ] **Step 1: Setup Framework**
  - [x] Configurare `pytest.ini` e `conftest.py` base.
  - [ ] Creare fixtures per DB pulito e utente admin.

- [ ] **Step 2: Core Models**
  - [ ] `tests/test_models.py`: Unit tests su `Invitation` (creazione code, token).
  - [ ] `tests/test_models.py`: Unit tests su `Accommodation/Room` (calcolo capacità e slot disponibili).
  - [ ] `tests/test_models.py`: Unit tests su `GlobalConfig` (singleton constraint).

- [ ] **Step 3: Admin API**
  - [ ] `tests/test_api_admin.py`: CRUD Inviti.
  - [ ] `tests/test_api_admin.py`: CRUD Alloggi.
  - [ ] `tests/test_api_admin.py`: Generazione link pubblico.

- [ ] **Step 4: Public API & Auth**
  - [ ] `tests/test_api_public.py`: Auth flow (code + token -> session).
  - [ ] `tests/test_api_public.py`: RSVP flow (conferma, declino, opzioni).
  - [ ] `tests/test_api_public.py`: Protezione sessione (tentativo accesso senza auth).

- [ ] **Step 5: Algoritmo Assegnazione**
  - [ ] `tests/test_assignment_logic.py`: Scenario base (1 invito, 1 stanza).
  - [ ] `tests/test_assignment_logic.py`: Scenario complesso (gruppi affini, mix adulti/bambini).
  - [ ] `tests/test_assignment_logic.py`: Gestione non-affinità.

## Frontend User (`frontend-user/`)

- [ ] **Step 1: Setup**
  - [x] Configurare `vitest` e `setupTests.ts`.
  - [ ] Creare cartella `src/components/__tests__/`.

- [ ] **Step 2: Componenti Base**
  - [ ] Test render `Envelope.jsx` (o equivalente).
  - [ ] Test form `RsvpForm.jsx` (validazione input).

- [ ] **Step 3: Non-Regression (Snapshot)**
  - [ ] Snapshot stato iniziale busta chiusa.
  - [ ] Snapshot stato busta aperta con lettera.

## Frontend Admin (`frontend-admin/`)

- [ ] **Step 1: Setup**
  - [x] Configurare `vitest` e `setupTests.ts`.
  - [ ] Creare cartella `src/__tests__/`.

- [ ] **Step 2: Dashboard**
  - [ ] Test rendering stats charts (mock data).
  - [ ] Test navigazione menu.

- [ ] **Step 3: Heatmap**
  - [ ] Test rendering canvas/layer heatmap.

## E2E Functional (`tests/e2e/`)

- [ ] **Step 1: Setup**
  - [x] Configurare Playwright e Docker workflow.
  - [x] Creare `api.ts` helper.

- [ ] **Step 2: Scenari**
  - [x] Scenario "Complex Flow" (Happy Path).
  - [ ] Scenario "Negative Auth" (Token errato).
  - [ ] Scenario "Concurrency" (Multipli utenti simultanei - opzionale).
