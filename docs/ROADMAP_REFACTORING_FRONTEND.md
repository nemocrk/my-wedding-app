# Roadmap Refactoring Frontend 2026

**Obiettivo:** Eliminare dipendenze da API browser native (`window.confirm`, `window.alert`, attributi `title`) e standardizzare il networking layer nel `frontend-admin`.

---

## 🎯 Stato Avanzamento Real-Time

**Milestones GitHub:**
- [Fase 0 - Fondamenta (P0)](https://github.com/nemocrk/my-wedding-app/milestone/1)
- [Fase 1 - Migrazioni Core (P1)](https://github.com/nemocrk/my-wedding-app/milestone/2)
- [Fase 2 - Consolidamento (P2)](https://github.com/nemocrk/my-wedding-app/milestone/3)

**Lista Issue:** [Tutte le issue del refactoring](https://github.com/nemocrk/my-wedding-app/issues?q=is%3Aissue+is%3Aopen+label%3Arefactor)

---

## 📋 FASE 0: Fondamenta (P0)

**Obiettivo:** Creare gli strumenti base (Hook, Componenti, Pattern) per abilitare le migrazioni successive.

### Milestone 1 - Hook `useConfirm` [#75](https://github.com/nemocrk/my-wedding-app/issues/75)

**Branch:** `feature/75-use-confirm-hook`  
**PR Title:** `[Frontend] Implementa hook useConfirm per sostituzione window.confirm`

**Implementation:**
- File: `frontend-admin/src/contexts/ConfirmDialogContext.jsx`
- Creare Context Provider che renderizza `ConfirmationModal` esistente
- Hook `useConfirm()` restituisce funzione `confirm({ title, message })` → `Promise<boolean>`
- Integrare Provider in `App.jsx`

**Definition of Done:**
- ✅ File `ConfirmDialogContext.jsx` + test unitari
- ✅ Provider integrato senza rompere rendering esistente
- ✅ Build container `frontend-admin` OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (sezione Hook Condivisi)
- ✅ Zero warning da `./i18n/scripts/scan_repo.sh`

---

### Milestone 2 - Componente `Tooltip` [#74](https://github.com/nemocrk/my-wedding-app/issues/74)

**Branch:** `feature/74-tooltip-component`  
**PR Title:** `[Frontend] Astrarre componente Tooltip da QueueTable`

**Implementation:**
- Estrarre logica tooltip da `QueueTable.jsx` (onMouseEnter/Leave + Portal)
- Creare `frontend-admin/src/components/common/Tooltip.jsx`
- Props: `content`, `children`, `position` ('top'|'bottom'|'left'|'right')
- Refactorare `QueueTable.jsx` per usare il nuovo componente

**Definition of Done:**
- ✅ File `Tooltip.jsx` + test unitari (render + hover)
- ✅ `QueueTable.jsx` refactorato con funzionalità invariata
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (sezione Componenti Comuni)
- ✅ Zero warning i18n

---

### Milestone 3 - Standardizzazione Error Handling [#80](https://github.com/nemocrk/my-wedding-app/issues/80)

**Branch:** `feature/80-whatsapp-service-error-handling`  
**PR Title:** `[Frontend] Standardizza gestione errori in whatsappService.js`

**Implementation:**
- Uniformare `whatsappService.js` al pattern di `api.js`
- Emettere evento globale `api-error` su network error e HTTP >= 400
- Wrapper interno per `fetch` con `triggerGlobalError`

**Definition of Done:**
- ✅ `whatsappService.js` allineato (evento globale + rilancio errore)
- ✅ Nessuna modifica alle firme pubbliche (retrocompatibilità)
- ✅ Smoke test: forzare 500/401 e verificare ErrorModal globale
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (pattern error handling)
- ✅ Zero warning i18n

---

## 🚀 FASE 1: Migrazioni Core (P1)

**Obiettivo:** Applicare i nuovi pattern alle pagine critiche (Invitati, WhatsApp, Accommodations).

**Dipendenze:** Richiede M1+M2 completate. M5 richiede anche M3.

### Milestone 4 - Refactor `InvitationList` [#77](https://github.com/nemocrk/my-wedding-app/issues/77)

**Branch:** `feature/77-invitation-list-refactor`  
**PR Title:** `[Frontend] Migra InvitationList a useConfirm e Tooltip UI`

**Implementation:**
- `handleWABulkSend`: sostituire `window.confirm` con `useConfirm`
- Sostituire `alert()` con Toast (warning/success)
- Convertire tutti gli attributi `title` a `<Tooltip>`
- Verificare performance su tabelle con molte righe

**Definition of Done:**
- ✅ Zero `window.confirm`, `window.alert`, `title` in `InvitationList.jsx`
- ✅ UI funzionante: conferme React-based, toast, tooltip senza clipping
- ✅ Performance: nessun lag su tabella con 50+ righe
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (pattern conferme/errori)
- ✅ Zero warning i18n

---

### Milestone 5 - Refactor Modulo WhatsApp [#78](https://github.com/nemocrk/my-wedding-app/issues/78)

**Branch:** `feature/78-whatsapp-module-refactor`  
**PR Title:** `[Frontend] Migra moduli WhatsApp Config/Dashboard a UI nativa React`

**Implementation:**
- `WhatsAppConfig.jsx`: `handleLogout`/`handleDeleteTemplate` → `useConfirm`, `alert` → Toast/ErrorModal
- `WhatsAppQueueDashboard.jsx`: `handleDelete` → `useConfirm`
- Sostituire `title` con `Tooltip`
- Verificare traduzioni i18n nei messaggi di conferma

**Definition of Done:**
- ✅ Zero `window.confirm`, `window.alert`, `title` nei file target
- ✅ Traduzioni i18n verificate
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (Moduli WhatsApp)
- ✅ Zero warning i18n

---

### Milestone 6 - Refactor Accommodations [#76](https://github.com/nemocrk/my-wedding-app/issues/76)

**Branch:** `feature/76-accommodations-refactor`  
**PR Title:** `[Frontend] Rimuove window.confirm e title da pagine Accommodations`

**Implementation:**
- `AccommodationsPage.jsx`: `handleDelete` → `useConfirm`
- `AutoAssignStrategyModal.jsx`: verificare/sostituire `window.confirm` se presente
- Convertire `title` a `Tooltip`

**Definition of Done:**
- ✅ Zero `window.confirm`, `title` nei file target
- ✅ Cancellazione alloggio funzionante con conferma React-based
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (Accommodations)
- ✅ Zero warning i18n

---

## 🏁 FASE 2: Consolidamento (P2)

**Obiettivo:** Pulizia finale e refactoring architetturale del networking layer.

**Dipendenze:** M7 richiede M2. M8 e M9 richiedono M3.

### Milestone 7 - Pulizia Layout & Dashboard [#79](https://github.com/nemocrk/my-wedding-app/issues/79)

**Branch:** `feature/79-layout-dashboard-tooltip`  
**PR Title:** `[Frontend] Rimuove attributi title da Layout e Dashboard`

**Implementation:**
- `Dashboard.jsx`, `Header.jsx`, `Sidebar.jsx`, `LanguageSwitcher.jsx`
- Sostituire `title` con `<Tooltip>` (position adeguata al layout)
- NON toccare tooltip interni di Recharts (gestiti dalla libreria)

**Definition of Done:**
- ✅ Zero `title` rilevanti nei file analizzati
- ✅ UI coerente con tooltip React in Header/Sidebar
- ✅ Build container OK
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (Layout)
- ✅ Zero warning i18n

---

### Milestone 8 - Eliminazione Alert Globali [#81](https://github.com/nemocrk/my-wedding-app/issues/81)

**Branch:** `feature/81-remove-alerts-centralize-errors`  
**PR Title:** `[Frontend] Elimina alert() JS e centralizza gestione errori`

**Implementation:**
- Prerequisito: #80 mergiato (evento `api-error` globale attivo)
- Rimuovere `alert()` e `try/catch` locali ridondanti
- Sostituire alert successo → Toast success
- Sostituire alert validazione → Toast warning
- Target: `InvitationList`, `WhatsAppConfig`, `WhatsAppQueueDashboard`, `CreateInvitationModal`, `TextConfigWidget`, `LabelManager`

**Definition of Done:**
- ✅ Zero `window.alert()` nei file target
- ✅ `try/catch` eliminati dove non necessari
- ✅ Toast library integrata (es. `react-hot-toast`)
- ✅ Build container OK
- ✅ Smoke test: errore API → ErrorModal, successi → toast
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (Gestione Errori)
- ✅ Zero warning i18n

---

### Milestone 9 - Networking Layer Shared [#82](https://github.com/nemocrk/my-wedding-app/issues/82)

**Branch:** `feature/82-fetch-client-shared`  
**PR Title:** `[Frontend] Introduce fetchClient.js condiviso per servizi networking`

**Implementation:**
- Prerequisito: #80 mergiato (pattern error handling stabilizzato)
- Creare `frontend-admin/src/services/fetchClient.js`
- Esportare `fetchClient(url, options)` → `Promise<response.json()>`
- Gestire network error + HTTP >= 400 → emettere `api-error` + rilancio
- Refactorare `api.js` e `accommodationService.js` per usare `fetchClient` internamente
- Unit test per `fetchClient` (mock fetch: success, network fail, 401, 500, non-JSON)

**Definition of Done:**
- ✅ File `fetchClient.js` creato + test
- ✅ `api.js` e `accommodationService.js` refactorati (zero duplicazioni)
- ✅ API pubbliche invariate (retrocompatibilità)
- ✅ Build container OK
- ✅ Smoke test: 401/500 → evento `api-error` + listener globale attivo
- ✅ Documentazione: aggiornare `docs/04-FRONTEND.md` (Networking)
- ✅ Zero warning i18n

---

## 🔧 Linee Guida Operative

### Workflow Branch & PR
1. **Branching:** `feature/<issue-id>-<slug>` (sempre da `main`)
2. **Pre-Commit:** Eseguire `get_file_contents` prima di modificare file esistenti
3. **Commit:** Message convenzionale: `type(scope): description`
4. **PR:** Includere aggiornamenti documentazione + screenshot UI se applicabile
5. **Merge:** Descrizione completa delle modifiche + riferimento issue chiusa

### Quality Assurance
- **i18n Check:** `./i18n/scripts/scan_repo.sh` (zero warning obbligatorio)
- **Build Verification:** `docker-compose build frontend-admin` (nessun errore)
- **Smoke Test:** Testare manualmente le feature modificate
- **Unit Test:** Nuovi componenti/hook devono avere test (Vitest/RTL)

### Dipendenze tra Milestone
```
Fase 0 (parallele):
├─ M1 (useConfirm)
├─ M2 (Tooltip)
└─ M3 (Error Handling)

Fase 1:
├─ M4 (InvitationList) → dipende da M1, M2
├─ M5 (WhatsApp) → dipende da M1, M2, M3
└─ M6 (Accommodations) → dipende da M1, M2

Fase 2:
├─ M7 (Layout) → dipende da M2
├─ M8 (Alert Removal) → dipende da M3
└─ M9 (fetchClient) → dipende da M3
```

---

## 📊 Stima Temporale

- **Fase 0 (P0):** 3-6 giorni (1-2 giorni/milestone)
- **Fase 1 (P1):** 3-6 giorni (1-2 giorni/milestone)
- **Fase 2 (P2):** 5-6 giorni (1 giorno M7, 2 giorni M8, 2-3 giorni M9)

**Totale stimato:** 11-18 giorni lavorativi (sviluppatore full-time)

---

## 📚 Riferimenti

- [AI_RULES.md](../AI_RULES.md) - Regole di progetto
- [docs/04-FRONTEND.md](./04-FRONTEND.md) - Architettura frontend
- [docs/CHECKLIST_DOCUMENTATION.md](./CHECKLIST_DOCUMENTATION.md) - Struttura documentazione
