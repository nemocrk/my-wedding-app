# Frontend Admin Components (Dashboard)

Questa sezione documenta l'architettura della Dashboard gestionale, sviluppata con React 19, Tailwind CSS v4 e Recharts.

## 1. Struttura Generale
La dashboard è un'applicazione "Intranet-only", accessibile solo via VPN o Tunnel SSH.
- **Routing**: Gestito da React Router.
    - `/dashboard`: KPI e Grafici.
    - `/invitations`: CRUD Inviti.
    - `/accommodations`: Gestione Camere.
    - `/config`: Prezzi e Testi.

## 2. Pagine Principali (`src/pages/`)

### Dashboard (`Dashboard.jsx`)
Il centro di controllo. Visualizza:
- **KPI Cards**: Totale confermati, Budget stimato, Camere occupate.
- **Grafici**:
    - *RSVP Status* (PieChart): Distribuzione conferme/rifiuti.
    - *Dietary Requirements* (BarChart): Istogramma allergie.
- **Logica**: Utilizza `recharts` per la visualizzazione e chiamate API aggregate per le statistiche.

### InvitationList (`InvitationList.jsx`)
Il cuore operativo.
- **Tabella Dati**: Lista paginata e filtrabile di tutti gli inviti.
- **Azioni Rapide**:
    - *Copia Link*: Genera URL pubblico con token.
    - *Edit*: Apre modale per modificare composizione nucleo familiare.
    - *Delete*: Rimozione soft/hard (dipende da backend).
- **UX**: Feedback immediato (Toast notifications) per ogni azione.

### AccommodationsPage (`AccommodationsPage.jsx`)
Gestione logistica ospitalità.
- **Visualizzazione Gerarchica**: Struttura → Stanze → Ospiti assegnati.
- **Drag & Drop (Concettuale)**: Interfaccia per spostare ospiti tra stanze (implementata tramite dropdown/modal selection).
- **Indicatori Capacità**: Progress bar per occupazione stanze (Adulti/Bambini).

### Configuration (`Configuration.jsx`)
Pannello "Live Settings" per il Singleton `GlobalConfig`.
- **Form Gestione**: Permette di modificare prezzi e testi senza redeploy.
- **Anteprima Lettera**: Renderizza in tempo reale il template della lettera di benvenuto.

## 3. Servizi API (`src/services/`)

### `api.js`
Client HTTP principale.
- **Interceptors**: Aggiunge automaticamente il cookie di sessione (CSRF/SessionID) per autenticazione Django.
- **Gestione Errori**: Reindirizza al login se riceve 401/403.

### `accommodationService.js`
Servizio specializzato per la logistica.
- **Metodi**: `getAvailability()`, `assignRoom(guestId, roomId)`.
- **Logica Client-Side**: Spesso arricchisce i dati grezzi con calcoli di capacità residua prima di passarli ai componenti.

## 4. Componenti UI (`src/components/`)
L'interfaccia è costruita su componenti modulari stylati con Tailwind.
- **Common**: `Button`, `Input`, `Modal` (wrapper accessibili).
- **Layout**: `Sidebar`, `TopBar` (struttura persistente).
- **Analytics**: Wrapper per i grafici Recharts per garantire consistenza di colori e font.

## Flusso Operativo Tipico
1.  Admin accede a `/invitations`.
2.  Crea un nuovo invito "Famiglia Rossi" (Create Modal).
3.  Copia il link generato (API call `get_token`).
4.  Invia link su WhatsApp.
5.  Monitora l'apertura su `/dashboard` (Real-time analytics).
