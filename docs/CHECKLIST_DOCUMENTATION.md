# Checklist per Documentazione Iterativa

Questa checklist serve a guidare la creazione completa della documentazione per il repository "My-Wedding-App". L'obiettivo è coprire ogni singola cartella e componente, garantendo che ogni aspetto tecnico sia tracciato e comprensibile.

## Fase 1: Core System (Completato ✅)
Documentazione di alto livello già realizzata.
- [x] **01-ARCHITECTURE.md**: Overview sistema, Docker networks, servizi.
- [x] **02-DATABASE.md**: ERD, descrizione modelli, logica dati.
- [x] **03-BACKEND.md**: Struttura Django, API endpoints principali.
- [x] **04-FRONTEND.md**: Stack tecnologico Frontend User e Admin.

## Fase 2: DevOps & Configurazione (Completato ✅)
Documentare l'infrastruttura CI/CD, regole AI e configurazione server.
- [x] **05-DEVOPS.md**:
    - Dettaglio `.github/copilot-instructions.md` (Regole per l'AI).
    - Analisi `.continue` (se presente configurazione specifica).
    - Configurazione Nginx dettagliata (differenze `public.conf` vs `intranet.conf`).
    - Spiegazione `docker-compose.yml` (Healthchecks, Volumes).

## Fase 3: Backend Deep Dive (In Corso 🚧)
Approfondimento del codice sorgente Python/Django.
- [ ] **06-BACKEND-CORE.md**:
    - Analisi `backend/core/models.py` (Logica custom metodo `save`, segnali).
    - Analisi `backend/core/admin.py` (Customizzazioni pannello admin).
- [ ] **07-BACKEND-API.md**:
    - Dettaglio `backend/api/serializers.py` (Validazione dati).
    - Dettaglio `backend/api/views` (Logica ViewSets, Permissions).
    - Autenticazione custom (HMAC, Session).

## Fase 4: Frontend User (Dettaglio Componenti)
Documentazione specifica per l'app React pubblica.
- [ ] **08-FRONTEND-USER-COMPONENTS.md**:
    - Struttura `src/components` (Envelope, RSVPForm).
    - Gestione Stato (`src/hooks` o Context).
    - Routing e Pagine (`src/pages`).
    - Integrazione API (`src/services`).
    - Stili e Animazioni (`App.css`, framer-motion).

## Fase 5: Frontend Admin (Dettaglio Dashboard)
Documentazione specifica per l'app gestionale.
- [ ] **09-FRONTEND-ADMIN-COMPONENTS.md**:
    - Struttura `src/components` (Tables, Charts).
    - Logica Auth (Login, Protezione Rotte).
    - Integrazione Recharts (Configurazione grafici).
    - Gestione CRUD Inviti.

## Istruzioni per l'Esecuzione
1.  **Analisi Preliminare**: Prima di creare ogni file, eseguire `ls -R` o leggere i file chiave della cartella target.
2.  **Formato**: Usare Markdown standard con blocchi di codice per esempi.
3.  **Naming**: Seguire la numerazione progressiva `XX-NOME.md`.
4.  **Commit**: Ogni file deve essere committato singolarmente o raggruppato per fase logica.
