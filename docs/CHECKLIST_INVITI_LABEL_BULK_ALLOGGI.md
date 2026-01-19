# Checklist: Evoluzione Gestione Inviti, Label, Bulk Actions e Alloggi

Questa checklist guida l'implementazione delle nuove funzionalità richieste per la gestione avanzata degli inviti e degli alloggi.

**Branch di Lavoro:** `feature/inviti-labels-bulk-alloggi`

---

## 🛡️ REGOLE AUREE (COMPLIANCE OBBLIGATORIA)
**Per garantire un'evoluzione organica del progetto, ogni step deve rispettare rigorosamente i seguenti principi:**

1. **Assessment Totale**: Prima di ogni modifica, analizzare il contesto (inclusi file nascosti, Dockerfile, Nginx). Non ignorare mai le dipendenze infrastrutturali.
2. **Evoluzione Incrementale (No-Rewriting)**: Vietato riscrivere moduli da zero. Il codice esistente va evoluto ed esteso.
3. **Documentazione Viva**: "Se il codice cambia, la documentazione cambia". Aggiornare contestualmente `docs/`, `README.md` e `API_DOCUMENTATION.md`.
4. **Protocollo Testing & Qualità**:
   - **Unit Test**: Obbligatori per ogni nuova logica (Backend & Frontend).
   - **Smoke Test**: Verifica build container post-modifica.
   - **Non-Regression**: Assicurarsi che le feature esistenti non subiscano impatti.
5. **Governance Database**: Ogni modifica allo schema richiede approvazione preventiva e piano migrazione.
6. **i18n by Design (Zero Hardcoded Strings)**: 
   - **UI Statica**: Ogni nuova label, bottone o messaggio di errore DEVE usare `i18n` (file JSON). Vietato scrivere "Salva" o "Errore" direttamente nel codice React/Django.
   - **User Data**: I dati inseriti dall'utente (es. nomi label personalizzate) devono essere trattati come stringhe raw e renderizzati in sicurezza.

---

## 1. Piano di Migrazione Database (Governance)
> **ATTENZIONE**: Modifiche allo schema dati. Richiesta approvazione prima dell'apply.

### Nuovi Modelli
- [x] Creare modello `InvitationLabel` in `backend/core/models.py`:
  - `name`: CharField (max_length=50, unique=True)
  - `color`: CharField (HEX code, default="#CCCCCC")
  - `created_at`, `updated_at`

### Modifiche `Invitation`
- [x] Aggiungere campo ManyToMany `labels` verso `InvitationLabel` (blank=True).
- [x] Aggiungere campo booleano `accommodation_pinned` (default=False, verbose_name="Blocca Assegnazione Alloggio").
  - *Scopo*: Se True, l'algoritmo di auto-assegnazione NON deve modificare l'alloggio di questo invito.

### Modifiche `Accommodation` / `Room`
- [x] Nessuna modifica strutturale prevista, ma verificare se serve campo "note" in `Accommodation`.

---

## 2. Backend (Core & API)

### Gestione Label
- [x] Implementare `InvitationLabelSerializer`.
- [x] Aggiornare `InvitationSerializer` per gestire le labels:
  - Lettura: Mostrare lista label (nested o ID list).
  - Scrittura: Permettere creazione "on-the-fly" di nuove label se non esistono (o endpoint separato, da decidere).
- [x] Creare `InvitationLabelViewSet` (CRUD per gestione colori/nomi).

### Filtri & Ordinamento (`InvitationViewSet`)
- [x] Aggiornare `InvitationViewSet` (`filterset_fields` / `ordering_fields`):
  - Filtro per `labels__name` o `labels__id`.
  - Ordinamento per `status`, `name`, `origin`.

### Bulk Actions
- [x] Creare action custom `bulk_send` su `InvitationViewSet` (o endpoint dedicato `/api/admin/invitations/bulk-send/`):
  - Input: lista di `invitation_ids`.
  - Logica: Itera gli ID e accoda i messaggi WhatsApp (usando `WhatsAppMessageQueue`).
  - *Safety*: Verificare che lo stato permetta l'invio.

### Aggiornamento Logica Auto-Assegnazione
- [x] Modificare algoritmo in `backend/core/utils.py` (o dove risiede la logica `auto_assign`):
  - Prima di svuotare le assegnazioni per ricalcolare, escludere gli inviti con `accommodation_pinned=True`.
  - Assicurarsi che le stanze occupate da inviti "pinned" siano considerate NON disponibili per gli altri.

---

## 3. Frontend Admin

### Gestione Label (UI)
- [x] Aggiungere componente "LabelManager" (o settings page) per definire colori.
- [x] Aggiornare form "Censimento Invito":
  - Campo "Labels" tipo Multi-Select con creazione dinamica (es. `react-select` Creatable).
  - **i18n**: Assicurarsi che i placeholder ("Select labels...") siano tradotti.

### Lista Inviti (Miglioramenti)
- [x] Aggiungere colonna "Labels" con badge colorati.
- [x] Implementare "Bulk Selection Mode":
  - Checkbox per riga.
  - Floating Action Bar quando ci sono elementi selezionati: bottone "Invia Messaggi" (con conferma).
- [x] Aggiungere filtri avanzati (Dropdown per Label, Stato, Origine).

### Dashboard
- [x] Aggiornare widget stati per mostrare TUTTI gli stati (`imported`, `created`, `sent`, `read`, `confirmed`, `declined`).

### Gestione Alloggi
- [x] Aggiungere form di modifica per `Accommodation` (cambio nome/indirizzo).
- [x] Nella UI di assegnazione manuale o lista inviti, aggiungere toggle/icona "Pin" per fissare l'alloggio.

---

## 4. Testing & QA

### Backend Tests
- [ ] Unit Test `InvitationLabel`: creazione e associazione.
- [ ] Unit Test `bulk_send`: verificare accodamento messaggi.
- [ ] **Regression Test Algoritmo**: Verificare che un invito "pinned" non venga spostato durante una riassegnazione massiva.

### Frontend Tests
- [ ] Smoke Test: Build frontend-admin.
- [ ] Test UX: Creazione label da form invito.
- [x] **i18n Audit**: Eseguire script di scansione per verificare assenza stringhe hardcoded.

---

## 5. Documentazione
- [x] Aggiornare `docs/06-BACKEND-CORE.md` con i nuovi modelli.
- [x] Aggiornare `docs/09-FRONTEND-ADMIN-COMPONENTS.md` con i nuovi componenti UI.
- [x] Aggiornare `API_DOCUMENTATION.md` con i nuovi endpoint.
