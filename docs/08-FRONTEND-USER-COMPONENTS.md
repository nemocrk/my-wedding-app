# Frontend User Components

Questa sezione analizza i componenti principali del frontend pubblico (`frontend-user`), focalizzandosi su struttura, interattività e integrazione API.

## 1. Struttura Applicativa
L'applicazione è una Single Page Application (SPA) costruita con React 19.
- **Entry Point**: `src/main.jsx`
- **Root Component**: `src/App.jsx`
- **Routing**: Gestito internamente (o tramite semplice conditional rendering in base allo stato).

## 2. Componenti Core (`src/components/`)

### EnvelopeAnimation (`EnvelopeAnimation.jsx`)
Il componente "Wow Effect" iniziale. Simula l'apertura fisica di una busta da lettera.
- **Tecnologia**: CSS3 Animations + React State.
- **Stati**: `closed` → `opening` → `open`.
- **Interazione**: Al click/tap, innesca la transizione che rivela il contenuto (`LetterContent`).

### LetterContent (`LetterContent.jsx`)
Il corpo principale dell'invito.
- **Visualizzazione**: Mostra il testo personalizzato ricevuto dall'API (`letter_content`).
- **Logica Condizionale**: Renderizza le sezioni RSVP, Accommodation e Transfer solo se i flag `*_offered` nel payload API sono `true`.
- **Form Gestione**: Include i controlli per accettare/declinare e specificare note/allergie.

### ErrorModal (`ErrorModal.jsx`)
Sistema centralizzato per la gestione degli errori.
- **Utilizzo**: Invocato automaticamente via `useApiErrorModal` hook quando una chiamata API fallisce.
- **UX**: Impedisce il "silenzio" degli errori, mostrando feedback chiaro all'utente (es. "Codice invito non valido").

## 3. Gestione Stato & Hooks (`src/hooks/`)

### `useApiErrorModal.js`
Custom hook per intercettare errori API e pilotare il modale.
- **Pattern**: Wrappa le chiamate `fetch` o intercetta le promise rejection.
- **Vantaggio**: Decoppia la logica di errore dai componenti UI.

## 4. Servizi API (`src/services/`)

### `api.js`
Client HTTP tipizzato (wrapper su `fetch`).
- **Config**: Legge `REACT_APP_API_URL` da `.env`.
- **Endpoints**:
    - `getInvitation(code)`: Recupera i dati iniziali.
    - `submitRSVP(code, data)`: Invia le conferme (con gestione token).

### `analytics.js`
Modulo per il tracking granulare.
- **Funzioni**: `trackVisit`, `trackClick`, `trackMouse`.
- **Debounce**: Implementa logica per non inondare il backend di eventi mousemove (invio a batch o throttled).

## 5. Gestione Asset Grafici

L'applicazione segue uno standard rigoroso per la gestione delle immagini e delle icone per garantire performance e manutenibilità.

### Struttura Directory
- `src/assets/icons/`: Icone UI riutilizzabili (es. `react-logo.svg`, `x.svg`, `chevron-down.svg`).
- `src/assets/illustrations/`: Illustrazioni complesse (es. `sad-face.svg` per messaggi di errore).
- `public/`: Asset statici serviti direttamente (es. `vite.svg`, favicon) che non richiedono bundling.

### Standard di Implementazione
1. **Icone UI**: Utilizzare `lucide-react` per la maggior parte delle icone (es. `<X />`, `<ChevronDown />`).
2. **Import SVG**: Per file custom, importare l'URL o il componente React:
   ```javascript
   // Metodo Immagine (Preferito per illustrazioni complesse)
   import sadFaceUrl from '../../assets/illustrations/sad-face.svg';
   <img src={sadFaceUrl} alt="Sad Face" className="w-20 h-20" />
   ```
3. **Vietato**: Non inserire SVG inline (`<svg>...</svg>`) direttamente nel codice JSX dei componenti.

## 6. Pagine (`src/pages/`)

### `InvitationPage.jsx`
Il contenitore logico principale.
1.  Estrae il `code` dall'URL (slug).
2.  Chiama `api.getInvitation(code)`.
3.  Gestisce gli stati di caricamento (`LoadingScreen`) ed errore (`ErrorScreen`).
4.  Se successo, monta `EnvelopeAnimation` passando i dati ricevuti.

## Diagramma Flusso UI

```mermaid
graph TD
    Start((Apertura Link)) --> Fetch{Fetch API}
    Fetch -->|Success| Envelope[Mostra Busta Chiusa]
    Fetch -->|Loading| Spinner[Loading Screen]
    Fetch -->|Error| ErrPage[Error Screen]

    Envelope -->|Click Utente| Open[Animazione Apertura]
    Open --> Letter[Mostra Lettera]
    
    Letter -->|Compila RSVP| Submit{Invia Dati}
    Submit -->|Success| Thanks[Messaggio Ringraziamento]
    Submit -->|Error| ErrModal[Modale Errore]
```