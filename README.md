# Wedding Invitation & RSVP Tracking System

## Panoramica
Applicazione web a microservizi per la gestione delle partecipazioni di matrimonio digitali.
Il sistema offre un'esperienza utente unica (apertura busta animata) e una console di amministrazione avanzata per il monitoraggio degli invitati e l'analisi comportamentale (heatmap).

## Architettura
Il progetto è strutturato come monorepo dockerizzato con i seguenti servizi:

1.  **Database (PostgreSQL):** Persistenza dati (invitati, RSVP, tracking analytics). Non esposto su internet.
2.  **Backend (Django + DRF):** API REST. Gestisce logica di business, autenticazione e raccolta dati di tracking. Accessibile solo tramite rete interna Docker.
3.  **Frontend User (React):** Esposto su **Internet**. Mostra l'invito animato. Accesso tramite query param univoco.
4.  **Frontend Admin (React):** Esposto solo su **Intranet**. Dashboard per gestione adesioni e visualizzazione Heatmap/Navigazione.
5.  **Reverse Proxy (Nginx):** Gateway di ingresso, gestisce SSL e instradamento.

## Regole di Sviluppo (STRICT)
Ogni modifica al codice **DEVE** includere:
1.  **Unit Tests:** Test isolati per la singola funzione/componente.
2.  **Smoke Tests:** Verifica base che l'applicazione si avvii e gli endpoint critici rispondano.
3.  **Non-Regression Tests:** Verifica che le nuove modifiche non rompano funzionalità esistenti.

## Prerequisiti & Ambiente di Sviluppo

Il progetto è ottimizzato per il deployment su Linux.
**Per sviluppatori Windows:**
È **obbligatorio** utilizzare **WSL 2** (Windows Subsystem for Linux).
1.  Assicurati che Docker Desktop sia configurato con il backend WSL 2.
2.  Clona ed esegui il progetto all'interno del file system di WSL (es. `~/projects/wedding-app`), NON nel file system di Windows (`/mnt/c/...`).
3.  Usa VS Code con l'estensione "WSL" per editare il codice.

## Quick Start (da terminale WSL/Bash)

```bash
# 1. Clona il repo (se non fatto)
git clone <url-repo>

# 2. Avvia i container
docker-compose up --build

# 3. Accedi
# Frontend Utente: http://localhost (via Nginx)
# Frontend Admin: http://localhost:8080 (via Intranet port forwarding)