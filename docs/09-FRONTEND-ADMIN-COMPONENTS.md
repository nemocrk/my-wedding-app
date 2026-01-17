# Frontend Admin Components (Dashboard)

Questa sezione documenta l'architettura della Dashboard gestionale, sviluppata con React 19, Tailwind CSS v4 e Recharts.

## 1. Struttura Generale
La dashboard è un'applicazione "Intranet-only", accessibile solo via VPN o Tunnel SSH.
- **Routing**: Gestito da React Router.
    - `/dashboard`: KPI e Grafici.
    - `/invitations`: CRUD Inviti.
    - `/accommodations`: Gestione Camere.
    - `/config`: Prezzi e Testi.
- **Internationalization (i18n)**: Interfaccia completamente localizzata (IT/EN) per permettere l'uso da parte di wedding planner internazionali.

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
- **Visualizzazione Responsive (Switch a `lg` / 1024px)**:
    - **Desktop (`lg:block`)**: Tabella densa con tutte le colonne.
    - **Mobile/Tablet (`lg:hidden`)**: Layout a Card verticali ottimizzato per touch, mostrando solo dati critici e azioni principali.
- **Tabella Dati**: Lista paginata e filtrabile di tutti gli inviti.
- **Azioni Rapide**:
    - *Copia Link*: Genera URL pubblico con token.
    - *Edit*: Apre modale per modificare composizione nucleo familiare.
    - *Delete*: Rimozione soft/hard (dipende da backend).
    - *WhatsApp Send*: Invio diretto o bulk dei messaggi WhatsApp.
    - *Verify Contact*: Verifica validità contatto WhatsApp.
- **UX**: Feedback immediato (Toast notifications) per ogni azione.

### AccommodationsPage (`AccommodationsPage.jsx`)
Gestione logistica ospitalità.
- **Visualizzazione Gerarchica**: Struttura → Stanze → Ospiti assegnati.
- **Drag & Drop (Concettuale)**: Interfaccia per spostare ospiti tra stanze (implementata tramite dropdown/modal selection).
- **Indicatori Capacità**: Progress bar per occupazione stanze (Adulti/Bambini).

### Configuration (`Configuration.jsx`)
Pannello "Live Settings" per il Singleton `GlobalConfig`.
- **Form Gestione**: Permette di modificare prezzi e testi senza redeploy.
- **Configurazione Testi (CMS)**: Nuova sezione per modificare i contenuti dinamici dell'app ospite.

#### Widget CMS (`TextConfigWidget`)
Componente avanzato per la gestione dei `ConfigurableText`.
- **Features**:
  - Lista testi raggruppati per categoria (`home`, `cards`, `rsvp`).
  - Search bar per trovare rapidamente i testi.
  - Preview del contenuto.
  - Modale di modifica con **Rich Text Editor**.

## 3. Servizi API (`src/services/`)

### `api.js`
Client HTTP principale.
- **Interceptors**: Aggiunge automaticamente il cookie di sessione (CSRF/SessionID) per autenticazione Django.
- **Gestione Errori**: Reindirizza al login se riceve 401/403.
- **Nuovi Metodi CMS**:
  - `fetchConfigurableTexts()`
  - `getConfigurableText(key)`
  - `updateConfigurableText(key, content)`

### `accommodationService.js`
Servizio specializzato per la logistica.
- **Metodi**: `getAvailability()`, `assignRoom(guestId, roomId)`.
- **Logica Client-Side**: Spesso arricchisce i dati grezzi con calcoli di capacità residua prima di passarli ai componenti.

## 4. Componenti UI (`src/components/`)
L'interfaccia è costruita su componenti modulari stylati con Tailwind.
- **Common**: `Button`, `Input`, `Modal` (wrapper accessibili).
- **Layout**: 
    - `Sidebar`: Navigazione fissa visibile solo da **XL (1280px)** in su.
    - `Header`: Burger menu visibile fino a XL. Include **LanguageSwitcher**.
- **Analytics**: Wrapper per i grafici Recharts per garantire consistenza di colori e font.
- **Config**: 
    - `TextConfigWidget`: Widget principale CMS.
    - `ConfigurableTextEditor`: Editor WYSIWYG basato su TipTap.
- **WhatsApp**: 
    - `QueueTable`: Componente per la visualizzazione dei messaggi in coda.
    - **Responsive Layout**: Dual view con switch a **LG (1024px)**.

## 5. Design Responsive & Pattern Dual View

### Strategia Implementativa
Per garantire usabilità su tutti i dispositivi, i componenti con tabelle dense adottano il **pattern Dual View** con breakpoints asimmetrici:

1. **Layout Generale (`xl` / 1280px)**:
   - Sidebar fissa solo su schermi molto larghi per garantire spazio al contenuto principale.
   - Sotto i 1280px, la sidebar collassa in un Burger Menu nell'header.

2. **Tabelle Dati (`lg` / 1024px)**:
   - **Desktop View**: Tabella completa visibile sopra i 1024px.
   - **Mobile View**: Card verticali visibili sotto i 1024px (Tablet/Laptop piccoli).

### Componenti Responsive
- **InvitationList**: Tabella desktop + Card mobile con selezione, info ospiti e azioni rapide.
- **QueueTable (WhatsApp)**: Tabella messaggi desktop + Card mobile con anteprima testo inline (senza tooltip).

### Breakpoint Tailwind Custom
- **`lg:` (1024px)**: Soglia per switch Tabelle/Cards.
- **`xl:` (1280px)**: Soglia per switch Sidebar/Menu.

## 6. Gestione Asset Grafici

L'applicazione segue uno standard rigoroso per la gestione delle immagini e delle icone per garantire performance e manutenibilità.

### Struttura Directory
- `src/assets/icons/`: Icone UI riutilizzabili (es. `react-logo.svg`).
- `src/assets/illustrations/`: Illustrazioni complesse (es. `sad-face.svg` per messaggi di errore).
- `public/`: Asset statici serviti direttamente (es. `vite.svg`, favicon) che non richiedono bundling.

### Standard di Implementazione
1. **Icone UI**: Utilizzare preferibilmente la libreria `lucide-react` per coerenza stilistica (es. `<X />`, `<Loader />`).
2. **Import SVG**: Per file custom, importare l'URL o il componente React:
   ```javascript
   // Metodo Immagine (Preferito per illustrazioni complesse)
   import sadFaceUrl from '../../assets/illustrations/sad-face.svg';
   <img src={sadFaceUrl} alt="Error" className="w-20 h-20" />
   ```
3. **Vietato**: Non inserire SVG inline (`<svg>...</svg>`) direttamente nel codice JSX dei componenti per evitare "pollution" del codice.

## Flusso Operativo Tipico
1.  Admin accede a `/invitations`.
2.  Crea un nuovo invito "Famiglia Rossi" (Create Modal).
3.  Copia il link generato (API call `get_token`).
4.  Invia link su WhatsApp.
5.  Monitora l'apertura su `/dashboard` (Real-time analytics).
