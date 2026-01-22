# Roadmap Refactoring Frontend 2026

Questo documento traccia il piano di rifacimento UX e standardizzazione tecnica del `frontend-admin`.
Obiettivo: Eliminare `window.confirm`/`alert` nativi, rimuovere attributi `title` legacy, e standardizzare il networking layer.

## Stato Avanzamento
Consultare la [lista delle Issue](https://github.com/nemocrk/my-wedding-app/issues?q=is%3Aissue+is%3Aopen+label%3Arefactor) per lo stato real-time.

## FASE 0: Fondamenta (P0)
**Obiettivo:** Predisporre gli strumenti base (Hook, Componenti, Error Handling) necessari per le migrazioni.

- [ ] **M1 - Hook `useConfirm`** (Issue #75)
  - *Context:* `frontend-admin/src/contexts/ConfirmDialogContext.jsx`
  - *DoD:* Provider implementato, Hook funzionante, Test unitari.
- [ ] **M2 - Componente `Tooltip`** (Issue #74)
  - *Context:* Estrazione da `QueueTable.jsx` -> `components/common/Tooltip.jsx`
  - *DoD:* Componente riutilizzabile con React Portal, nessun clipping.
- [ ] **M3 - Standard Error Handling** (Issue #80)
  - *Context:* `whatsappService.js` allineato a `api.js`
  - *DoD:* Evento globale `api-error` emesso su fetch fail e status >= 400.

## FASE 1: Migrazioni Core (P1)
**Obiettivo:** Applicare i nuovi pattern alle pagine critiche (Invitati, Configurazione).

- [ ] **M4 - Refactor `InvitationList`** (Issue #77)
  - *Target:* `InvitationList.jsx`
  - *Action:* `window.confirm` -> `useConfirm`, `alert` -> Toast, `title` -> `Tooltip`.
- [ ] **M5 - Refactor Moduli WhatsApp** (Issue #78)
  - *Target:* `WhatsAppConfig.jsx`, `WhatsAppQueueDashboard.jsx`
  - *Action:* UI nativa React per conferme e feedback.
- [ ] **M6 - Refactor Accommodations** (Issue #76)
  - *Target:* `AccommodationsPage.jsx`
  - *Action:* Rimozione modali native.

## FASE 2: Consolidamento (P2)
**Obiettivo:** Pulizia finale e refactoring architetturale del networking.

- [ ] **M7 - Pulizia Layout** (Issue #79)
  - *Target:* Dashboard, Header, Sidebar.
  - *Action:* Rimozione `title` residui.
- [ ] **M8 - Eliminazione Alert Globali** (Issue #81)
  - *Target:* Tutto il frontend-admin.
  - *Action:* Centralizzazione gestione errori (rimozione try/catch locali ridondanti).
- [ ] **M9 - Networking Layer Shared** (Issue #82)
  - *Target:* `api.js`, `accommodationService.js` -> `fetchClient.js`
  - *Action:* Creazione client HTTP condiviso e standardizzato.

## Linee Guida Operative
1. **Branching:** `feature/<issue-id>-<slug>`
2. **Pre-Commit:** `get_file_contents` sempre prima di modificare.
3. **QA:** Ogni PR deve passare lo script `i18n/scripts/scan_repo.sh` ed includere aggiornamenti ai docs.
