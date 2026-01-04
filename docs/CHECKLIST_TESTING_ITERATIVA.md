# Checklist Iterativa per Test Automation

Questa checklist guida l'implementazione incrementale della test suite per coprire tutti i livelli richiesti (Unit, Smoke, Non-Regression, Functional).

## Backend (`backend/`)

- [x] **Step 1: Setup Framework**
  - [x] Configurare `pytest.ini` e `conftest.py` base.
  - [x] Creare fixtures per DB pulito e utente admin.

- [x] **Step 2: Core Models**
  - [x] `tests/test_models.py`: Unit tests su `Invitation` (creazione code, token).
  - [x] `tests/test_models.py`: Unit tests su `Accommodation/Room` (calcolo capacità e slot disponibili).
  - [x] `tests/test_models.py`: Unit tests su `GlobalConfig` (singleton constraint).

- [x] **Step 3: Admin API**
  - [x] `tests/test_api_admin.py`: CRUD Inviti.
  - [x] `tests/test_api_admin.py`: CRUD Alloggi.
  - [x] `tests/test_api_admin.py`: Generazione link pubblico.

- [x] **Step 4: Public API & Auth**
  - [x] `tests/test_api_public.py`: Auth flow (code + token -> session).
  - [x] `tests/test_api_public.py`: RSVP flow (conferma, declino, opzioni).
  - [x] `tests/test_api_public.py`: Protezione sessione (tentativo accesso senza auth).

- [x] **Step 5: Algoritmo Assegnazione**
  - [x] `tests/test_assignment_logic.py`: Scenario base (1 invito, 1 stanza).
  - [x] `tests/test_assignment_logic.py`: Scenario complesso (gruppi affini, mix adulti/bambini).
  - [x] `tests/test_assignment_logic.py`: Gestione non-affinità.

## Frontend User (`frontend-user/`)

- [x] **Step 1: Setup**
  - [x] Configurare `vitest` e `setupTests.ts`.
  - [x] Creare cartella `src/components/__tests__/`.

- [x] **Step 2: Componenti Base**
  - [x] Test render `Envelope.jsx` (o equivalente).
  - [x] Test form RSVP (integrato in `LetterContent.jsx`).

- [x] **Step 3: Non-Regression (Snapshot)**
  - [x] Snapshot stato iniziale busta chiusa.
  - [x] Snapshot stato busta aperta con lettera.

## Frontend Admin (`frontend-admin/`)

- [x] **Step 1: Setup**
  - [x] Configurare `vitest` e `setupTests.ts`.
  - [x] Creare cartella `src/__tests__/`.

- [x] **Step 2: Dashboard**
  - [x] Test rendering stats charts (mock data).
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
