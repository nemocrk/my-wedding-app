# AI Rules & Project Guidelines for "My-Wedding-App"

## 0. Regola Suprema: Documentazione Viva
**"Se il codice cambia, la documentazione DEVE cambiare."**
Ogni Pull Request o modifica significativa deve essere accompagnata dall'aggiornamento dei relativi file in `/docs`.
- Consultare `docs/CHECKLIST_DOCUMENTATION.md` per la struttura.

## 1. Architettura & Infrastruttura (Vedi `docs/01-ARCHITECTURE.md`)
- **Docker Compose Orchestration**: Ogni servizio (db, backend, frontend-user, frontend-admin, nginx) gira in container isolati.
- **Isolamento DB**: Il database `wedding_db` è accessibile SOLO dalla rete interna `db_network`.
- **Backend API**: Django/Gunicorn su porta 8000 interna.
- **Frontend User/Admin**: React Apps servite da Nginx dedicati (Public/Intranet).

## 2. Environment Variables (Vedi `docs/05-DEVOPS.md`)
Le variabili d'ambiente critiche sono definite in `.env`.
- Backend: `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`.
- Frontend: `REACT_APP_API_URL` (User vs Admin).

## 3. Workflow di Sviluppo (Strict)
0.  **Branch Strategy**: Prima di iniziare ogni azione, verifica ce esiste un branch dedicato all'attività ed utilizza quello. Qualora non vi fosse, creane uno nuovo ad HOC.
1.  **Analisi**: Prima di modificare, leggere il codice esistente E la documentazione specifica (es. `docs/06-BACKEND-CORE.md`).
2.  **No-Rewrite**: Non riscrivere file da zero se non strettamente necessario. Applicare patch/diff.
3.  **Testing**: Ogni feature deve essere verificata (es. `curl`, unit test, smoke test).
4.  **Sicurezza**: Mai esporre il DB su Internet. Validare sempre gli input API.
5.  **Aggiornamento**: Prima di aggiungere nuove dipendenze, assicurati sui vari package manager (es. NPMjs, ...) che stai utilizzando l'ultima versione stabile del componente. Assicurati inoltre che questa versione sia compatibile con quanto già presente.

## 4. Regole di Gestione delle Pull Request
1.  **Docs Update**: Prima di proporre o mergiare una pull request aggiorna tutta la documentazione impattata.
2.  **Merge Description**: Crea un messaggio chiaro di tutte le modifiche sia in fase di creazione della pull request che in fase di Merge.

## 5. Struttura URL & Routing (Vedi `docs/03-BACKEND.md`)
- `/api/public/`: API pubbliche (User).
- `/api/admin/`: API protette (Admin).
- `/dashboard`: Frontend Admin.

## 6. Log delle Modifiche Recenti
- Documentazione completa del repository in `/docs`.
- Aggiornamento regole AI per enforcing documentation update.
- Aggiunta regole per gestione dipendenze e Pull Request.
