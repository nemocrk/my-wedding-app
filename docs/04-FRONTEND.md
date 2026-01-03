# Frontend Documentation

Il progetto include due applicazioni frontend distinte, entrambe basate su React 19 e Vite, ma con scopi e stack UI differenti.

## 1. Frontend User (`frontend-user/`)
L'interfaccia pubblica dedicata agli invitati.

### Tech Stack
- **Core**: React 19, Vite.
- **Animation**: `framer-motion` (Gestione transizioni, animazione busta apertura).
- **Styling**: CSS Modules / Custom SCSS.
- **State**: React Context API (Gestione stato invito e RSVP).

### Features Chiave
- **Mobile First**: Design responsivo ottimizzato per smartphone.
- **Esperienza Immersiva**: Animazione iniziale di apertura "busta" virtuale.
- **Form RSVP Dinamico**: I campi (es. Hotel, Bus) appaiono solo se l'invito lo prevede.
- **Multilingua**: Predisposizione i18n (Italiano/Inglese).

## 2. Frontend Admin (`frontend-admin/`)
La dashboard di gestione per gli sposi.

### Tech Stack
- **Core**: React 19, Vite.
- **Routing**: React Router v7.
- **UI Framework**: Tailwind CSS v4.
- **Icons**: Lucide React.
- **Charts**: Recharts (Statistiche RSVP).

### Moduli Dashboard
1.  **Overview**: KPI in tempo reale (Totale confermati, Pendenti, Richieste speciali).
2.  **Lista Inviti**: Tabella filtrabile e ricercabile di tutti gli inviti.
3.  **Dettaglio Invito**: Modifica composizione nucleo, generazione link, log accessi.
4.  **Heatmaps**: Visualizzazione grafica delle interazioni utente sugli inviti.

## Sviluppo Locale
Entrambi i frontend supportano Hot Module Replacement (HMR) tramite Docker.

```bash
# Avvio ambiente dev
docker-compose up --build

# I log mostreranno gli URL locali:
# User: http://localhost:80
# Admin: http://localhost:8080
```

## Build Process
I Dockerfile utilizzano un approccio multi-stage:
1.  **Build Stage**: Node.js compila gli asset statici (`npm run build`).
2.  **Run Stage**: I file compilati (`/dist`) vengono copiati in un container Nginx minimale (Alpine) o serviti tramite volume condiviso al Gateway principale.
