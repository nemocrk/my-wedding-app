# Architecture Documentation - My Wedding App

## Overview
Questo progetto è un monorepo che gestisce un sistema completo per la gestione di un matrimonio. Include un'area amministrativa per gli sposi e un'area pubblica per gli invitati.

## Stack Tecnologico
- **Backend**: Django Rest Framework (DRF)
- **Frontend Admin**: React (Vite)
- **Frontend User**: React (Vite)
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose, Nginx Reverse Proxy

## Struttura del Monorepo
- `/backend`: Codice sorgente Django
- `/frontend-admin`: Dashboard per gli sposi (gestione invitati, statistiche)
- `/frontend-user`: Interfaccia pubblica per gli invitati (RSVP, dettagli evento)
- `/nginx`: Configurazione reverse proxy
- `/docs`: Documentazione di progetto

## Pattern Architetturali

### Gestione Errori Frontend (Global Error Handling)
Per garantire una UX consistente, la gestione degli errori è centralizzata sia in `frontend-admin` che in `frontend-user`.

**Flusso:**
1. **API Service**: I wrapper `api.js` intercettano errori di rete o 4xx/5xx.
2. **Event Dispatch**: L'errore viene emesso tramite un evento globale `window.dispatchEvent(new CustomEvent('api-error', ...))`.
3. **Hook**: L'hook `useApiErrorModal` ascolta questo evento a livello di `App.jsx`.
4. **UI**: Una `ErrorModal` globale viene mostrata sopra ogni contenuto, eliminando la necessità di gestire modali di errore nelle singole pagine.

### Autenticazione
- **Admin**: JWT (Access + Refresh Token)
- **User**: Session-based con Cookie httpOnly + "Codice Invito"

### Deployment
Il deployment è orchestrato tramite Docker Compose. Nginx funge da gateway unico (Port 80), smistando il traffico:
- `/api/` -> Backend Django
- `/admin/` -> Backend Django (Admin Panel)
- `/dashboard` -> Frontend Admin
- `/` -> Frontend User
